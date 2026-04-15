"""
POST /clash — обнаружение коллизий между двумя IFC-моделями.

Использует ifcopenshell.util.ifcclash (IfcOpenShell 0.8+).
При недоступности API — fallback на AABB-тест через ifcopenshell.geom.
"""

import logging
import shutil
import tempfile
from typing import Any

import ifcopenshell
import ifcopenshell.geom
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ifc_helpers import open_ifc_safe
from utils.s3 import download_file

logger = logging.getLogger(__name__)

router = APIRouter()


class ClashRequest(BaseModel):
    s3KeyA: str
    s3KeyB: str
    tolerance: float = 0.01
    checkDuplicates: bool = False
    excludedTypes: list[str] = []


class ClashItem(BaseModel):
    elementAGuid: str
    elementAName: str | None
    elementBGuid: str
    elementBName: str | None
    clashPoint: list[float] | None
    type: str  # "intersection" | "duplicate"


@router.post("/clash", response_model=list[ClashItem])
def detect_clashes(request: ClashRequest) -> list[ClashItem]:
    """
    Обнаруживает коллизии между двумя IFC-файлами.

    Шаги:
    1. Скачать оба IFC из S3
    2. Попытаться использовать ifcopenshell.util.ifcclash
    3. Fallback: AABB-тест через ifcopenshell.geom

    Raises:
        503: S3 недоступен
        422: невалидный IFC
    """
    logger.info(
        "Обнаружение коллизий: A=%s, B=%s, tolerance=%.4f",
        request.s3KeyA, request.s3KeyB, request.tolerance,
    )
    tmpdir = tempfile.mkdtemp()

    try:
        # 1. Скачать оба файла
        path_a = download_file(request.s3KeyA, tmpdir)
        path_b = download_file(request.s3KeyB, tmpdir)

        # 2. Открыть IFC
        try:
            ifc_a = open_ifc_safe(str(path_a))
            ifc_b = open_ifc_safe(str(path_b))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # 3. Режим: дубликаты или коллизии
        excluded = set(request.excludedTypes)

        if request.checkDuplicates:
            # Дубликаты: AABB-сравнение по центру и объёму (без ifcclash)
            logger.info("Режим поиска дубликатов, excluded=%s", excluded)
            clashes = _detect_via_aabb_duplicates(ifc_a, ifc_b, request.tolerance, excluded)
        else:
            # Попытка через ifcclash API
            clashes = _detect_via_ifcclash(
                str(path_a), str(path_b), request.tolerance, excluded, ifc_a, ifc_b
            )
            if clashes is None:
                # Fallback: AABB-тест
                logger.info("ifcclash API недоступен, использую AABB-fallback")
                clashes = _detect_via_aabb(ifc_a, ifc_b, request.tolerance, excluded)

        logger.info("Найдено коллизий: %d", len(clashes))
        return clashes

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка обнаружения коллизий: %s", e)
        raise HTTPException(status_code=422, detail=f"Ошибка обнаружения коллизий: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _detect_via_ifcclash(
    path_a: str,
    path_b: str,
    tolerance: float,
    excluded: set[str],
    ifc_a: ifcopenshell.file,
    ifc_b: ifcopenshell.file,
) -> list[ClashItem] | None:
    """
    Попытка использовать ifcopenshell.util.ifcclash.
    Возвращает None если модуль недоступен в данной версии IfcOpenShell.
    Элементы типов из excluded отфильтровываются из результатов.
    """
    try:
        from ifcopenshell.util import ifcclash as ifcclash_module

        detector = ifcclash_module.ClashDetector()
        detector.settings.tolerance = tolerance

        # Добавляем файлы как «группы столкновений»
        clashset_a = {"file": path_a, "mode": "a", "elements": None}
        clashset_b = {"file": path_b, "mode": "b", "elements": None}
        detector.clash_sets = [{"a": [clashset_a], "b": [clashset_b]}]

        detector.execute()
        results = detector.export()

        # Строим маппинг GUID → тип для фильтрации по excludedTypes
        guid_to_type_a: dict[str, str] = {}
        guid_to_type_b: dict[str, str] = {}
        if excluded:
            for el in ifc_a.by_type("IfcElement"):
                guid_to_type_a[el.GlobalId] = el.is_a()
            for el in ifc_b.by_type("IfcElement"):
                guid_to_type_b[el.GlobalId] = el.is_a()

        items: list[ClashItem] = []
        for clash in (results or []):
            guid_a = clash.get("a_global_id", "")
            guid_b = clash.get("b_global_id", "")
            # Пропускаем, если один из элементов относится к исключённому типу
            if excluded:
                type_a = guid_to_type_a.get(guid_a, "")
                type_b = guid_to_type_b.get(guid_b, "")
                if type_a in excluded or type_b in excluded:
                    continue
            items.append(ClashItem(
                elementAGuid=guid_a,
                elementAName=clash.get("a_name"),
                elementBGuid=guid_b,
                elementBName=clash.get("b_name"),
                clashPoint=clash.get("position"),
                type="intersection",
            ))
        return items

    except (ImportError, AttributeError):
        return None
    except Exception as e:
        logger.warning("ifcclash API завершился с ошибкой (%s), перехожу на AABB", e)
        return None


