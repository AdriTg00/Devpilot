"""Tests for rag_service.py — semantic chunking + ChromaDB integration."""

import pytest
from pathlib import Path

from app.services.rag_service import _semantic_chunk, rag_service, DEFAULT_CHUNK_LINES


# ---------------------------------------------------------------------------
# Unit: _semantic_chunk
# ---------------------------------------------------------------------------

class TestSemanticChunk:
    def test_empty_content(self):
        assert _semantic_chunk("") == []

    def test_single_line(self):
        chunks = _semantic_chunk("print('hello')")
        assert len(chunks) == 1
        assert chunks[0][0] == "print('hello')"

    def test_respects_function_boundaries(self):
        content = """def foo():
    print("hello")

def bar():
    print("world")
"""
        chunks = _semantic_chunk(content, chunk_lines=3, overlap_lines=0)
        assert len(chunks) == 2
        assert "def foo()" in chunks[0][0]
        assert "def bar()" in chunks[1][0]

    def test_respects_class_boundaries(self):
        content = """class A:
    pass

class B:
    pass
"""
        chunks = _semantic_chunk(content, chunk_lines=3, overlap_lines=0)
        assert len(chunks) == 2
        assert "class A" in chunks[0][0]
        assert "class B" in chunks[1][0]

    def test_groups_small_definitions(self):
        content = "def a():\n    pass\n\ndef b():\n    pass\n\ndef c():\n    pass\n"
        chunks = _semantic_chunk(content, chunk_lines=10, overlap_lines=0)
        assert len(chunks) == 1
        assert "def a()" in chunks[0][0]
        assert "def b()" in chunks[0][0]
        assert "def c()" in chunks[0][0]

    def test_large_segment_split_by_lines(self):
        content = "\n".join(f"line_{i}" for i in range(20))
        chunks = _semantic_chunk(content, chunk_lines=10, overlap_lines=3)
        assert 2 <= len(chunks) <= 4
        for text, _ in chunks:
            assert text.strip()

    def test_respects_max_chunks(self):
        lines = [f"def func_{i}():\n    pass" for i in range(10)]
        content = "\n\n".join(lines)
        chunks = _semantic_chunk(content, chunk_lines=3, overlap_lines=0, max_chunks=3)
        assert len(chunks) <= 3

    def test_python_function_class_separate(self):
        content = """import sys

def greet(name):
    print(f"Hello {name}")

class Helper:
    @staticmethod
    def add(a, b):
        return a + b
"""
        chunks = _semantic_chunk(content, chunk_lines=5, overlap_lines=0)
        assert len(chunks) >= 2
        assert any("def greet" in c[0] for c in chunks)
        assert any("class Helper" in c[0] for c in chunks)

    def test_mixed_language_patterns(self):
        content = """function greet(name) {
  return "Hello " + name;
}

class User {
  constructor(name) {
    this.name = name;
  }
}

const helper = () => {};
"""
        chunks = _semantic_chunk(content, chunk_lines=6, overlap_lines=0)
        defs_found = sum(1 for c in chunks if "function" in c[0] or "class" in c[0])
        assert defs_found >= 2


# ---------------------------------------------------------------------------
# RAGService configuration
# ---------------------------------------------------------------------------

class TestRAGService:
    def test_configure_defaults(self):
        assert rag_service.chunk_lines == DEFAULT_CHUNK_LINES
        assert rag_service.overlap_lines == 5
        assert rag_service.max_chunks_per_file == 20
        assert rag_service.max_results == 8

    def test_configure_updates(self):
        rag_service.configure(chunk_lines=30, max_results=5)
        assert rag_service.chunk_lines == 30
        assert rag_service.max_results == 5
        rag_service.configure(
            chunk_lines=DEFAULT_CHUNK_LINES,
            overlap_lines=5,
            max_chunks_per_file=20,
            max_results=8,
        )
