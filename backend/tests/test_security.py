"""Tests de seguridad: path traversal, system dirs, upload limits, close gate."""
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.core.validators import (
    validate_directory,
    validate_file_path,
    validate_relative_path,
    assert_project_opened,
    is_project_opened,
    mark_project_opened,
    MAX_UPLOAD_FILES,
    MAX_UPLOAD_FILE_CHARS,
)


class TestSystemPathBlocking:
    def test_blocks_windows_system32(self):
        with pytest.raises(HTTPException) as exc:
            validate_directory(r"C:\Windows\System32")
        assert exc.value.status_code == 403

    def test_blocks_program_files(self):
        with pytest.raises(HTTPException) as exc:
            validate_directory(r"C:\Program Files")
        assert exc.value.status_code == 403

    def test_blocks_unix_etc(self):
        with pytest.raises(HTTPException) as exc:
            validate_directory("/etc")
        assert exc.value.status_code == 403

    def test_blocks_unix_root(self):
        with pytest.raises(HTTPException) as exc:
            validate_directory("/root")
        assert exc.value.status_code == 403

    def test_allows_normal_dir(self, tmp_path):
        d = tmp_path / "myproject"
        d.mkdir()
        result = validate_directory(str(d))
        assert Path(result).resolve() == d.resolve()


class TestPathTraversal:
    def test_blocks_dotdot_escape(self, tmp_path):
        base = tmp_path / "workspace"
        base.mkdir()
        with pytest.raises(HTTPException) as exc:
            validate_relative_path(str(base), "../../etc/passwd")
        assert exc.value.status_code == 403

    def test_blocks_dotdot_nested(self, tmp_path):
        base = tmp_path / "workspace"
        base.mkdir()
        with pytest.raises(HTTPException) as exc:
            validate_relative_path(str(base), "subdir/../../../escape")
        assert exc.value.status_code == 403

    def test_allows_normal_relative(self, tmp_path):
        base = tmp_path / "workspace"
        base.mkdir()
        result = validate_relative_path(str(base), "src/main.py")
        assert result.replace("\\", "/").endswith("src/main.py")

    def test_allows_nested_subdir(self, tmp_path):
        base = tmp_path / "workspace"
        base.mkdir()
        result = validate_relative_path(str(base), "deep/nested/file.ts")
        assert "deep" in result and "nested" in result and "file.ts" in result


class TestProjectOpenedGate:
    def test_unopened_project_blocked(self, tmp_path):
        d = tmp_path / "proj"
        d.mkdir()
        with pytest.raises(HTTPException) as exc:
            assert_project_opened(str(d))
        assert exc.value.status_code == 403

    def test_opened_project_allowed(self, tmp_path):
        d = tmp_path / "proj"
        d.mkdir()
        mark_project_opened(str(d))
        # No exception
        assert_project_opened(str(d))

    def test_is_project_opened_after_mark(self, tmp_path):
        d = tmp_path / "proj"
        d.mkdir()
        assert not is_project_opened(str(d))
        mark_project_opened(str(d))
        assert is_project_opened(str(d))

    def test_validate_directory_marks_opened(self, tmp_path):
        d = tmp_path / "proj"
        d.mkdir()
        validate_directory(str(d))
        assert is_project_opened(str(d))


class TestUploadLimits:
    def test_max_upload_files_constant(self):
        assert MAX_UPLOAD_FILES == 2000

    def test_max_upload_file_chars_constant(self):
        assert MAX_UPLOAD_FILE_CHARS == 1_000_000


class TestValidateFilePath:
    def test_blocks_system_file(self):
        with pytest.raises(HTTPException) as exc:
            validate_file_path(r"C:\Windows\System32\drivers\etc\hosts")
        assert exc.value.status_code == 403

    def test_allows_normal_file(self, tmp_path):
        f = tmp_path / "script.py"
        f.write_text("print('hi')")
        result = validate_file_path(str(f))
        assert Path(result).resolve() == f.resolve()

    def test_rejects_nonexistent(self, tmp_path):
        with pytest.raises(HTTPException) as exc:
            validate_file_path(str(tmp_path / "nope.py"))
        assert exc.value.status_code == 400