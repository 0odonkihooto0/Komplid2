"""
StroyDocs IFC Service — FastAPI микросервис для обработки IFC-файлов.

Вызывается из BullMQ-воркера Next.js по HTTP.
Порт по умолчанию: 8001 (задаётся переменной окружения PORT).

Эндпоинты:
  GET  /health       — проверка доступности сервиса
  POST /parse        — парсинг IFC, извлечение элементов и PropertySets
  POST /convert      — конвертация IFC → glTF/GLB через IfcConvert
  POST /clash        — обнаружение коллизий между двумя IFC-моделями
  POST /diff         — сравнение двух версий IFC (added/deleted/changed)
  POST /properties   — полные PropertySets элемента по GUID
  POST /csv          — экспорт элементов IFC в CSV через ifccsv
  POST /bcf/export   — экспорт замечаний в BCF 2.1 .bcfzip (buildingSMART)
  POST /bcf/import   — импорт замечаний из BCF 2.1 .bcfzip
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import bcf, clash, convert, csv_export, diff, parse, properties

# Настройка логирования — используем logging, не print (требование CLAUDE.md)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="StroyDocs IFC Service",
    description="Микросервис обработки IFC-файлов через IfcOpenShell",
    version="1.0.0",
)

# CORS — сервис работает во внутренней сети docker, но оставляем гибко
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(parse.router, tags=["parse"])
app.include_router(convert.router, tags=["convert"])
app.include_router(clash.router, tags=["clash"])
app.include_router(diff.router, tags=["diff"])
app.include_router(properties.router, tags=["properties"])
app.include_router(bcf.router, tags=["bcf"])
app.include_router(csv_export.router, prefix="/csv", tags=["csv"])


@app.get("/health")
def health_check() -> dict:
    """Health check эндпоинт для мониторинга и docker healthcheck."""
    return {"status": "ok", "service": "ifc-service"}


@app.on_event("startup")
async def on_startup() -> None:
    port = os.environ.get("PORT", "8001")
    logger.info("StroyDocs IFC Service запущен на порту %s", port)
    # Проверяем наличие бинарника IfcConvert при старте
    import shutil
    if shutil.which("IfcConvert"):
        logger.info("IfcConvert найден: %s", shutil.which("IfcConvert"))
    else:
        logger.warning("IfcConvert не найден в PATH — эндпоинт /convert будет недоступен")
