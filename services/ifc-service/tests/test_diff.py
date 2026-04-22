"""
Юнит-тесты для функции _diff_manual из routers/diff.py.

Проверяем корректность определения добавленных, удалённых и изменённых элементов.
"""

import unittest
from unittest.mock import MagicMock

from routers.diff import _diff_manual


def _make_element(guid: str, **attrs) -> MagicMock:
    """Создаёт мок IFC-элемента с заданным GlobalId и атрибутами."""
    el = MagicMock()
    el.GlobalId = guid
    for attr in ["Name", "Description", "ObjectType", "PredefinedType"]:
        setattr(el, attr, attrs.get(attr, "default"))
    el.Representation = attrs.get("Representation", "repr_default")
    return el


def _make_ifc(elements: list) -> MagicMock:
    """Создаёт мок IFC-файла, возвращающий заданные элементы через by_type."""
    ifc = MagicMock()
    ifc.by_type.return_value = elements
    return ifc


class TestDiffManual(unittest.TestCase):

    def test_added_elements_detected(self):
        """Элемент только в новом файле → попадает в added."""
        old_el = _make_element("OLD-GUID")
        new_el = _make_element("NEW-GUID")

        result = _diff_manual(_make_ifc([old_el]), _make_ifc([new_el]))

        self.assertIn("NEW-GUID", result.added)
        self.assertNotIn("OLD-GUID", result.added)

    def test_deleted_elements_detected(self):
        """Элемент только в старом файле → попадает в deleted."""
        old_el = _make_element("OLD-GUID")
        new_el = _make_element("NEW-GUID")

        result = _diff_manual(_make_ifc([old_el]), _make_ifc([new_el]))

        self.assertIn("OLD-GUID", result.deleted)
        self.assertNotIn("NEW-GUID", result.deleted)

    def test_unchanged_element_not_in_changed(self):
        """Элемент с одинаковыми атрибутами → не попадает ни в changed, ни в geometryChanged."""
        el_old = _make_element("SAME-GUID", Name="Wall", Description="Ext", Representation="R1")
        el_new = _make_element("SAME-GUID", Name="Wall", Description="Ext", Representation="R1")

        result = _diff_manual(_make_ifc([el_old]), _make_ifc([el_new]))

        self.assertEqual(result.changed, [])
        self.assertEqual(result.geometryChanged, [])

    def test_attribute_change_detected(self):
        """Элемент с изменённым Name → попадает в changed с атрибутом 'Name'."""
        el_old = _make_element("MOD-GUID", Name="WallOld")
        el_new = _make_element("MOD-GUID", Name="WallNew")

        result = _diff_manual(_make_ifc([el_old]), _make_ifc([el_new]))

        self.assertEqual(len(result.changed), 1)
        self.assertEqual(result.changed[0].guid, "MOD-GUID")
        self.assertIn("Name", result.changed[0].changedAttributes)

    def test_geometry_change_detected(self):
        """Элемент с изменённым Representation → попадает в geometryChanged."""
        el_old = _make_element("GEO-GUID", Representation="OldRepr")
        el_new = _make_element("GEO-GUID", Representation="NewRepr")

        result = _diff_manual(_make_ifc([el_old]), _make_ifc([el_new]))

        self.assertIn("GEO-GUID", result.geometryChanged)

    def test_empty_files_produce_empty_result(self):
        """Два пустых IFC-файла → все списки пусты."""
        result = _diff_manual(_make_ifc([]), _make_ifc([]))

        self.assertEqual(result.added, [])
        self.assertEqual(result.deleted, [])
        self.assertEqual(result.changed, [])
        self.assertEqual(result.geometryChanged, [])


if __name__ == "__main__":
    unittest.main()
