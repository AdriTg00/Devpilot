import json
import os
import time
import logging
import app.core.config  # load_dotenv (carga .env antes de os.getenv)
from app.core.prompts import SUMMARIZE_PROJECT_PROMPT, language_instruction

logger = logging.getLogger(__name__)

GROQ_MODELS = {
    "fast": "llama-3.1-8b-instant",
    "balanced": "llama-3.3-70b-versatile",
    "code": "llama-3.3-70b-specdec",
}


class LLMProvider:
    def ask(self, prompt: str, temperature: float | None = None) -> str:
        raise NotImplementedError

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        raise NotImplementedError

    def ask_stream(self, prompt: str, temperature: float | None = None):
        raise NotImplementedError

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        raise NotImplementedError

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list,
                                     temperature: float | None = None):
        raise NotImplementedError

    @property
    def model_name(self) -> str:
        return "unknown"

    def update_model(self, model: str):
        pass

    def update_temperature(self, temperature: float):
        pass


class OllamaProvider(LLMProvider):
    def __init__(self, model: str | None = None, temperature: float = 0.2):
        import ollama
        self._ollama = ollama
        self.model = model or os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
        self.temperature = temperature
        self._base_url: str | None = None
        self._resolve_model()

    def _resolve_model(self):
        try:
            available = self._ollama.list()
            models = [
                m.get("model") or m.get("name")
                for m in available.get("models", [])
            ]
            if models and self.model not in models:
                prefix = self.model.split(":")[0]
                base_prefix = "".join(c for c in prefix if c.isalpha())
                matching = [m for m in models if m.startswith(base_prefix) or base_prefix in m]
                if matching:
                    self.model = matching[-1]
                else:
                    self.model = models[0]
        except Exception:
            pass

    def _options(self, temperature: float | None = None) -> dict:
        return {"temperature": temperature if temperature is not None else self.temperature}

    def ask(self, prompt: str, temperature: float | None = None) -> str:
        start = time.perf_counter()
        logger.info("Ollama call started (model=%s)", self.model)
        response = self._ollama.chat(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=False,
            options=self._options(temperature),
        )
        elapsed = time.perf_counter() - start
        content = response["message"]["content"]
        logger.info("Ollama completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(content))
        return content

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        start = time.perf_counter()
        logger.info("Ollama call started (model=%s)", self.model)
        response = self._ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            stream=False,
            options=self._options(temperature),
        )
        elapsed = time.perf_counter() - start
        content = response["message"]["content"]
        logger.info("Ollama completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(content))
        return content

    def ask_stream(self, prompt: str, temperature: float | None = None):
        start = time.perf_counter()
        logger.info("Ollama stream started (model=%s)", self.model)
        stream = self._ollama.chat(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            options=self._options(temperature),
        )
        total_chars = 0
        for chunk in stream:
            content = chunk.get("message", {}).get("content", "")
            if content:
                total_chars += len(content)
                yield content
        elapsed = time.perf_counter() - start
        logger.info("Ollama stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, total_chars)

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        start = time.perf_counter()
        logger.info("Ollama stream started (model=%s)", self.model)
        stream = self._ollama.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            stream=True,
            options=self._options(temperature),
        )
        total_chars = 0
        for chunk in stream:
            content = chunk.get("message", {}).get("content", "")
            if content:
                total_chars += len(content)
                yield content
        elapsed = time.perf_counter() - start
        logger.info("Ollama stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, total_chars)

    @property
    def model_name(self) -> str:
        return self.model

    def update_model(self, model: str):
        self.model = model
        self._resolve_model()

    def update_temperature(self, temperature: float):
        self.temperature = temperature

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list,
                                     temperature: float | None = None):
        """Streaming chat with tool calling support (Ollama)."""
        start = time.perf_counter()
        logger.info("Ollama tools stream started (model=%s)", self.model)

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

        while True:
            response = self._ollama.chat(
                model=self.model,
                messages=messages,
                tools=tools,
                stream=False,
                options=self._options(temperature),
            )

            msg = response["message"]

            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    fn = tc.get("function", {})
                    name = fn.get("name", "")
                    raw_args = fn.get("arguments", {})
                    if isinstance(raw_args, str):
                        try:
                            raw_args = json.loads(raw_args)
                        except Exception:
                            raw_args = {}
                    yield f"__TOOL__{json.dumps({'type':'tool_call','tool':name,'args':raw_args})}\n"

                    from app.tools.tool_definitions import execute_tool
                    result = execute_tool(name, raw_args)
                    yield f"__TOOL__{json.dumps({'type':'tool_result','tool':name,'result':result})}\n"

                    messages.append({"role": "assistant", "content": ""})
                    messages.append({
                        "role": "tool",
                        "content": result,
                    })
                continue

            content = msg.get("content", "")
            elapsed = time.perf_counter() - start
            logger.info("Ollama tools completed (model=%s, elapsed=%.2fs, chars=%d)",
                        self.model, elapsed, len(content))
            yield f"__TOOL__{json.dumps({'type':'done'})}\n"
            yield content
            return


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str, model: str | None = None, temperature: float = 0.2):
        from groq import Groq, APIStatusError
        self._client = Groq(api_key=api_key)
        self._APIStatusError = APIStatusError
        model_key = model or os.getenv("GROQ_MODEL", "fast")
        self.model = GROQ_MODELS.get(model_key, GROQ_MODELS["fast"])
        self._model_key = model_key
        self.temperature = temperature
        self._ollama = None

    def _fallback_ollama(self, messages: list, temperature: float | None = None) -> str:
        if self._ollama is None:
            self._ollama = OllamaProvider(temperature=temperature or self.temperature)
        logger.warning("Groq error, falling back to Ollama")
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user = next((m["content"] for m in messages if m["role"] == "user"), "")
        return self._ollama.ask_with_system(system, user, temperature)

    def ask(self, prompt: str, temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            logger.info("Groq call started (model=%s)", self.model)
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature if temperature is not None else self.temperature,
            )
            elapsed = time.perf_counter() - start
            content = response.choices[0].message.content
            logger.info("Groq completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(content))
            return content
        except self._APIStatusError:
            return self._fallback_ollama([{"role": "user", "content": prompt}], temperature)

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            logger.info("Groq call started (model=%s)", self.model)
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature if temperature is not None else self.temperature,
            )
            elapsed = time.perf_counter() - start
            content = response.choices[0].message.content
            logger.info("Groq completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(content))
            return content
        except self._APIStatusError:
            return self._fallback_ollama([{"role": "system", "content": system}, {"role": "user", "content": user}], temperature)

    def ask_stream(self, prompt: str, temperature: float | None = None):
        start = time.perf_counter()
        logger.info("Groq stream started (model=%s)", self.model)
        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=temperature if temperature is not None else self.temperature,
            )
        except self._APIStatusError:
            logger.warning("Groq error, falling back to Ollama")
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_stream(prompt, temperature)
            return
        total_chars = 0
        for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                total_chars += len(content)
                yield content
        elapsed = time.perf_counter() - start
        logger.info("Groq stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, total_chars)

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        start = time.perf_counter()
        logger.info("Groq stream started (model=%s)", self.model)
        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                stream=True,
                temperature=temperature if temperature is not None else self.temperature,
            )
        except self._APIStatusError:
            logger.warning("Groq error, falling back to Ollama")
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_stream(system, user, temperature)
            return
        total_chars = 0
        for chunk in stream:
            content = chunk.choices[0].delta.content or ""
            if content:
                total_chars += len(content)
                yield content
        elapsed = time.perf_counter() - start
        logger.info("Groq stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, total_chars)

    @property
    def model_name(self) -> str:
        return self.model

    def update_model(self, model: str):
        self._model_key = model
        self.model = GROQ_MODELS.get(model, GROQ_MODELS["fast"])

    def update_temperature(self, temperature: float):
        self.temperature = temperature

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list,
                                     temperature: float | None = None):
        """Streaming chat with tool calling (Groq/OpenAI-compatible)."""
        import json as _json

        start = time.perf_counter()
        logger.info("Groq tools stream started (model=%s)", self.model)

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]

        try:
            while True:
                response = self._client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools,
                    stream=False,
                    temperature=temperature if temperature is not None else self.temperature,
                )

                choice = response.choices[0]
                msg = choice.message

                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        name = tc.function.name
                        try:
                            raw_args = _json.loads(tc.function.arguments)
                        except Exception:
                            raw_args = {}
                        yield f"__TOOL__{_json.dumps({'type':'tool_call','tool':name,'args':raw_args})}\n"

                        from app.tools.tool_definitions import execute_tool
                        result = execute_tool(name, raw_args)
                        yield f"__TOOL__{_json.dumps({'type':'tool_result','tool':name,'result':result})}\n"

                        messages.append({"role": "assistant", "content": msg.content or ""})
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result,
                        })
                    continue

                content = msg.content or ""
                elapsed = time.perf_counter() - start
                logger.info("Groq tools completed (model=%s, elapsed=%.2fs, chars=%d)",
                            self.model, elapsed, len(content))
                yield f"__TOOL__{_json.dumps({'type':'done'})}\n"
                yield content
                return

        except self._APIStatusError:
            logger.warning("Groq error in tools call, falling back to Ollama")
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_tools_stream(system, user, tools, temperature)


