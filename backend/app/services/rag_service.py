import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parents[2] / ".chroma"

_DEF_PATTERNS = re.compile(
    r"^\s*("
    r"def\s+|class\s+|interface\s+|trait\s+|impl\s+"
    r"|struct\s+|enum\s+|function\s+|async\s+(def|function)\s+"
    r"|export\s+(default\s+)?(function|class|interface|type)\s+"
    r"|fn\s+|pub\s+(fn|struct|enum|trait|impl|interface)"
    r"|func\s+|type\s+\w+\s*="
    r")",
    re.MULTILINE,
)

_FILE_EXTENSIONS = frozenset({
    ".py", ".ts", ".tsx", ".js", ".jsx",
    ".html", ".css",
    ".c", ".cpp", ".h", ".hpp", ".java", ".cs",
    ".go", ".rs", ".php", ".rb", ".swift",
    ".kt", ".scala", ".dart",
})

DEFAULT_CHUNK_LINES = 50
DEFAULT_OVERLAP_LINES = 5
DEFAULT_MAX_CHUNKS_PER_FILE = 20
DEFAULT_MAX_RESULTS = 8


def _semantic_chunk(
    content: str,
    chunk_lines: int = DEFAULT_CHUNK_LINES,
    overlap_lines: int = DEFAULT_OVERLAP_LINES,
    max_chunks: int = DEFAULT_MAX_CHUNKS_PER_FILE,
) -> list[tuple[str, int]]:
    lines = content.splitlines()
    if not lines:
        return []

    boundaries: list[int] = []
    for i, line in enumerate(lines):
        if _DEF_PATTERNS.match(line):
            boundaries.append(i)

    if not boundaries or boundaries[0] != 0:
        boundaries.insert(0, 0)
    if boundaries[-1] != len(lines):
        boundaries.append(len(lines))

    segments: list[list[str]] = []
    seg_starts: list[int] = []
    for j in range(len(boundaries) - 1):
        start = boundaries[j]
        end = boundaries[j + 1]
        segments.append(lines[start:end])
        seg_starts.append(start)

    if not segments:
        return []

    chunks: list[tuple[str, int]] = []

    def flush_current(cur: list[str], start: int):
        if cur:
            t = "\n".join(cur)
            if t.strip():
                chunks.append((t, start))

    current: list[str] = []
    current_start = 0

    for seg, seg_start in zip(segments, seg_starts):
        if len(seg) > chunk_lines:
            flush_current(current, current_start)
            current = []
            step = max(1, chunk_lines - overlap_lines)
            for i in range(0, len(seg), step):
                end = i + chunk_lines
                t = "\n".join(seg[i:end])
                if t.strip():
                    chunks.append((t, seg_start + i))
                if len(chunks) >= max_chunks:
                    return chunks
            continue

        if len(current) + len(seg) <= chunk_lines:
            if not current:
                current_start = seg_start
            current.extend(seg)
        else:
            flush_current(current, current_start)
            overlap = current[-overlap_lines:] if (current and overlap_lines > 0) else []
            current = overlap + seg
            current_start = seg_start - len(overlap)
            if current_start < 0:
                current_start = 0

        if len(chunks) >= max_chunks:
            break

    flush_current(current, current_start)

    if len(chunks) > max_chunks:
        chunks = chunks[:max_chunks]

    return chunks


