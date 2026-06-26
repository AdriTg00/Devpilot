import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parents[2] / ".chroma"
CHUNK_LINES = 50
MAX_CHUNKS_PER_FILE = 20
MAX_RESULTS = 8


class RAGService:
    def __init__(self):
        self._client = None
        self._collection = None
        self._ready = False

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
        chunk_id = 0

        for filepath in files:
            ext = Path(filepath).suffix.lower()
            if ext not in (
                ".py", ".ts", ".tsx", ".js", ".jsx",
                ".html", ".css",
                ".c", ".cpp", ".h", ".hpp", ".java", ".cs",
                ".go", ".rs", ".php", ".rb", ".swift",
                ".kt", ".scala", ".dart",
            ):
                continue

            try:
                content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            lines = content.splitlines()
            rel_path = str(Path(filepath).relative_to(Path(path).parent))
            n_chunks = min(MAX_CHUNKS_PER_FILE, max(1, len(lines) // CHUNK_LINES + 1))

            for i in range(n_chunks):
                start = i * CHUNK_LINES
                end = start + CHUNK_LINES
                chunk_text = "\n".join(lines[start:end])
                if not chunk_text.strip():
                    continue
                uid = f"{filepath}#{i}"
                chunks.append(chunk_text)
                ids.append(uid)
                metadatas.append({"file": rel_path, "project": path, "chunk": i})

            chunk_id += n_chunks

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

    def search(self, query: str, project: str, n_results: int = MAX_RESULTS) -> str:
        self._ensure_loaded()
        if not self._ready:
            return ""

        try:
            results = self._collection.query(
                query_texts=[query],
                n_results=n_results,
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

    def clear_project(self, path: str):
        self._ensure_loaded()
        if self._ready:
            try:
                self._collection.delete(where={"project": path})
                logger.info("Cleared index for %s", path)
            except Exception:
                pass


rag_service = RAGService()
