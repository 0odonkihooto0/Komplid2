"""
Юнит-тесты для utils/ifc_helpers.py.

Тесты работают без реального ifcopenshell — все зависимости мокируются.
"""

import unittest
from unittest.mock import MagicMock, patch

# conftest.py устанавливает все заглушки до импорта тестовых модулей
from utils.ifc_helpers import (
    _extract_property_value,
    _extract_quantity_value,
    open_ifc_safe,
)


# ---------------------------------------------------------------------------
# Вспомогательная фабрика: создаёт мок IfcProperty с нужным типом
# ---------------------------------------------------------------------------

def _make_prop(ifc_type: str) -> MagicMock:
    """Создаёт мок IFC-свойства, чей is_a() возвращает True только для ifc_type."""
    prop = MagicMock()
    prop.is_a.side_effect = lambda t: t == ifc_type
    return prop


# ===========================================================================
# Тесты _extract_property_value
# ===========================================================================

class TestExtractPropertyValue(unittest.TestCase):

    def test_single_value_with_wrapped_value(self):
        """IfcPropertySingleValue — NominalValue с wrappedValue."""
        prop = _make_prop("IfcPropertySingleValue")
        prop.NominalValue = MagicMock()
        prop.NominalValue.wrappedValue = 42.0
        result = _extract_property_value(prop)
        self.assertEqual(result, 42.0)

    def test_single_value_nominal_none(self):
        """IfcPropertySingleValue — NominalValue is None → возвращает None."""
        prop = _make_prop("IfcPropertySingleValue")
        prop.NominalValue = None
        result = _extract_property_value(prop)
        self.assertIsNone(result)

    def test_single_value_no_wrapped_value_attr(self):
        """IfcPropertySingleValue — NominalValue без атрибута wrappedValue → str()."""
        prop = _make_prop("IfcPropertySingleValue")

        class _FakeNominal:
            """Объект без wrappedValue — вызов str() вернёт "plain_value"."""
            def __str__(self) -> str:
                return "plain_value"

        prop.NominalValue = _FakeNominal()
        result = _extract_property_value(prop)
        self.assertEqual(result, "plain_value")

    def test_list_value(self):
        """IfcPropertyListValue — список значений с wrappedValue."""
        prop = _make_prop("IfcPropertyListValue")
        v1, v2 = MagicMock(), MagicMock()
        v1.wrappedValue = "a"
        v2.wrappedValue = "b"
        prop.ListValues = [v1, v2]
        result = _extract_property_value(prop)
        self.assertEqual(result, ["a", "b"])

    def test_enumerated_value(self):
        """IfcPropertyEnumeratedValue — список enum-значений."""
        prop = _make_prop("IfcPropertyEnumeratedValue")
        e1, e2 = MagicMock(), MagicMock()
        e1.wrappedValue = "Option1"
        e2.wrappedValue = "Option2"
        prop.EnumerationValues = [e1, e2]
        result = _extract_property_value(prop)
        self.assertEqual(result, ["Option1", "Option2"])

    def test_bounded_value(self):
        """IfcPropertyBoundedValue — верхняя и нижняя граница."""
        prop = _make_prop("IfcPropertyBoundedValue")
        upper = MagicMock()
        upper.wrappedValue = 100.0
        lower = MagicMock()
        lower.wrappedValue = 0.0
        prop.UpperBoundValue = upper
        prop.LowerBoundValue = lower
        result = _extract_property_value(prop)
        self.assertEqual(result, {"upper": 100.0, "lower": 0.0})

    def test_unknown_type_fallback(self):
        """Неизвестный тип — возвращает str(prop)."""
        prop = MagicMock()
        prop.is_a.return_value = False  # ни один тип не совпадает
        prop.__str__ = lambda self: "unknown_prop_str"
        result = _extract_property_value(prop)
        self.assertEqual(result, "unknown_prop_str")


# ===========================================================================
# Тесты _extract_quantity_value
# ===========================================================================

class TestExtractQuantityValue(unittest.TestCase):

    def _make_quantity(self, attr_name: str, value: float) -> MagicMock:
        """Создаёт мок IfcQuantity с заданным атрибутом."""
        q = MagicMock(spec=[attr_name])
        setattr(q, attr_name, value)
        return q

    def test_length_value(self):
        q = self._make_quantity("LengthValue", 5.0)
        self.assertEqual(_extract_quantity_value(q), 5.0)

    def test_area_value(self):
        q = self._make_quantity("AreaValue", 12.5)
        self.assertEqual(_extract_quantity_value(q), 12.5)

    def test_volume_value(self):
        q = self._make_quantity("VolumeValue", 30.0)
        self.assertEqual(_extract_quantity_value(q), 30.0)

    def test_weight_value(self):
        q = self._make_quantity("WeightValue", 200.0)
        self.assertEqual(_extract_quantity_value(q), 200.0)

    def test_count_value(self):
        q = self._make_quantity("CountValue", 3.0)
        self.assertEqual(_extract_quantity_value(q), 3.0)

    def test_time_value(self):
        q = self._make_quantity("TimeValue", 8.0)
        self.assertEqual(_extract_quantity_value(q), 8.0)

    def test_unknown_type_fallback(self):
        """Неизвестный тип — нет ни одного из ожидаемых атрибутов → None."""
        q = MagicMock(spec=[])  # нет ни одного атрибута
        result = _extract_quantity_value(q)
        self.assertIsNone(result)


# ===========================================================================
# Тесты open_ifc_safe
# ===========================================================================

class TestOpenIfcSafe(unittest.TestCase):

    def test_raises_value_error_on_bad_file(self):
        """open_ifc_safe пробрасывает ValueError при ошибке открытия файла."""
        with patch("ifcopenshell.open", side_effect=Exception("bad file")):
            with self.assertRaises(ValueError) as ctx:
                open_ifc_safe("/tmp/nonexistent.ifc")
        self.assertIn("Невалидный IFC-файл", str(ctx.exception))

    def test_returns_ifc_file_on_success(self):
        """open_ifc_safe возвращает результат ifcopenshell.open при успехе."""
        fake_ifc = MagicMock()
        with patch("ifcopenshell.open", return_value=fake_ifc):
            result = open_ifc_safe("/tmp/model.ifc")
        self.assertIs(result, fake_ifc)


if __name__ == "__main__":
    unittest.main()
