"""
POST /diff — сравнение двух версий IFC.

Использует ifcopenshell.ifcdiff (IfcOpenShell 0.8+).
При недоступности — fallback на ручное сравнение по GlobalId.
"""

import logging
import shutil
import tempfile

import ifcopenshell
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ifc_helpers import open_ifc_safe
from utils.s3 import download_file

logger = logging.getLogger(__name__)

router = APIRouter()


class DiffRequest(BaseModel):
    s3KeyOld: str
    s3KeyNew: str


class ChangedElement(BaseModel):
    guid: str
    changedAttributes: list[str]


class DiffResponse(BaseModel):
    added: list[str]
    deleted: list[str]
    changed: list[ChangedElement]
    geometryChanged: list[str]


@router.post("/diff", response_model=DiffResponse)
def diff_ifc(request: DiffRequest) -> DiffResponse:
    """
    Сравнивает две версии IFC-файла и возвращает diff.

    Шаги:
    1. Скачать оба файла из S3
    2. Попытаться использовать ifcopenshell.ifcdiff.Diff
    3. Fallback: ручное сравнение по GlobalId

    Returns:
        added: список GUID новых элементов
        deleted: список GUID удалённых элементов
        changed: список { guid, changedAttributes } изменённых элементов
        geometryChanged: список GUID элементов с изменённой геометрией

    Raises:
        503: S3 недоступен
        422: невалидный IFC
    """
    logger.info("Сравнение версий IFC: old=%s, new=%s", request.s3KeyOld, request.s3KeyNew)
    tmpdir = tempfile.mkdtemp()

    try:
        # 1. Скачать файлы
        path_old = download_file(request.s3KeyOld, tmpdir)
        path_new = download_file(request.s3KeyNew, tmpdir)

        # 2. Открыть IFC
        try:
            ifc_old = open_ifc_safe(str(path_old))
            ifc_new = open_ifc_safe(str(path_new))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # 3. Попытка через ifcdiff API
        result = _diff_via_ifcdiff(ifc_old, ifc_new)
        if result is None:
            logger.info("ifcdiff API недоступен, использую ручное сравнение")
            result = _diff_manual(ifc_old, ifc_new)

        logger.info(
            "Diff завершён: added=%d, deleted=%d, changed=%d, geomChanged=%d",
            len(result.added), len(result.deleted),
            len(result.changed), len(result.geometryChanged),
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка сравнения IFC: %s", e)
        raise HTTPException(status_code=422, detail=f"Ошибка сравнения IFC: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _diff_via_ifcdiff(
    ifc_old: ifcopenshell.file,
    ifc_new: ifcopenshell.file,
) -> DiffResponse | None:
    """
    Попытка использовать ifcopenshell.ifcdiff.Diff.
    Возвращает None если модуль недоступен.
    """
    try:
        import ifcopenshell.ifcdiff as ifcdiff_module

        diff = ifcdiff_module.Diff(ifc_old, ifc_new, change_filters=[])
        diff.diff()

        added = list(diff.added or [])
        deleted = list(diff.deleted or [])

        changed_items = []
        for guid, attrs in (diff.changed or {}).items():
            changed_items.append(ChangedElement(
                guid=guid,
                changedAttributes=list(attrs) if attrs else [],
            ))

        geometry_changed = list(diff.geometry_changed or [])

        return DiffResponse(
            added=added,
            deleted=deleted,
            changed=changed_items,
            geometryChanged=geometry_changed,
        )

    except (ImportError, AttributeError):
        return None
    except Exception as e:
        logger.warning("ifcdiff API завершился с ошибкой (%s), перехожу на ручное сравнение", e)
        return None


def _diff_manual(
    ifc_old: ifcopenshell.file,
    ifc_new: ifcopenshell.file,
) -> DiffResponse:
    """
    Fallback: ручное сравнение двух IFC по GlobalId и ключевым атрибутам.
    Сравниваем Name, Description, ObjectType для определения «изменённых».
    Геометрические изменения определяем по Representation (упрощённо).
    """
    COMPARED_ATTRS = ["Name", "Description", "ObjectType", "PredefinedType"]

    # Индексы элементов по GlobalId
    old_elements: dict[str, object] = {
        e.GlobalId: e
        for e in ifc_old.by_type("IfcElement")
    }
    new_elements: dict[str, object] = {
        e.GlobalId: e
        for e in ifc_new.by_type("IfcElement")
    }

    old_guids = set(old_elements.keys())
    new_guids = set(new_elements.keys())

    added = list(new_guids - old_guids)
    deleted = list(old_guids - new_guids)

    changed: list[ChangedElement] = []
    geometry_changed: list[str] = []

    for guid in old_guids & new_guids:
        old_el = old_elements[guid]
        new_el = new_elements[guid]

        # Проверяем изменения атрибутов
        changed_attrs = []
        for attr in COMPARED_ATTRS:
            old_val = getattr(old_el, attr, None)
            new_val = getattr(new_el, attr, None)
            if old_val != new_val:
                changed_attrs.append(attr)

        if changed_attrs:
            changed.append(ChangedElement(guid=guid, changedAttributes=changed_attrs))

        # Упрощённая проверка геометрии: сравниваем строковое представление Representation
        old_repr = str(getattr(old_el, "Representation", None))
        new_repr = str(getattr(new_el, "Representation", None))
        if old_repr != new_repr:
            geometry_changed.append(guid)

    return DiffResponse(
        added=added,
        deleted=deleted,
        changed=changed,
        geometryChanged=geometry_changed,
    )
