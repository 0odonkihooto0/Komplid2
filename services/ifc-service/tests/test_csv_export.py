"""
Юнит-тесты для _export_csv_manual из routers/csv_export.py.

Проверяем формат заголовка, данные строк и обработку None-значений.
"""

import csv
import os
import tempfile
import unittest
from unittest.mock import MagicMock

from routers.csv_export import _export_csv_manual


def _make_element(ifc_type: str, **attrs) -> MagicMock:
    """Создаёт мок IFC-элемента с заданным типом и атрибутами."""
    el = MagicMock()
    el.is_a.return_value = ifc_type
    for key, val in attrs.items():
        setattr(el, key, val)
    return el


class TestExportCsvManual(unittest.TestCase):

    def _run_export(self, elements: list, attributes: list[str]) -> list[dict]:
        """Запускает _export_csv_manual и возвращает разобранные строки CSV."""
        with tempfile.NamedTemporaryFile(
            mode="r", suffix=".csv", delete=False, encoding="utf-8"
        ) as tmp:
            tmp_path = tmp.name

        try:
            _export_csv_manual(MagicMock(), elements, tmp_path, attributes)
            with open(tmp_path, encoding="utf-8", newline="") as f:
                return list(csv.DictReader(f))
        finally:
            os.unlink(tmp_path)

    def test_header_contains_ifc_type_and_attributes(self):
        """Заголовок CSV содержит 'IfcType' и переданные атрибуты."""
        attrs = ["GlobalId", "Name"]
        el = _make_element("IfcWall", GlobalId="G1", Name="W1")

        rows = self._run_export([el], attrs)

        self.assertIn("IfcType", rows[0])
        self.assertIn("GlobalId", rows[0])
        self.assertIn("Name", rows[0])

    def test_single_element_written_correctly(self):
        """Одиночный элемент записывается со всеми атрибутами."""
        attrs = ["GlobalId", "Name", "Description"]
        el = _make_element("IfcSlab", GlobalId="GUID-1", Name="Slab-1", Description="External")

        rows = self._run_export([el], attrs)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["IfcType"], "IfcSlab")
        self.assertEqual(rows[0]["GlobalId"], "GUID-1")
        self.assertEqual(rows[0]["Name"], "Slab-1")
        self.assertEqual(rows[0]["Description"], "External")

    def test_none_attribute_written_as_empty_string(self):
        """Атрибут None записывается как пустая строка, а не 'None'."""
        attrs = ["GlobalId", "Name", "Description"]
        el = _make_element("IfcWall", GlobalId="G2", Name="W2", Description=None)

        rows = self._run_export([el], attrs)

        self.assertEqual(rows[0]["Description"], "")

    def test_multiple_elements_all_written(self):
        """Несколько элементов — строк столько же."""
        attrs = ["GlobalId"]
        elements = [
            _make_element("IfcWall", GlobalId="G1"),
            _make_element("IfcSlab", GlobalId="G2"),
            _make_element("IfcColumn", GlobalId="G3"),
        ]

        rows = self._run_export(elements, attrs)

        self.assertEqual(len(rows), 3)
        guids = [r["GlobalId"] for r in rows]
        self.assertIn("G1", guids)
        self.assertIn("G2", guids)
        self.assertIn("G3", guids)

    def test_empty_elements_produces_header_only(self):
        """Пустой список элементов → CSV только с заголовком, без строк данных."""
        attrs = ["GlobalId"]
        rows = self._run_export([], attrs)
        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
