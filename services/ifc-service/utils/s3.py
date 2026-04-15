"""
Утилиты для работы с Timeweb S3 через boto3.

Переменные окружения (маппинг из S3_* переменных проекта):
  AWS_ACCESS_KEY_ID      ← S3_ACCESS_KEY
  AWS_SECRET_ACCESS_KEY  ← S3_SECRET_KEY
  AWS_S3_ENDPOINT_URL    ← S3_ENDPOINT
  AWS_S3_BUCKET_NAME     ← S3_BUCKET
  AWS_S3_REGION          ← S3_REGION (default: ru-1)
"""

import logging
import os
import tempfile
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Синглтон клиента S3 — инициализируется один раз при старте
_s3_client = None


def get_s3_client():
    """Возвращает синглтон boto3 S3-клиента для Timeweb S3."""
    global _s3_client
    if _s3_client is not None:
        return _s3_client

    endpoint_url = os.environ.get("AWS_S3_ENDPOINT_URL")
    region = os.environ.get("AWS_S3_REGION", "ru-1")
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")

    if not endpoint_url:
        raise RuntimeError("AWS_S3_ENDPOINT_URL не задан")
    if not access_key or not secret_key:
        raise RuntimeError("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY не заданы")

    _s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )
    return _s3_client


def get_bucket_name() -> str:
    """Возвращает имя бакета из переменной окружения."""
    bucket = os.environ.get("AWS_S3_BUCKET_NAME")
    if not bucket:
        raise RuntimeError("AWS_S3_BUCKET_NAME не задан")
    return bucket


def download_file(s3_key: str, tmpdir: str) -> Path:
    """
    Скачивает файл из S3 во временную директорию.

    Args:
        s3_key: путь к файлу в S3 (например, "ifc/models/abc.ifc")
        tmpdir: путь к временной директории (созданной через tempfile.mkdtemp())

    Returns:
        Path к скачанному файлу

    Raises:
        HTTPException(503): если S3 недоступен
        HTTPException(404): если файл не найден в S3
    """
    filename = Path(s3_key).name
    local_path = Path(tmpdir) / filename

    logger.info("Скачиваю из S3: %s → %s", s3_key, local_path)
    try:
        client = get_s3_client()
        bucket = get_bucket_name()
        client.download_file(bucket, s3_key, str(local_path))
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code in ("404", "NoSuchKey"):
            raise HTTPException(status_code=404, detail=f"Файл не найден в S3: {s3_key}")
        logger.error("S3 ClientError при скачивании %s: %s", s3_key, e)
        raise HTTPException(status_code=503, detail="S3 недоступен: " + str(e))
    except (BotoCoreError, Exception) as e:
        logger.error("Ошибка при скачивании %s из S3: %s", s3_key, e)
        raise HTTPException(status_code=503, detail="S3 недоступен: " + str(e))

    logger.info("Скачан файл: %s (%d байт)", local_path, local_path.stat().st_size)
    return local_path


def upload_file(local_path: Path, s3_key: str) -> int:
    """
    Загружает локальный файл в S3.

    Args:
        local_path: путь к локальному файлу
        s3_key: путь назначения в S3

    Returns:
        Размер загруженного файла в байтах

    Raises:
        HTTPException(503): если S3 недоступен
    """
    file_size = local_path.stat().st_size
    logger.info("Загружаю в S3: %s → %s (%d байт)", local_path, s3_key, file_size)
    try:
        client = get_s3_client()
        bucket = get_bucket_name()
        client.upload_file(str(local_path), bucket, s3_key)
    except (BotoCoreError, ClientError, Exception) as e:
        logger.error("Ошибка загрузки в S3 %s: %s", s3_key, e)
        raise HTTPException(status_code=503, detail="Ошибка загрузки в S3: " + str(e))

    logger.info("Загружен файл в S3: %s", s3_key)
    return file_size
