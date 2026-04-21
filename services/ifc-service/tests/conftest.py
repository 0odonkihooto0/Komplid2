"""
Предварительная настройка sys.modules для всех тестов ifc-service.

Этот файл запускается pytest до импорта любого тестового модуля.
Заглушки устанавливаются здесь, чтобы все тесты видели единый согласованный набор моков.
"""

import sys
import types
from unittest.mock import MagicMock


def _make_stub(name: str) -> types.ModuleType:
    m = types.ModuleType(name)
    m.__spec__ = None  # подавляет предупреждение pytest об отсутствии spec
    return m


# --- ifcopenshell и его субпакеты -------------------------------------------
_ifc = _make_stub("ifcopenshell")
_ifc.file = object          # type annotation в ifc_helpers.py:15
_ifc.open = MagicMock()     # open_ifc_safe вызывает ifcopenshell.open(path)
# Субпакеты: clash.py → ifcopenshell.geom, diff.py → ifcopenshell.ifcdiff,
# bcf.py → ifcopenshell.bcf
_ifc_geom = _make_stub("ifcopenshell.geom")
_ifc_geom.create_shape = MagicMock()
_ifc_geom.settings = MagicMock()
_ifc_ifcdiff = _make_stub("ifcopenshell.ifcdiff")
_ifc_bcf = _make_stub("ifcopenshell.bcf")
sys.modules["ifcopenshell"] = _ifc
sys.modules["ifcopenshell.geom"] = _ifc_geom
sys.modules["ifcopenshell.ifcdiff"] = _ifc_ifcdiff
sys.modules["ifcopenshell.bcf"] = _ifc_bcf

# --- ifcpatch ---------------------------------------------------------------
_ifcpatch = _make_stub("ifcpatch")
_ifcpatch.execute = MagicMock()
sys.modules["ifcpatch"] = _ifcpatch

# --- ifccsv -----------------------------------------------------------------
_ifccsv = _make_stub("ifccsv")
sys.modules["ifccsv"] = _ifccsv

# --- boto3 ------------------------------------------------------------------
_boto3 = _make_stub("boto3")
_boto3.client = MagicMock()
_boto3.session = _make_stub("boto3.session")
sys.modules["boto3"] = _boto3
sys.modules["boto3.session"] = _boto3.session

# --- botocore (транзитивная зависимость boto3) -------------------------------
_botocore = _make_stub("botocore")
_botocore.exceptions = _make_stub("botocore.exceptions")
_botocore.exceptions.ClientError = Exception
_botocore.exceptions.BotoCoreError = Exception
sys.modules["botocore"] = _botocore
sys.modules["botocore.exceptions"] = _botocore.exceptions
