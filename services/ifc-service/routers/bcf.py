"""
POST /bcf/export — упаковка замечаний в BCF 2.1 .bcfzip и загрузка в S3.
POST /bcf/import — разбор BCF 2.1 .bcfzip из S3 и возврат топиков.

BCF 2.1 (BIM Collaboration Format) — открытый стандарт buildingSMART
для обмена замечаниями с Revit, ArchiCAD, Tekla, nanoCAD BIM.

Структура архива:
  bcf.version                ← XML-маркер версии
  {topic-guid}/
    markup.bcf               ← XML: Topic (title, description, status, author, date)
    viewpoint.bcfv           ← XML: VisualizationInfo с IFC GUID элементов
"""

import io
import logging
import os
import shutil
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.s3 import download_file, upload_file

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Pydantic-модели ─────────────────────────────────────────────────────────

class BcfIssue(BaseModel):
    guid: str
    title: str
    description: str = ""
    author: str = ""
    ifcGuids: list[str] = []
    status: str = "Open"


class BcfExportRequest(BaseModel):
    issues: list[BcfIssue]


class BcfExportResponse(BaseModel):
    s3Key: str


class BcfImportRequest(BaseModel):
    s3Key: str


class BcfTopic(BaseModel):
    guid: str
    title: str
    description: str
    status: str
    ifcGuids: list[str]


# ─── BCF XML-фрагменты ───────────────────────────────────────────────────────

BCF_VERSION_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Version VersionId="2.1" xsi:noNamespaceSchemaLocation="version.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DetailedVersion>2.1</DetailedVersion>
</Version>"""


def _make_markup_xml(issue: BcfIssue) -> str:
    """Генерирует markup.bcf XML для одного топика."""
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    # Экранируем спецсимволы XML вручную через ElementTree
    root = ET.Element("Markup")
    topic = ET.SubElement(
        root,
        "Topic",
        Guid=issue.guid,
        TopicStatus=issue.status,
        TopicType="Issue",
    )
    ET.SubElement(topic, "Title").text = issue.title
    if issue.description:
        ET.SubElement(topic, "Description").text = issue.description
    ET.SubElement(topic, "CreationDate").text = now_iso
    if issue.author:
        ET.SubElement(topic, "CreationAuthor").text = issue.author

    tree = ET.ElementTree(root)
    buf = io.StringIO()
    tree.write(buf, encoding="unicode", xml_declaration=True)
    return buf.getvalue()


def _make_viewpoint_xml(ifc_guids: list[str]) -> str:
    """Генерирует viewpoint.bcfv XML с компонентами (IFC GUIDs)."""
    vp_guid = str(uuid.uuid4())
    root = ET.Element("VisualizationInfo", Guid=vp_guid)
    components = ET.SubElement(root, "Components")
    selection = ET.SubElement(components, "Selection")
    for guid in ifc_guids:
        ET.SubElement(selection, "Component", IfcGuid=guid)

    buf = io.StringIO()
    ET.ElementTree(root).write(buf, encoding="unicode", xml_declaration=True)
    return buf.getvalue()


# ─── Создание BCF ZIP ────────────────────────────────────────────────────────

def _create_bcf_zip(issues: list[BcfIssue]) -> io.BytesIO:
    """
    Формирует BCF 2.1 ZIP-архив в памяти.
    Сначала пробует ifcopenshell.bcf, при ImportError — ручная сборка.
    """
    try:
        return _create_bcf_zip_via_ifcopenshell(issues)
    except (ImportError, AttributeError, Exception) as e:
        logger.info("ifcopenshell.bcf недоступен (%s), использую ручную сборку BCF ZIP", e)
        return _create_bcf_zip_manual(issues)


def _create_bcf_zip_via_ifcopenshell(issues: list[BcfIssue]) -> io.BytesIO:
    """Попытка создания BCF через ifcopenshell.bcf API."""
    import ifcopenshell.bcf  # type: ignore[import]

    bcf_project = ifcopenshell.bcf.BcfXml()
    bcf_project.new_project()

    for issue in issues:
        topic = bcf_project.add_topic(
            title=issue.title,
            description=issue.description,
            author=issue.author,
            status=issue.status,
            guid=issue.guid,
        )
        if issue.ifcGuids:
            vp = bcf_project.add_viewpoint(topic)
            for ifc_guid in issue.ifcGuids:
                bcf_project.add_component(vp, ifc_guid=ifc_guid)

    buf = io.BytesIO()
    bcf_project.write(buf)
    buf.seek(0)
    return buf


def _create_bcf_zip_manual(issues: list[BcfIssue]) -> io.BytesIO:
    """Ручная сборка BCF 2.1 ZIP без зависимости от ifcopenshell.bcf."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Маркер версии BCF 2.1
        zf.writestr("bcf.version", BCF_VERSION_XML)

        for issue in issues:
            folder = issue.guid
            # markup.bcf
            zf.writestr(f"{folder}/markup.bcf", _make_markup_xml(issue))
            # viewpoint.bcfv — только если есть IFC-элементы
            if issue.ifcGuids:
                zf.writestr(f"{folder}/viewpoint.bcfv", _make_viewpoint_xml(issue.ifcGuids))

    buf.seek(0)
    return buf