class LLMService:
    def __init__(self):
        self.provider = self._detect_provider()

    def _detect_provider(self) -> LLMProvider:
        from app.services.settings_service import settings_service
        settings = settings_service.get()
        groq_key = os.getenv("GROQ_API_KEY")

        if settings.provider == "groq" and groq_key:
            logger.info("Using Groq provider (from settings)")
            return GroqProvider(groq_key, model=settings.groq_model, temperature=settings.temperature)

        if settings.provider == "ollama" or not groq_key:
            logger.info("Using Ollama provider (from settings)")
            return OllamaProvider(model=settings.ollama_model, temperature=settings.temperature)

        if groq_key:
            logger.info("Using Groq provider (auto-detect)")
            return GroqProvider(groq_key, model=settings.groq_model, temperature=settings.temperature)

        logger.info("Using Ollama provider (auto-detect)")
        return OllamaProvider(model=settings.ollama_model, temperature=settings.temperature)

    def reinit(self):
        self.provider = self._detect_provider()

    def apply_settings(self):
        from app.services.settings_service import settings_service
        settings = settings_service.get()
        self.provider.update_model(
            settings.ollama_model if settings.provider != "groq" else settings.groq_model
        )
        self.provider.update_temperature(settings.temperature)

    def ask(self, prompt: str) -> str:
        return self.provider.ask(prompt)

    def ask_with_system(self, system: str, user: str) -> str:
        return self.provider.ask_with_system(system, user)

    def ask_stream(self, prompt: str):
        yield from self.provider.ask_stream(prompt)

    def ask_with_system_stream(self, system: str, user: str):
        yield from self.provider.ask_with_system_stream(system, user)

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list):
        yield from self.provider.ask_with_system_tools_stream(system, user, tools)

    def _build_summary_prompt(self, stats, language: str) -> str:
        return SUMMARIZE_PROJECT_PROMPT.format(
            language_instruction=language_instruction(language),
            files=stats.get("files", 0),
            lines=stats.get("lines", 0),
            functions=stats.get("functions", 0),
            classes=stats.get("classes", 0),
        )

    def summarize_project(self, stats, language: str = "en") -> str:
        return self.ask(self._build_summary_prompt(stats, language))

    def summarize_project_stream(self, stats, language: str = "en"):
        yield from self.ask_stream(self._build_summary_prompt(stats, language))

    @property
    def model_name(self) -> str:
        return self.provider.model_name


_llm_service = LLMService()


def get_llm_service():
    return _llm_service


def _reinit_llm_service():
    _llm_service.reinit()
