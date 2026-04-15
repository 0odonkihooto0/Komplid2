"""
POST /parse — парсинг IFC-файла из S3.

Извлекает все IfcElement с PropertySets, уровнями, слоями.
Возвращает JSON с метаданными и списком элементов.
"""

import logging
import shutil
import tempfile

import ifcopenshell
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ifc_helpers import extract_element_data, open_ifc_safe
from utils.s3 import download_file

logger = logging.getLogger(__name__)

router = APIRouter()


class ParseRequest(BaseModel):
    s3Key: str
    modelId: str


class ParseResponse(BaseModel):
    ifcVersion: str
    elementCount: int
    metadata: dict
    elements: list[dict]


@router.post("/parse", response_model=ParseResponse)
def parse_ifc(request: ParseRequest) -> ParseResponse:
    """
    Скачивает IFC из S3, извлекает все элементы с PropertySets.

    Шаги:
    1. Скачать IFC из S3 во временную директорию
    2. Открыть через ifcopenshell.open()
    3. Извлечь все IfcElement: GlobalId, Name, layer, level, PropertySets
    4. Извлечь метаданные из IfcProject
    5. Вернуть JSON

    Raises:
        422: невалидный IFC-файл
        503: S3 недоступен
    """
    logger.info("Начинаю парсинг IFC: s3Key=%s, modelId=%s", request.s3Key, request.modelId)
    tmpdir = tempfile.mkdtemp()

    try:
        # 1. Скачать из S3
        local_path = download_file(request.s3Key, tmpdir)

        # 2. Открыть IFC
        try:
            ifc = open_ifc_safe(str(local_path))
        except ValueError as e:
            logger.error("Невалидный IFC-файл %s: %s", request.s3Key, e)
            raise HTTPException(status_code=422, detail=str(e))

        # 3. Метаданные из IfcProject
        metadata = _extract_metadata(ifc)

        # 4. Извлечь все IfcElement (включает стены, перекрытия, колонны и т.д.)
        elements = []
        for element in ifc.by_type("IfcElement"):
            try:
                data = extract_element_data(ifc, element)
                elements.append(data)
            except Exception as e:
                logger.debug("Пропускаю элемент %s: %s", getattr(element, "GlobalId", "?"), e)

        logger.info(
            "Парсинг завершён: modelId=%s, элементов=%d, IFC=%s",
            request.modelId, len(elements), ifc.schema,
        )

        return ParseResponse(
            ifcVersion=ifc.schema or "IFC4",
            elementCount=len(elements),
            metadata=metadata,
            elements=elements,
        )

    finally:
        # Обязательная очистка временных файлов
        shutil.rmtree(tmpdir, ignore_errors=True)


def _extract_metadata(ifc: ifcopenshell.file) -> dict:
    """Извлекает метаданные из IfcProject."""
    metadata: dict = {}
    try:
        projects = ifc.by_type("IfcProject")
        if projects:
            project = projects[0]
            metadata["projectName"] = getattr(project, "Name", None)
            metadata["projectDescription"] = getattr(project, "Description", None)
            metadata["projectPhase"] = getattr(project, "Phase", None)

        # Автор из IfcOwnerHistory
        histories = ifc.by_type("IfcOwnerHistory")
        if histories:
            history = histories[0]
            if hasattr(history, "OwningUser") and history.OwningUser:
                person = getattr(history.OwningUser, "ThePerson", None)
                if person:
                    given = getattr(person, "GivenName", "") or ""
                    family = getattr(person, "FamilyName", "") or ""
                    metadata["author"] = f"{given} {family}".strip() or None

            if hasattr(history, "OwningApplication") and history.OwningApplication:
                app = history.OwningApplication
                metadata["applicationName"] = getattr(app, "ApplicationFullName", None)

    except Exception as e:
        logger.debug("Не удалось извлечь метаданные: %s", e)

    return metadata
