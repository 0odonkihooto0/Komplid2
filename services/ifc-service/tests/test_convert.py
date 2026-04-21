"""
Интеграционные тесты для роутера POST /convert.

Проверяем ветку subprocess.TimeoutExpired без реальных S3-вызовов и IfcConvert.
"""

import subprocess
import unittest
from unittest.mock import MagicMock, patch

# conftest.py устанавливает все заглушки до импорта тестовых модулей
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestConvertTimeoutExpired(unittest.TestCase):

    @patch("routers.convert.ifcpatch.execute")
    @patch("routers.convert.subprocess.run")
    @patch("routers.convert.download_file")
    @patch("routers.convert.shutil.which")
    def test_timeout_returns_422_with_message(
        self,
        mock_which,
        mock_download,
        mock_subprocess_run,
        mock_ifcpatch,
    ):
        """
        Если IfcConvert превышает таймаут — роутер возвращает 422
        с сообщением, содержащим слово 'таймаут'.
        """
        # Имитируем наличие бинарника IfcConvert в PATH
        mock_which.return_value = "/usr/local/bin/IfcConvert"

        # Имитируем успешное скачивание файла из S3 — возвращаем объект Path-заглушку
        from pathlib import Path
        fake_local_path = MagicMock(spec=Path)
        fake_local_path.__str__ = lambda self: "/tmp/test/model.ifc"
        fake_local_path.stem = "model"
        mock_download.return_value = fake_local_path

        # ifcpatch — не делает ничего (non-fatal по логике роутера)
        mock_ifcpatch.return_value = None

        # subprocess.run бросает TimeoutExpired
        mock_subprocess_run.side_effect = subprocess.TimeoutExpired(
            cmd="IfcConvert", timeout=480
        )

        response = client.post(
            "/convert",
            json={"s3Key": "ifc/models/test.ifc", "outputS3Key": "ifc/glb/test.glb"},
        )

        self.assertEqual(response.status_code, 422)
        detail = response.json().get("detail", "")
        self.assertIn("таймаут", detail)


if __name__ == "__main__":
    unittest.main()
