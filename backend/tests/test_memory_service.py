import json
import pytest
from pathlib import Path


def test_memory_service_add_and_get(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    ms.add("proj1", "user", "hello")
    ms.add("proj1", "assistant", "world")

    history = ms.get_history("proj1")
    assert len(history) == 2
    assert history[0] == {"role": "user", "content": "hello"}
    assert history[1] == {"role": "assistant", "content": "world"}


def test_memory_service_build_context(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    ms.add("proj1", "user", "hello")
    ms.add("proj1", "assistant", "world")

    context = ms.build_context("proj1")
    assert "user: hello" in context
    assert "assistant: world" in context


def test_memory_service_max_history(tmp_path: Path):
    from app.services.memory_service import MemoryService, MAX_HISTORY_PER_KEY

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    for i in range(MAX_HISTORY_PER_KEY + 5):
        ms.add("proj1", "user", f"msg{i}")

    history = ms.get_history("proj1")
    assert len(history) == MAX_HISTORY_PER_KEY
    assert history[0]["content"] == f"msg{5}"
    assert history[-1]["content"] == f"msg{MAX_HISTORY_PER_KEY + 4}"


def test_memory_service_clear(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    ms.add("proj1", "user", "hello")
    ms.clear("proj1")

    assert ms.get_history("proj1") == []


def test_memory_service_persistence(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms1 = MemoryService(storage_path=str(path))
    ms1.add("proj1", "user", "hello")
    ms1.add("proj1", "assistant", "world")

    ms2 = MemoryService(storage_path=str(path))
    history = ms2.get_history("proj1")
    assert len(history) == 2
    assert history[0] == {"role": "user", "content": "hello"}


def test_memory_service_empty_context(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    assert ms.build_context("nonexistent") == ""


def test_memory_service_no_storage():
    from app.services.memory_service import MemoryService

    ms = MemoryService(storage_path="")
    ms.add("proj1", "user", "hello")
    assert ms.get_history("proj1") == [{"role": "user", "content": "hello"}]


def test_memory_service_corrupted_file(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    path.write_text("not valid json", encoding="utf-8")

    ms = MemoryService(storage_path=str(path))
    assert ms.get_history("proj1") == []


def test_memory_service_chars_limit(tmp_path: Path):
    from app.services.memory_service import MemoryService

    path = tmp_path / "memory.json"
    ms = MemoryService(storage_path=str(path))

    long = "x" * 5000
    ms.add("proj1", "user", long)

    context = ms.build_context("proj1")
    assert len(context) < 5000
