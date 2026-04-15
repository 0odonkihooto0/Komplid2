"""
POST /properties — полные PropertySets конкретного IFC-элемента по GUID.

Скачивает IFC из S3, находит элемент по GlobalId,
извлекает все Pset_* через IfcRelDefinesByProperties.
"""

import logging
import shutil
import tempfile

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ifc_helpers import get_property_sets, open_ifc_safe
from utils.s3 import download_file

logger = logging.getLogger(__name__)

router = APIRouter()


class PropertiesRequest(BaseModel):
    s3Key: str
    ifcGuid: str


class PropertiesResponse(BaseModel):
    ifcGuid: str
    ifcType: str
    name: str | None
    propertySets: dict


@router.post("/properties", response_model=PropertiesResponse)
def get_element_properties(request: PropertiesRequest) -> PropertiesResponse:
    """
    Возвращает полные PropertySets элемента по его GlobalId.

    Шаги:
    1. Скачать IFC из S3
    2. Найти элемент через ifc.by_guid(guid)
    3. Извлечь все Pset_* через IfcRelDefinesByProperties
    4. Вернуть полный словарь свойств

    Raises:
        404: элемент с указанным GUID не найден
        422: невалидный IFC
        503: S3 недоступен
    """
    logger.info("Запрос PropertySets: s3Key=%s, guid=%s", request.s3Key, request.ifcGuid)
    tmpdir = tempfile.mkdtemp()

    try:
        # 1. Скачать IFC
        local_path = download_file(request.s3Key, tmpdir)

        # 2. Открыть IFC
        try:
            ifc = open_ifc_safe(str(local_path))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # 3. Найти элемент по GlobalId
        try:
            element = ifc.by_guid(request.ifcGuid)
        except Exception:
            element = None

        if element is None:
            raise HTTPException(
                status_code=404,
                detail=f"Элемент с GUID '{request.ifcGuid}' не найден в модели",
            )

        # 4. Извлечь PropertySets
        property_sets = get_property_sets(ifc, element)

        logger.info(
            "PropertySets получены: guid=%s, psets=%d",
            request.ifcGuid, len(property_sets),
        )

        return PropertiesResponse(
            ifcGuid=request.ifcGuid,
            ifcType=element.is_a(),
            name=getattr(element, "Name", None),
            propertySets=property_sets,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка получения PropertySets для %s: %s", request.ifcGuid, e)
        raise HTTPException(status_code=422, detail=f"Ошибка обработки IFC: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
