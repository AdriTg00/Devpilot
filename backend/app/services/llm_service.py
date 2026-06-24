import os
import ollama

class LLMService:

    def __init__(self):
        self.model = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
        self._resolve_model()

    def _resolve_model(self):
        try:
            available = ollama.list()
            models = [m.get("model") or m.get("name") for m in available.get("models", [])]
            if models and self.model not in models:
                prefix = self.model.split(":")[0]
                base_prefix = "".join([c for c in prefix if c.isalpha()])
                matching = [m for m in models if (m.startswith(base_prefix) or base_prefix in m)]
                if matching:
                    self.model = matching[-1]
                else:
                    self.model = models[0]
        except Exception:
            pass

    def ask(self, prompt: str):

        response = ollama.chat(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return response["message"]["content"]