import logging
from collections import OrderedDict

logger = logging.getLogger(__name__)

MAX_HISTORY_PER_KEY = 20
MAX_HISTORY_CHARS = 4000


class MemoryService:
    def __init__(self):
        self._stores: dict[str, OrderedDict] = {}

    def _get_or_create(self, key: str) -> list[dict]:
        if key not in self._stores:
            self._stores[key] = []
        return self._stores[key]

    def add(self, key: str, role: str, content: str):
        history = self._get_or_create(key)
        history.append({"role": role, "content": content})
        if len(history) > MAX_HISTORY_PER_KEY:
            history.pop(0)

    def get_history(self, key: str) -> list[dict]:
        return self._get_or_create(key)

    def build_context(self, key: str) -> str:
        history = self.get_history(key)
        if not history:
            return ""
        lines = []
        total = 0
        for entry in history:
            text = f"{entry['role']}: {entry['content']}"
            total += len(text)
            if total > MAX_HISTORY_CHARS:
                break
            lines.append(text)
        return "\n".join(lines)

    def clear(self, key: str):
        self._stores.pop(key, None)


memory_service = MemoryService()