def _detect_via_aabb(
    ifc_a: ifcopenshell.file,
    ifc_b: ifcopenshell.file,
    tolerance: float,
    excluded: set[str] = set(),
) -> list[ClashItem]:
    """
    Fallback: обнаружение коллизий через AABB (Axis-Aligned Bounding Box) тест.
    Строит ограничивающие прямоугольники через ifcopenshell.geom и проверяет пересечения.
    """
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)

    # Извлекаем AABB для всех элементов из файлов A и B
    boxes_a = _compute_aabb_for_file(ifc_a, settings, excluded)
    boxes_b = _compute_aabb_for_file(ifc_b, settings, excluded)

    clashes: list[ClashItem] = []

    for elem_a, box_a in boxes_a:
        for elem_b, box_b in boxes_b:
            if _aabb_intersects(box_a, box_b, tolerance):
                # Вычисляем точку пересечения как центр перекрытия
                clash_point = _aabb_intersection_center(box_a, box_b)
                clashes.append(ClashItem(
                    elementAGuid=elem_a.GlobalId,
                    elementAName=getattr(elem_a, "Name", None),
                    elementBGuid=elem_b.GlobalId,
                    elementBName=getattr(elem_b, "Name", None),
                    clashPoint=clash_point,
                    type="intersection",
                ))

    return clashes


def _detect_via_aabb_duplicates(
    ifc_a: ifcopenshell.file,
    ifc_b: ifcopenshell.file,
    tolerance: float,
    excluded: set[str] = set(),
) -> list[ClashItem]:
    """
    Обнаружение дубликатов геометрии через AABB.

    Элемент считается дубликатом если:
    - Расстояние между центрами AABB < max(tolerance, 0.01)
    - Соотношение объёмов min/max >= 0.9

    Соответствует клиентской логике Three.js Box3 из браузера.
    """
    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)

    boxes_a = _compute_aabb_for_file(ifc_a, settings, excluded)
    boxes_b = _compute_aabb_for_file(ifc_b, settings, excluded)

    duplicates: list[ClashItem] = []
    tol = max(tolerance, 0.01)

    for elem_a, box_a in boxes_a:
        min_a, max_a = box_a
        center_a = [(min_a[i] + max_a[i]) / 2.0 for i in range(3)]
        size_a = [max_a[i] - min_a[i] for i in range(3)]
        volume_a = size_a[0] * size_a[1] * size_a[2]

        for elem_b, box_b in boxes_b:
            min_b, max_b = box_b
            center_b = [(min_b[i] + max_b[i]) / 2.0 for i in range(3)]
            size_b = [max_b[i] - min_b[i] for i in range(3)]
            volume_b = size_b[0] * size_b[1] * size_b[2]

            # Евклидово расстояние между центрами
            dist = (
                (center_a[0] - center_b[0]) ** 2
                + (center_a[1] - center_b[1]) ** 2
                + (center_a[2] - center_b[2]) ** 2
            ) ** 0.5

            if dist > tol:
                continue

            # Проверяем соотношение объёмов
            if volume_a <= 0 or volume_b <= 0:
                continue
            volume_ratio = min(volume_a, volume_b) / max(volume_a, volume_b)
            if volume_ratio < 0.9:
                continue

            # Дубликат: точка = центр элемента A
            duplicates.append(ClashItem(
                elementAGuid=elem_a.GlobalId,
                elementAName=getattr(elem_a, "Name", None),
                elementBGuid=elem_b.GlobalId,
                elementBName=getattr(elem_b, "Name", None),
                clashPoint=center_a,
                type="duplicate",
            ))

    return duplicates


def _compute_aabb_for_file(
    ifc: ifcopenshell.file,
    settings: Any,
    excluded: set[str] = set(),
) -> list[tuple[Any, tuple[list[float], list[float]]]]:
    """Вычисляет AABB для каждого IfcElement в файле. Пропускает типы из excluded."""
    result = []
    for element in ifc.by_type("IfcElement"):
        # Пропускаем исключённые типы (например IfcOpeningElement, IfcSpace)
        if excluded and element.is_a() in excluded:
            continue
        try:
            shape = ifcopenshell.geom.create_shape(settings, element)
            verts = shape.geometry.verts
            if not verts:
                continue
            xs = verts[0::3]
            ys = verts[1::3]
            zs = verts[2::3]
            box = ([min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)])
            result.append((element, box))
        except Exception:
            continue
    return result


def _aabb_intersects(
    box_a: tuple[list[float], list[float]],
    box_b: tuple[list[float], list[float]],
    tolerance: float,
) -> bool:
    """Проверяет пересечение двух AABB с учётом допуска."""
    min_a, max_a = box_a
    min_b, max_b = box_b
    for i in range(3):
        if max_a[i] + tolerance < min_b[i] or max_b[i] + tolerance < min_a[i]:
            return False
    return True


def _aabb_intersection_center(
    box_a: tuple[list[float], list[float]],
    box_b: tuple[list[float], list[float]],
) -> list[float]:
    """Возвращает центр перекрытия двух AABB."""
    min_a, max_a = box_a
    min_b, max_b = box_b
    center = []
    for i in range(3):
        overlap_min = max(min_a[i], min_b[i])
        overlap_max = min(max_a[i], max_b[i])
        center.append((overlap_min + overlap_max) / 2.0)
    return center
