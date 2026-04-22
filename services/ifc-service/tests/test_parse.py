"""
Юнит-тесты для роутера POST /parse.

Проверяем путь ValueError из open_ifc_safe → HTTPException 422.
"""

import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestParseIfcValueError(unittest.TestCase):

    @patch("routers.parse.open_ifc_safe")
    @patch("routers.parse.download_file")
    def test_value_error_returns_422(self, mock_download, mock_open_ifc):
        """
        Если open_ifc_safe бросает ValueError (невалидный IFC),
        роутер возвращает 422 с сообщением об ошибке.
        """
        fake_path = MagicMock(spec=Path)
        fake_path.__str__ = lambda self: "/tmp/test/model.ifc"
        mock_download.return_value = fake_path

        mock_open_ifc.side_effect = ValueError("Невалидный IFC-файл: bad header")

        response = client.post(
            "/parse",
            json={"s3Key": "ifc/models/bad.ifc", "modelId": "model-1"},
        )

        self.assertEqual(response.status_code, 422)
        detail = response.json().get("detail", "")
        self.assertIn("Невалидный", detail)

    @patch("routers.parse.extract_element_data")
    @patch("routers.parse.open_ifc_safe")
    @patch("routers.parse.download_file")
    def test_success_returns_200(self, mock_download, mock_open_ifc, mock_extract):
        """При успешном открытии IFC роутер возвращает 200 со списком элементов."""
        fake_path = MagicMock(spec=Path)
        fake_path.__str__ = lambda self: "/tmp/test/model.ifc"
        mock_download.return_value = fake_path

        fake_ifc = MagicMock()
        fake_ifc.schema = "IFC4"
        fake_element = MagicMock()
        fake_ifc.by_type.side_effect = lambda t: [fake_element] if t == "IfcElement" else []
        mock_open_ifc.return_value = fake_ifc

        mock_extract.return_value = {
            "ifcGuid": "GUID-1",
            "ifcType": "IfcWall",
            "name": "Wall-1",
            "description": None,
            "objectType": None,
            "layer": None,
            "level": None,
            "properties": {},
        }

        response = client.post(
            "/parse",
            json={"s3Key": "ifc/models/good.ifc", "modelId": "model-2"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["elementCount"], 1)
        self.assertEqual(body["ifcVersion"], "IFC4")


if __name__ == "__main__":
    unittest.main()