# ─── Эндпоинты ───────────────────────────────────────────────────────────────

@router.post("/bcf/export", response_model=BcfExportResponse)
def bcf_export(request: BcfExportRequest) -> BcfExportResponse:
    """
    Упаковывает замечания в BCF 2.1 .bcfzip и загружает в S3.

    Input:  { issues: [{ guid, title, description, author, ifcGuids, status }] }
    Output: { s3Key: str }
    """
    logger.info("BCF export: %d замечаний", len(request.issues))
    tmpdir = tempfile.mkdtemp()

    try:
        # Создаём BCF ZIP
        zip_buf = _create_bcf_zip(request.issues)

        # Записываем во временный файл для загрузки в S3
        tmp_path = Path(tmpdir) / "export.bcfzip"
        tmp_path.write_bytes(zip_buf.read())

        # Уникальный ключ S3
        s3_key = f"bcf/export/{uuid.uuid4()}.bcfzip"
        upload_file(tmp_path, s3_key)

        logger.info("BCF ZIP загружен в S3: %s", s3_key)
        return BcfExportResponse(s3Key=s3_key)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка BCF export: %s", e)
        raise HTTPException(status_code=422, detail=f"Ошибка создания BCF: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@router.post("/bcf/import", response_model=list[BcfTopic])
def bcf_import(request: BcfImportRequest) -> list[BcfTopic]:
    """
    Скачивает BCF 2.1 .bcfzip из S3, парсит топики и возвращает список замечаний.

    Input:  { s3Key: str }
    Output: [{ guid, title, description, status, ifcGuids }]
    """
    logger.info("BCF import: s3Key=%s", request.s3Key)
    tmpdir = tempfile.mkdtemp()

    try:
        # Скачиваем архив из S3
        local_path = download_file(request.s3Key, tmpdir)

        topics: list[BcfTopic] = []

        with zipfile.ZipFile(str(local_path), "r") as zf:
            # Находим все markup.bcf файлы
            markup_files = [n for n in zf.namelist() if n.endswith("/markup.bcf")]

            for markup_name in markup_files:
                topic_folder = markup_name.rsplit("/", 1)[0]
                markup_xml = zf.read(markup_name).decode("utf-8", errors="replace")

                # Парсим markup.bcf
                try:
                    root = ET.fromstring(markup_xml)
                except ET.ParseError as e:
                    logger.warning("Ошибка парсинга markup.bcf (%s): %s", markup_name, e)
                    continue

                # Ищем Topic-элемент (с учётом возможных пространств имён)
                topic_el = root.find("Topic") or root.find("{*}Topic")
                if topic_el is None:
                    logger.warning("Topic не найден в %s", markup_name)
                    continue

                topic_guid = topic_el.get("Guid") or topic_el.get("guid") or str(uuid.uuid4())
                status_raw = topic_el.get("TopicStatus") or topic_el.get("topicStatus") or "Open"

                title_el = topic_el.find("Title") or topic_el.find("{*}Title")
                desc_el = topic_el.find("Description") or topic_el.find("{*}Description")

                title = (title_el.text or "").strip() if title_el is not None else ""
                description = (desc_el.text or "").strip() if desc_el is not None else ""

                # Ищем IFC GUIDs из парного viewpoint.bcfv
                ifc_guids: list[str] = []
                viewpoint_name = f"{topic_folder}/viewpoint.bcfv"
                if viewpoint_name in zf.namelist():
                    try:
                        vp_xml = zf.read(viewpoint_name).decode("utf-8", errors="replace")
                        vp_root = ET.fromstring(vp_xml)
                        # Component[@IfcGuid] — стандартный BCF 2.1 путь
                        for comp in vp_root.iter("Component"):
                            ifc_guid = comp.get("IfcGuid") or comp.get("ifcGuid")
                            if ifc_guid:
                                ifc_guids.append(ifc_guid)
                    except ET.ParseError as e:
                        logger.warning("Ошибка парсинга viewpoint.bcfv (%s): %s", viewpoint_name, e)

                topics.append(BcfTopic(
                    guid=topic_guid,
                    title=title or "Замечание",
                    description=description,
                    status=_normalize_status(status_raw),
                    ifcGuids=ifc_guids,
                ))

        logger.info("BCF import завершён: %d топиков", len(topics))
        return topics

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ошибка BCF import: %s", e)
        raise HTTPException(status_code=422, detail=f"Ошибка разбора BCF: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ─── Маппинг статусов BCF → внутренние ──────────────────────────────────────

def _normalize_status(raw: str) -> str:
    """
    Нормализует статус BCF-топика к строке,
    которую Next.js конвертирует в DefectStatus.
    """
    mapping = {
        "open": "Open",
        "active": "Open",
        "in progress": "In Progress",
        "inprogress": "In Progress",
        "resolved": "Resolved",
        "closed": "Closed",
        "done": "Closed",
    }
    return mapping.get(raw.lower(), raw)