class RAGService:
    def __init__(self):
        self._client = None
        self._collection = None
        self._ready = False
        self.chunk_lines = DEFAULT_CHUNK_LINES
        self.overlap_lines = DEFAULT_OVERLAP_LINES
        self.max_chunks_per_file = DEFAULT_MAX_CHUNKS_PER_FILE
        self.max_results = DEFAULT_MAX_RESULTS

    def configure(self, **kwargs):
        for key in ("chunk_lines", "overlap_lines", "max_chunks_per_file", "max_results"):
            if key in kwargs:
                setattr(self, key, kwargs[key])

    def _ensure_loaded(self):
        if self._ready:
            return
        try:
            import chromadb
            from chromadb.utils import embedding_functions
            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(str(CHROMA_DIR))
            emb_fn = embedding_functions.DefaultEmbeddingFunction()
            self._collection = self._client.get_or_create_collection(
                name="code_chunks",
                embedding_function=emb_fn,
            )
            self._ready = True
            logger.info("ChromaDB ready at %s", CHROMA_DIR)
        except Exception as e:
            logger.warning("ChromaDB not available: %s", e)

    @property
    def is_ready(self) -> bool:
        return self._ready

    def index_project(self, path: str, files: list[str]):
        self._ensure_loaded()
        if not self._ready:
            return

        try:
            self._collection.delete(where={"project": path})
        except Exception:
            pass

        chunks = []
        ids = []
        metadatas = []

        for filepath in files:
            ext = Path(filepath).suffix.lower()
            if ext not in _FILE_EXTENSIONS:
                continue

            try:
                content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            rel_path = str(Path(filepath).relative_to(Path(path).parent))
            file_chunks = _semantic_chunk(
                content,
                chunk_lines=self.chunk_lines,
                overlap_lines=self.overlap_lines,
                max_chunks=self.max_chunks_per_file,
            )

            for i, (chunk_text, line_start) in enumerate(file_chunks):
                uid = f"{filepath}#{i}"
                chunks.append(chunk_text)
                ids.append(uid)
                metadatas.append({
                    "file": rel_path,
                    "project": path,
                    "chunk": i,
                    "line_start": line_start,
                })

        if not chunks:
            logger.info("No chunks to index for %s", path)
            return

        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            self._collection.add(
                documents=chunks[i:i + batch_size],
                ids=ids[i:i + batch_size],
                metadatas=metadatas[i:i + batch_size],
            )

        logger.info("Indexed %d chunks for %s", len(chunks), path)

    def search(self, query: str | list[str], project: str, n_results: int | None = None) -> str:
        self._ensure_loaded()
        if not self._ready:
            return ""

        query_texts = [query] if isinstance(query, str) else query

        try:
            results = self._collection.query(
                query_texts=query_texts,
                n_results=n_results or self.max_results,
                where={"project": project},
            )
        except Exception as e:
            logger.warning("RAG search error: %s", e)
            return ""

        if not results or not results["documents"] or not results["documents"][0]:
            return ""

        fragments = []
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            file_label = meta.get("file", "unknown")
            fragments.append(f"-- {file_label} --\n{doc}")

        return "\n\n".join(fragments)

    def search_structured(self, query: str, project: str, n_results: int | None = None) -> list[dict]:
        self._ensure_loaded()
        if not self._ready:
            return []

        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=n_results or self.max_results,
                where={"project": project},
            )
        except Exception as e:
            logger.warning("RAG search error: %s", e)
            return []

        if not results or not results["documents"] or not results["documents"][0]:
            return []

        structured = []
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            structured.append({
                "file": meta.get("file", "unknown"),
                "line_start": meta.get("line_start", 1),
                "snippet": doc.split("\n")[0] if doc else "",
            })

        return structured

    def clear_project(self, path: str):
        self._ensure_loaded()
        if self._ready:
            try:
                self._collection.delete(where={"project": path})
                logger.info("Cleared index for %s", path)
            except Exception:
                pass

    def status(self, project: str | None = None) -> dict:
        info = {
            "ready": self._ready,
            "chroma_dir": str(CHROMA_DIR),
            "chunk_lines": self.chunk_lines,
            "overlap_lines": self.overlap_lines,
            "max_chunks_per_file": self.max_chunks_per_file,
            "max_results": self.max_results,
        }
        if self._ready and project:
            try:
                count = self._collection.count()
                info["total_chunks"] = count
                proj_count = len(self._collection.get(
                    where={"project": project},
                    include=[],
                ).get("ids", []))
                info["project_chunks"] = proj_count
            except Exception:
                pass
        return info


rag_service = RAGService()
