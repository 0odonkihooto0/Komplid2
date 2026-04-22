"""
Юнит-тесты для utils/s3.py.

Проверяем:
  - get_s3_client: синглтон + RuntimeError при отсутствии env-переменных
  - download_file: NoSuchKey → HTTPException 404, прочие ошибки → HTTPException 503
"""

import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

import utils.s3 as s3_module
from utils.s3 import download_file, get_s3_client


# ===========================================================================
# Тесты get_s3_client
# ===========================================================================

class TestGetS3Client(unittest.TestCase):

    def setUp(self):
        # Сбрасываем синглтон перед каждым тестом
        s3_module._s3_client = None

    def tearDown(self):
        s3_module._s3_client = None

    @patch.dict(os.environ, {"AWS_S3_ENDPOINT_URL": ""}, clear=False)
    def test_missing_endpoint_url_raises_runtime_error(self):
        """get_s3_client бросает RuntimeError если AWS_S3_ENDPOINT_URL пустой."""
        with self.assertRaises(RuntimeError) as ctx:
            get_s3_client()
        self.assertIn("AWS_S3_ENDPOINT_URL", str(ctx.exception))

    @patch.dict(
        os.environ,
        {
            "AWS_S3_ENDPOINT_URL": "https://s3.example.com",
            "AWS_ACCESS_KEY_ID": "",
            "AWS_SECRET_ACCESS_KEY": "",
        },
        clear=False,
    )
    def test_missing_credentials_raise_runtime_error(self):
        """get_s3_client бросает RuntimeError если ключи не заданы."""
        with self.assertRaises(RuntimeError) as ctx:
            get_s3_client()
        self.assertIn("AWS_ACCESS_KEY_ID", str(ctx.exception))

    @patch.dict(
        os.environ,
        {
            "AWS_S3_ENDPOINT_URL": "https://s3.example.com",
            "AWS_S3_REGION": "ru-1",
            "AWS_ACCESS_KEY_ID": "test-key",
            "AWS_SECRET_ACCESS_KEY": "test-secret",
        },
        clear=False,
    )
    def test_returns_boto3_client_when_env_set(self):
        """get_s3_client возвращает boto3.client при корректных env-переменных."""
        fake_client = MagicMock()
        with patch("utils.s3.boto3.client", return_value=fake_client):
            result = get_s3_client()
        self.assertIs(result, fake_client)

    @patch.dict(
        os.environ,
        {
            "AWS_S3_ENDPOINT_URL": "https://s3.example.com",
            "AWS_ACCESS_KEY_ID": "test-key",
            "AWS_SECRET_ACCESS_KEY": "test-secret",
        },
        clear=False,
    )
    def test_singleton_returns_same_instance(self):
        """get_s3_client возвращает один и тот же объект при повторных вызовах."""
        fake_client = MagicMock()
        with patch("utils.s3.boto3.client", return_value=fake_client) as mock_boto:
            first = get_s3_client()
            second = get_s3_client()

        self.assertIs(first, second)
        # boto3.client должен быть вызван ровно один раз
        mock_boto.assert_called_once()


# ===========================================================================
# Тесты download_file
# ===========================================================================

class _FakeClientError(Exception):
    """Имитирует botocore.exceptions.ClientError с атрибутом response."""
    def __init__(self, code: str):
        super().__init__(code)
        self.response = {"Error": {"Code": code}}


class TestDownloadFile(unittest.TestCase):

    def _call(self, s3_key: str, side_effect):
        """Вспомогательный метод: мокирует S3-клиент и вызывает download_file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with (
                patch("utils.s3.get_s3_client") as mock_get_client,
                patch("utils.s3.get_bucket_name", return_value="test-bucket"),
            ):
                mock_client = MagicMock()
                mock_client.download_file.side_effect = side_effect
                mock_get_client.return_value = mock_client

                with self.assertRaises(HTTPException) as ctx:
                    download_file(s3_key, tmpdir)

        return ctx.exception

    def test_no_such_key_raises_404(self):
        """ClientError с кодом NoSuchKey → HTTPException 404."""
        exc = self._call("missing/file.ifc", _FakeClientError("NoSuchKey"))
        self.assertEqual(exc.status_code, 404)
        self.assertIn("missing/file.ifc", exc.detail)

    def test_404_code_also_raises_404(self):
        """ClientError с кодом '404' → HTTPException 404."""
        exc = self._call("missing/file.ifc", _FakeClientError("404"))
        self.assertEqual(exc.status_code, 404)

    def test_other_client_error_raises_503(self):
        """ClientError с кодом AccessDenied → HTTPException 503."""
        exc = self._call("protected/file.ifc", _FakeClientError("AccessDenied"))
        self.assertEqual(exc.status_code, 503)

    def test_botocore_error_raises_503(self):
        """Исключение вне ClientError-кодов → HTTPException 503 через второй except-блок."""
        # Патчим utils.s3.ClientError на узкий класс, чтобы RuntimeError не попал
        # в первый except-блок и был поглощён вторым (BotoCoreError, Exception).
        class NarrowClientError(Exception):
            response = {"Error": {"Code": "X"}}

        with tempfile.TemporaryDirectory() as tmpdir:
            with (
                patch("utils.s3.get_s3_client") as mock_get_client,
                patch("utils.s3.get_bucket_name", return_value="test-bucket"),
                patch("utils.s3.ClientError", NarrowClientError),
            ):
                mock_client = MagicMock()
                mock_client.download_file.side_effect = RuntimeError("network failed")
                mock_get_client.return_value = mock_client

                with self.assertRaises(HTTPException) as ctx:
                    download_file("any/file.ifc", tmpdir)

        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
