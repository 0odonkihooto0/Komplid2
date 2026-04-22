"""
Юнит-тесты для BCF-функций в routers/bcf.py.

Проверяем:
  - _create_bcf_zip_manual: структура ZIP, наличие markup.bcf и viewpoint.bcfv
  - bcf_import: невалидный XML в markup.bcf пропускается (не краш)
"""

import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from routers.bcf import BcfIssue, _create_bcf_zip_manual

client = TestClient(app)


# ===========================================================================
# Тесты _create_bcf_zip_manual
# ===========================================================================

class TestCreateBcfZipManual(unittest.TestCase):

    def _make_zip(self, issues: list[BcfIssue]) -> zipfile.ZipFile:
        """Вызывает _create_bcf_zip_manual и возвращает ZipFile для проверки."""
        buf = _create_bcf_zip_manual(issues)
        return zipfile.ZipFile(buf, "r")

    def test_contains_bcf_version_marker(self):
        """ZIP содержит маркер версии bcf.version."""
        issue = BcfIssue(guid="guid-1", title="Test Issue")
        with self._make_zip([issue]) as zf:
            self.assertIn("bcf.version", zf.namelist())

    def test_contains_markup_for_each_issue(self):
        """Для каждого замечания в архиве есть <guid>/markup.bcf."""
        issues = [
            BcfIssue(guid="guid-1", title="Issue 1"),
            BcfIssue(guid="guid-2", title="Issue 2"),
        ]
        with self._make_zip(issues) as zf:
            names = zf.namelist()
            self.assertIn("guid-1/markup.bcf", names)
            self.assertIn("guid-2/markup.bcf", names)

    def test_viewpoint_written_when_ifc_guids_present(self):
        """viewpoint.bcfv создаётся только для замечаний с непустым ifcGuids."""
        issue_with = BcfIssue(guid="with-vp", title="Has VP", ifcGuids=["ELEM-GUID"])
        issue_without = BcfIssue(guid="no-vp", title="No VP", ifcGuids=[])

        with self._make_zip([issue_with, issue_without]) as zf:
            names = zf.namelist()
            self.assertIn("with-vp/viewpoint.bcfv", names)
            self.assertNotIn("no-vp/viewpoint.bcfv", names)

    def test_markup_contains_title(self):
        """markup.bcf содержит title замечания."""
        issue = BcfIssue(guid="guid-title", title="Трещина в стене", status="Open")
        with self._make_zip([issue]) as zf:
            markup_xml = zf.read("guid-title/markup.bcf").decode("utf-8")
        self.assertIn("Трещина в стене", markup_xml)

    def test_empty_issues_produces_version_only(self):
        """Пустой список замечаний → ZIP только с bcf.version."""
        with self._make_zip([]) as zf:
            names = zf.namelist()
        self.assertEqual(names, ["bcf.version"])


# ===========================================================================
# Тесты bcf_import: обработка невалидного XML
# ===========================================================================

class TestBcfImportMalformedXml(unittest.TestCase):

    def _make_bcfzip_with_bad_markup(self) -> bytes:
        """Создаёт BCF ZIP с невалидным markup.bcf."""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("bcf.version", "<Version/>")
            zf.writestr("bad-guid/markup.bcf", "<<< NOT VALID XML >>>")
        return buf.getvalue()

    def _make_bcfzip_with_partial_valid(self) -> bytes:
        """ZIP с одним валидным и одним невалидным топиком."""
        buf = io.BytesIO()
        valid_markup = """<?xml version="1.0"?>
<Markup>
  <Topic Guid="good-guid" TopicStatus="Open" TopicType="Issue">
    <Title>Валидный топик</Title>
  </Topic>
</Markup>"""
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("bcf.version", "<Version/>")
            zf.writestr("good-guid/markup.bcf", valid_markup)
            zf.writestr("bad-guid/markup.bcf", "<<< BROKEN XML >>>")
        return buf.getvalue()

    def _post_import(self, zip_bytes: bytes) -> dict:
        """Записывает ZIP во временный файл, мокирует download_file, вызывает эндпоинт."""
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = Path(tmpdir) / "test.bcfzip"
            zip_path.write_bytes(zip_bytes)

            with patch("routers.bcf.download_file", return_value=zip_path):
                response = client.post(
                    "/bcf/import",
                    json={"s3Key": "bcf/test.bcfzip"},
                )
        return response

    def test_all_malformed_returns_empty_list(self):
        """Если все markup.bcf невалидны — возвращается пустой список (не краш)."""
        response = self._post_import(self._make_bcfzip_with_bad_markup())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_partial_malformed_returns_valid_topics(self):
        """Валидные топики возвращаются, невалидные — пропускаются."""
        response = self._post_import(self._make_bcfzip_with_partial_valid())

        self.assertEqual(response.status_code, 200)
        topics = response.json()
        self.assertEqual(len(topics), 1)
        self.assertEqual(topics[0]["guid"], "good-guid")
        self.assertEqual(topics[0]["title"], "Валидный топик")


if __name__ == "__main__":
    unittest.main()
