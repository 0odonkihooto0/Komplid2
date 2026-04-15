"""
POST /convert — конвертация IFC → glTF/GLB через IfcConvert.

IfcConvert — официальный конвертер из пакета IfcOpenShell.
Бинарник устанавливается в Dockerfile по пути /usr/local/bin/IfcConvert.
"""

import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.s3 import download_file, upload_file

logger = logging.getLogger(__name__)

router = APIRouter()


class ConvertRequest(BaseModel):
    s3Key: str
    outputS3Key: str


class ConvertResponse(BaseModel):
    glbS3Key: str
    fileSizeBytes: int


@router.post("/convert", response_model=ConvertResponse)
def convert_ifc(request: ConvertRequest) -> ConvertResponse:
    """
    Конвертирует IFC-файл в GLB (бинарный glTF) через IfcConvert.

    Шаги:
    1. Скачать IFC из S3
    2. Запустить IfcConvert --use-element-guids
    3. Загрузить полученный .glb в S3 по outputS3Key
    4. Вернуть { glbS3Key, fileSizeBytes }

    Raises:
        503: S3 недоступен или IfcConvert не найден
        422: конвертация завершилась с ошибкой
    """
    logger.info("Начинаю конвертацию IFC → GLB: s3Key=%s → outputS3Key=%s", request.s3Key, request.outputS3Key)
    tmpdir = tempfile.mkdtemp()

    try:
        # Проверяем наличие бинарника
        ifcconvert_path = shutil.which("IfcConvert")
        if not ifcconvert_path:
            raise HTTPException(status_code=503, detail="IfcConvert не найден в PATH")

        # 1. Скачать IFC из S3
        local_ifc = download_file(request.s3Key, tmpdir)

        # 2. Путь для выходного GLB
        glb_filename = Path(request.s3Key).stem + ".glb"
        local_glb = Path(tmpdir) / glb_filename

        # 3. Запуск IfcConvert
        # --use-element-guids — использует GlobalId как ID объектов в glTF
        # --no-progress — отключает прогресс-бар (чище логи)
        cmd = [
            ifcconvert_path,
            str(local_ifc),
            str(local_glb),
            "--use-element-guids",
            "--no-progress",
        ]
        logger.info("Запускаю IfcConvert: %s", " ".join(cmd))

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 минут максимум для больших моделей
        )

        if result.returncode != 0:
            logger.error(
                "IfcConvert завершился с ошибкой (code=%d): %s",
                result.returncode,
                result.stderr,
            )
            raise HTTPException(
                status_code=422,
                detail=f"Ошибка конвертации IFC: {result.stderr[:500]}",
            )

        if not local_glb.exists():
            raise HTTPException(status_code=422, detail="IfcConvert не создал выходной файл")

        # 4. Загрузить GLB в S3
        file_size = upload_file(local_glb, request.outputS3Key)

        logger.info("Конвертация завершена: %s (%d байт)", request.outputS3Key, file_size)
        return ConvertResponse(glbS3Key=request.outputS3Key, fileSizeBytes=file_size)

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        logger.error("IfcConvert превысил таймаут 300 сек для файла %s", request.s3Key)
        raise HTTPException(status_code=422, detail="Конвертация превысила таймаут (300 сек)")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
