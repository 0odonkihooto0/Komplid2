"""
POST /csv — экспорт элементов IFC-модели в CSV через ifccsv.

Скачивает IFC из S3, фильтрует элементы по типу (IfcWall, IfcSlab и т.д.),
экспортирует атрибуты в CSV, загружает результат обратно в S3.
"""

import csv
import logging
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.ifc_helpers import open_ifc_safe
from utils.s3 import download_file, upload_file

logger = logging.getLogger(__name__)

router = APIRouter()

# Атрибуты элементов для экспорта
DEFAULT_ATTRIBUTES = ["GlobalId", "Name", "Description", "ObjectType", "Tag"]


class CsvExportRequest(BaseModel):
    s3Key: str
    query: str = "IfcProduct"
    outputFormat: str = "csv"


class CsvExportResponse(BaseModel):
    s3Key: str
    elementCount: int


def _export_csv_manual(
    ifc_file: object,
    elements: list,
    output_path: str,
    attributes: list[str],
) -> None:
    """Fallback: ручной экспорт CSV через csv.DictWriter (без ifccsv)."""
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["IfcType"] + attributes)
        writer.writeheader()
        for el in elements:
            row: dict[str, object] = {"IfcType": el.is_a()}
            for attr in attributes:
                val = getattr(el, attr, None)
                row[attr] = str(val) if val is not None else ""
            writer.writerow(row)


@router.post("", response_model=CsvExportResponse)
def export_csv(request: CsvExportRequest) -> CsvExportResponse:
    """
    Экспорт элементов IFC-модели в CSV.

    Шаги:
    1. Скачать IFC из S3
    2. Отфильтровать элементы по типу (query)
    3. Экспортировать атрибуты в CSV через ifccsv (с fallback)
    4. Загрузить CSV в S3
    5. Вернуть s3Key результата

    Raises:
        404: файл не найден в S3
        422: невалидный IFC или ошибка экспорта
        503: S3 недоступен
    """
    ifc_type = request.query.lstrip(".")
    logger.info("CSV export: s3Key=%s, type=%s", request.s3Key, ifc_type)

    tmpdir = tempfile.mkdtemp()
    try:
        # 1. Скачать IFC из S3
        local_path = download_file(request.s3Key, tmpdir)

        # 2. Открыть IFC
        try:
            ifc = open_ifc_safe(str(local_path))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        # 3. Получить элементы по типу
        try:
            elements = ifc.by_type(ifc_type)
        except Exception:
            raise HTTPException(
                status_code=422,
                detail=f"Неизвестный тип IFC-элемента: {ifc_type}",
            )

        if not elements:
            raise HTTPException(
                status_code=422,
                detail=f"Элементы типа '{ifc_type}' не найдены в модели",
            )

        # 4. Экспорт в CSV
        out_path = Path(tmpdir) / "export.csv"

        try:
            import ifccsv as ifccsv_mod

            csv_handler = ifccsv_mod.IfcCsv()
            csv_handler.output = str(out_path)
            csv_handler.attributes = DEFAULT_ATTRIBUTES
            csv_handler.selector = f".{ifc_type}"
            csv_handler.export(ifc, elements)
            logger.info("CSV export через ifccsv: %d элементов", len(elements))
        except Exception as ifccsv_err:
            logger.warning(
                "ifccsv fallback (ручной CSV): %s", ifccsv_err,
            )
            _export_csv_manual(ifc, elements, str(out_path), DEFAULT_ATTRIBUTES)
            logger.info("CSV export (fallback): %d элементов", len(elements))

        # 5. Загрузить CSV в S3
        s3_key = f"exports/csv/{uuid.uuid4()}.csv"
        upload_file(out_path, s3_key)

        logger.info("CSV загружен в S3: %s (%d элементов)", s3_key, len(elements))
        return CsvExportResponse(s3Key=s3_key, elementCount=len(elements))

    except HTTPException:
        raise
    except Exception as e:
        logger.error("CSV export error: %s", e)
        raise HTTPException(status_code=422, detail=f"Ошибка экспорта CSV: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
