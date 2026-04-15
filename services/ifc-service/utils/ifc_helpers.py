"""
Вспомогательные функции для работы с IfcOpenShell.

Извлечение данных IFC-элементов: уровни, слои, PropertySets.
"""

import logging
from typing import Any

import ifcopenshell

logger = logging.getLogger(__name__)


def get_level(ifc_file: ifcopenshell.file, element: Any) -> str | None:
    """
    Возвращает название этажа (IfcBuildingStorey), к которому
    относится элемент через IfcRelContainedInSpatialStructure.
    """
    try:
        for rel in ifc_file.by_type("IfcRelContainedInSpatialStructure"):
            if element in rel.RelatedElements:
                storey = rel.RelatingStructure
                if storey.is_a("IfcBuildingStorey"):
                    return storey.Name
                # Поднимаемся по иерархии если сразу не этаж
                if hasattr(storey, "Name"):
                    return storey.Name
    except Exception as e:
        logger.debug("Не удалось получить уровень для элемента %s: %s", getattr(element, "GlobalId", "?"), e)
    return None


def get_layer(ifc_file: ifcopenshell.file, element: Any) -> str | None:
    """
    Возвращает имя слоя элемента через IfcPresentationLayerAssignment.
    Слои хранятся в IfcPresentationLayerAssignment.AssignedItems.
    """
    try:
        for layer_assign in ifc_file.by_type("IfcPresentationLayerAssignment"):
            assigned = layer_assign.AssignedItems or []
            for item in assigned:
                # Слой может быть назначен на геометрическое представление,
                # поэтому проверяем через IfcProductRepresentation
                if item == element:
                    return layer_assign.Name
            # Проверяем через представление элемента
            if hasattr(element, "Representation") and element.Representation:
                for rep in (element.Representation.Representations or []):
                    if rep in assigned:
                        return layer_assign.Name
    except Exception as e:
        logger.debug("Не удалось получить слой для элемента %s: %s", getattr(element, "GlobalId", "?"), e)
    return None


def get_property_sets(ifc_file: ifcopenshell.file, element: Any) -> dict[str, dict[str, Any]]:
    """
    Извлекает все PropertySets элемента через IfcRelDefinesByProperties.

    Returns:
        Словарь вида { "Pset_WallCommon": { "IsExternal": True, ... }, ... }
    """
    result: dict[str, dict[str, Any]] = {}
    try:
        for rel in ifc_file.by_type("IfcRelDefinesByProperties"):
            if element not in rel.RelatedObjects:
                continue
            prop_def = rel.RelatingPropertyDefinition
            if not prop_def:
                continue

            pset_name = getattr(prop_def, "Name", None) or prop_def.is_a()
            props: dict[str, Any] = {}

            if prop_def.is_a("IfcPropertySet"):
                for prop in (prop_def.HasProperties or []):
                    props[prop.Name] = _extract_property_value(prop)

            elif prop_def.is_a("IfcElementQuantity"):
                for quantity in (prop_def.Quantities or []):
                    props[quantity.Name] = _extract_quantity_value(quantity)

            if props:
                result[pset_name] = props

    except Exception as e:
        logger.debug("Ошибка извлечения PropertySets: %s", e)

    return result


def _extract_property_value(prop: Any) -> Any:
    """Извлекает значение из IfcProperty."""
    try:
        if prop.is_a("IfcPropertySingleValue"):
            val = prop.NominalValue
            if val is None:
                return None
            return val.wrappedValue if hasattr(val, "wrappedValue") else str(val)

        if prop.is_a("IfcPropertyListValue"):
            return [
                (v.wrappedValue if hasattr(v, "wrappedValue") else str(v))
                for v in (prop.ListValues or [])
            ]

        if prop.is_a("IfcPropertyEnumeratedValue"):
            return [
                (v.wrappedValue if hasattr(v, "wrappedValue") else str(v))
                for v in (prop.EnumerationValues or [])
            ]

        if prop.is_a("IfcPropertyBoundedValue"):
            return {
                "upper": prop.UpperBoundValue.wrappedValue if prop.UpperBoundValue else None,
                "lower": prop.LowerBoundValue.wrappedValue if prop.LowerBoundValue else None,
            }
    except Exception:
        pass
    return str(prop)


def _extract_quantity_value(quantity: Any) -> Any:
    """Извлекает числовое значение из IfcPhysicalSimpleQuantity."""
    try:
        for attr in ("LengthValue", "AreaValue", "VolumeValue", "WeightValue", "CountValue", "TimeValue"):
            val = getattr(quantity, attr, None)
            if val is not None:
                return val
    except Exception:
        pass
    return None


def extract_element_data(ifc_file: ifcopenshell.file, element: Any) -> dict[str, Any]:
    """
    Извлекает полные данные об IFC-элементе:
    GlobalId, Name, Description, ifcType, layer, level, PropertySets.

    Args:
        ifc_file: открытый IFC-файл
        element: IFC-элемент (IfcElement или его наследник)

    Returns:
        Словарь с данными элемента
    """
    return {
        "ifcGuid": element.GlobalId,
        "ifcType": element.is_a(),
        "name": getattr(element, "Name", None),
        "description": getattr(element, "Description", None),
        "objectType": getattr(element, "ObjectType", None),
        "layer": get_layer(ifc_file, element),
        "level": get_level(ifc_file, element),
        "properties": get_property_sets(ifc_file, element),
    }


def open_ifc_safe(path: str) -> ifcopenshell.file:
    """
    Открывает IFC-файл с обработкой ошибок.

    Raises:
        ValueError: если файл не является валидным IFC
    """
    try:
        ifc = ifcopenshell.open(path)
        return ifc
    except Exception as e:
        raise ValueError(f"Невалидный IFC-файл: {e}") from e
