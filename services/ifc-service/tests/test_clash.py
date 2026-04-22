"""
Юнит-тесты для функций AABB из routers/clash.py.

_aabb_intersects и _aabb_intersection_center — чистые математические функции,
не требующие моков ifcopenshell.
"""

import unittest

from routers.clash import _aabb_intersection_center, _aabb_intersects


class TestAabbIntersects(unittest.TestCase):

    def test_clearly_intersecting_boxes(self):
        """Два очевидно пересекающихся куба → True."""
        box_a = ([0.0, 0.0, 0.0], [2.0, 2.0, 2.0])
        box_b = ([1.0, 1.0, 1.0], [3.0, 3.0, 3.0])
        self.assertTrue(_aabb_intersects(box_a, box_b, 0.0))

    def test_clearly_non_intersecting_boxes(self):
        """Два куба без пересечения → False."""
        box_a = ([0.0, 0.0, 0.0], [1.0, 1.0, 1.0])
        box_b = ([2.0, 0.0, 0.0], [3.0, 1.0, 1.0])
        self.assertFalse(_aabb_intersects(box_a, box_b, 0.0))

    def test_touching_boxes_without_tolerance(self):
        """Касающиеся грани (max_a == min_b) → пересечение по нулевому зазору → True."""
        box_a = ([0.0, 0.0, 0.0], [1.0, 1.0, 1.0])
        box_b = ([1.0, 0.0, 0.0], [2.0, 1.0, 1.0])
        # max_a[0] + 0.0 == min_b[0] → условие не выполнено → True
        self.assertTrue(_aabb_intersects(box_a, box_b, 0.0))

    def test_gap_bridged_by_tolerance(self):
        """Коробки с зазором 0.05 → без tolerance False, с tolerance 0.1 → True."""
        box_a = ([0.0, 0.0, 0.0], [1.0, 1.0, 1.0])
        box_b = ([1.05, 0.0, 0.0], [2.0, 1.0, 1.0])
        self.assertFalse(_aabb_intersects(box_a, box_b, 0.0))
        self.assertTrue(_aabb_intersects(box_a, box_b, 0.1))

    def test_separated_on_y_axis(self):
        """Разделённые по оси Y коробки → False независимо от перекрытия на X/Z."""
        box_a = ([0.0, 0.0, 0.0], [2.0, 1.0, 2.0])
        box_b = ([0.0, 5.0, 0.0], [2.0, 6.0, 2.0])
        self.assertFalse(_aabb_intersects(box_a, box_b, 0.0))

    def test_one_box_inside_another(self):
        """Малая коробка полностью внутри большой → True."""
        box_outer = ([0.0, 0.0, 0.0], [10.0, 10.0, 10.0])
        box_inner = ([3.0, 3.0, 3.0], [7.0, 7.0, 7.0])
        self.assertTrue(_aabb_intersects(box_outer, box_inner, 0.0))
        self.assertTrue(_aabb_intersects(box_inner, box_outer, 0.0))


class TestAabbIntersectionCenter(unittest.TestCase):

    def test_partial_overlap_center(self):
        """Центр перекрытия двух частично пересекающихся кубов."""
        box_a = ([0.0, 0.0, 0.0], [2.0, 2.0, 2.0])
        box_b = ([1.0, 1.0, 1.0], [3.0, 3.0, 3.0])
        # Перекрытие: [1,2] на каждой оси → центр 1.5
        center = _aabb_intersection_center(box_a, box_b)
        self.assertAlmostEqual(center[0], 1.5)
        self.assertAlmostEqual(center[1], 1.5)
        self.assertAlmostEqual(center[2], 1.5)

    def test_full_overlap_center_equals_inner_center(self):
        """Внутренняя коробка полностью в большой → центр = центр внутренней."""
        box_outer = ([0.0, 0.0, 0.0], [10.0, 10.0, 10.0])
        box_inner = ([2.0, 4.0, 6.0], [4.0, 6.0, 8.0])
        center = _aabb_intersection_center(box_outer, box_inner)
        self.assertAlmostEqual(center[0], 3.0)
        self.assertAlmostEqual(center[1], 5.0)
        self.assertAlmostEqual(center[2], 7.0)

    def test_asymmetric_overlap(self):
        """Несимметричное перекрытие по осям."""
        box_a = ([0.0, 0.0, 0.0], [4.0, 6.0, 2.0])
        box_b = ([2.0, 3.0, 1.0], [8.0, 9.0, 5.0])
        # X: overlap [2,4] → 3.0; Y: [3,6] → 4.5; Z: [1,2] → 1.5
        center = _aabb_intersection_center(box_a, box_b)
        self.assertAlmostEqual(center[0], 3.0)
        self.assertAlmostEqual(center[1], 4.5)
        self.assertAlmostEqual(center[2], 1.5)


if __name__ == "__main__":
    unittest.main()
