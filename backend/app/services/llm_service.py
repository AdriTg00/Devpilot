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

OPENAI_MODELS = {
    "fast": "gpt-4o-mini",
    "balanced": "gpt-4o",
    "code": "gpt-4.1",
}

ANTHROPIC_MODELS = {
    "fast": "claude-3-5-haiku-20241022",
    "balanced": "claude-3-5-sonnet-20241022",
    "code": "claude-3-opus-20240229",
}

GOOGLE_MODELS = {
    "fast": "gemini-2.0-flash",
    "balanced": "gemini-1.5-pro",
    "code": "gemini-1.5-pro",
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


class OpenAIProvider(LLMProvider):
    """OpenAI provider (gpt-4o, gpt-4o-mini, etc.). Usa la API OpenAI-compatible."""

    def __init__(self, api_key: str, model: str | None = None, temperature: float = 0.2):
        from openai import OpenAI, APIStatusError
        self._client = OpenAI(api_key=api_key)
        self._APIStatusError = APIStatusError
        model_key = model or os.getenv("OPENAI_MODEL", "fast")
        self.model = OPENAI_MODELS.get(model_key, OPENAI_MODELS["fast"])
        self._model_key = model_key
        self.temperature = temperature

    def _fallback(self, messages: list, temperature: float | None = None) -> str:
        logger.warning("OpenAI error, falling back to Ollama")
        ollama = OllamaProvider(temperature=temperature or self.temperature)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user = next((m["content"] for m in messages if m["role"] == "user"), "")
        return ollama.ask_with_system(system, user, temperature)

    def ask(self, prompt: str, temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            r = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature or self.temperature,
            )
            elapsed = time.perf_counter() - start
            c = r.choices[0].message.content
            logger.info("OpenAI completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(c))
            return c
        except self._APIStatusError:
            return self._fallback([{"role": "user", "content": prompt}], temperature)

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            r = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=temperature or self.temperature,
            )
            elapsed = time.perf_counter() - start
            c = r.choices[0].message.content
            logger.info("OpenAI completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(c))
            return c
        except self._APIStatusError:
            return self._fallback([{"role": "system", "content": system}, {"role": "user", "content": user}], temperature)

    def ask_stream(self, prompt: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=temperature or self.temperature,
            )
        except self._APIStatusError:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_stream(prompt, temperature)
            return
        total_chars = 0
        for chunk in stream:
            c = chunk.choices[0].delta.content or ""
            if c:
                total_chars += len(c)
                yield c
        logger.info("OpenAI stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, time.perf_counter() - start, total_chars)

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                stream=True,
                temperature=temperature or self.temperature,
            )
        except self._APIStatusError:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_stream(system, user, temperature)
            return
        total_chars = 0
        for chunk in stream:
            c = chunk.choices[0].delta.content or ""
            if c:
                total_chars += len(c)
                yield c
        logger.info("OpenAI stream completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, time.perf_counter() - start, total_chars)

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list, temperature: float | None = None):
        import json as _json
        start = time.perf_counter()
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        try:
            while True:
                r = self._client.chat.completions.create(
                    model=self.model, messages=messages, tools=tools, stream=False,
                    temperature=temperature or self.temperature,
                )
                msg = r.choices[0].message
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
                        messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
                    continue
                c = msg.content or ""
                logger.info("OpenAI tools completed (model=%s, elapsed=%.2fs)", self.model, time.perf_counter() - start)
                yield f"__TOOL__{_json.dumps({'type':'done'})}\n"
                yield c
                return
        except self._APIStatusError:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_tools_stream(system, user, tools, temperature)

    @property
    def model_name(self):
        return self.model

    def update_model(self, model: str):
        self._model_key = model
        self.model = OPENAI_MODELS.get(model, OPENAI_MODELS["fast"])

    def update_temperature(self, temperature: float):
        self.temperature = temperature


class AnthropicProvider(LLMProvider):
    """Anthropic provider (Claude 3.5 Sonnet, Opus, Haiku)."""

    def __init__(self, api_key: str, model: str | None = None, temperature: float = 0.2):
        from anthropic import Anthropic, APIStatusError
        self._client = Anthropic(api_key=api_key)
        self._APIStatusError = APIStatusError
        model_key = model or os.getenv("ANTHROPIC_MODEL", "balanced")
        self.model = ANTHROPIC_MODELS.get(model_key, ANTHROPIC_MODELS["balanced"])
        self._model_key = model_key
        self.temperature = temperature

    def _call(self, system: str, messages: list[dict], temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            r = self._client.messages.create(
                model=self.model,
                system=system or None,
                messages=messages,
                max_tokens=4096,
                temperature=temperature or self.temperature,
            )
            elapsed = time.perf_counter() - start
            c = r.content[0].text if r.content else ""
            logger.info("Anthropic completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(c))
            return c
        except self._APIStatusError:
            logger.warning("Anthropic error, falling back to Ollama")
            ollama = OllamaProvider(temperature=temperature or self.temperature)
            return ollama.ask_with_system(system, messages[-1]["content"], temperature) if messages else ""

    def ask(self, prompt: str, temperature: float | None = None) -> str:
        return self._call("", [{"role": "user", "content": prompt}], temperature)

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        return self._call(system, [{"role": "user", "content": user}], temperature)

    def ask_stream(self, prompt: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            with self._client.messages.stream(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
                temperature=temperature or self.temperature,
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except self._APIStatusError:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_stream(prompt, temperature)
        logger.info("Anthropic stream completed (model=%s, elapsed=%.2fs)", self.model, time.perf_counter() - start)

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            with self._client.messages.stream(
                model=self.model,
                system=system or None,
                messages=[{"role": "user", "content": user}],
                max_tokens=4096,
                temperature=temperature or self.temperature,
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except self._APIStatusError:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_stream(system, user, temperature)
        logger.info("Anthropic stream completed (model=%s, elapsed=%.2fs)", self.model, time.perf_counter() - start)

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list, temperature: float | None = None):
        yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_tools_stream(system, user, tools, temperature)

    @property
    def model_name(self):
        return self.model

    def update_model(self, model: str):
        self._model_key = model
        self.model = ANTHROPIC_MODELS.get(model, ANTHROPIC_MODELS["balanced"])

    def update_temperature(self, temperature: float):
        self.temperature = temperature


class GoogleProvider(LLMProvider):
    """Google Gemini provider (1.5 Pro, 2.0 Flash)."""

    def __init__(self, api_key: str, model: str | None = None, temperature: float = 0.2):
        from google import genai
        self._client = genai.Client(api_key=api_key)
        model_key = model or os.getenv("GOOGLE_MODEL", "fast")
        self.model = GOOGLE_MODELS.get(model_key, GOOGLE_MODELS["fast"])
        self._model_key = model_key
        self.temperature = temperature

    def _call(self, system: str, user: str, temperature: float | None = None) -> str:
        try:
            start = time.perf_counter()
            r = self._client.models.generate_content(
                model=self.model,
                contents=user,
                config={"system_instruction": system or None, "temperature": temperature or self.temperature},
            )
            elapsed = time.perf_counter() - start
            c = r.text or ""
            logger.info("Google completed (model=%s, elapsed=%.2fs, chars=%d)", self.model, elapsed, len(c))
            return c
        except Exception as e:
            logger.warning("Google error: %s, falling back to Ollama", e)
            return OllamaProvider(temperature=temperature or self.temperature).ask_with_system(system, user, temperature)

    def ask(self, prompt: str, temperature: float | None = None) -> str:
        return self._call("", prompt, temperature)

    def ask_with_system(self, system: str, user: str, temperature: float | None = None) -> str:
        return self._call(system, user, temperature)

    def ask_stream(self, prompt: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            r = self._client.models.generate_content_stream(
                model=self.model,
                contents=prompt,
                config={"temperature": temperature or self.temperature},
            )
            for chunk in r:
                if chunk.text:
                    yield chunk.text
        except Exception:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_stream(prompt, temperature)
        logger.info("Google stream completed (model=%s, elapsed=%.2fs)", self.model, time.perf_counter() - start)

    def ask_with_system_stream(self, system: str, user: str, temperature: float | None = None):
        start = time.perf_counter()
        try:
            r = self._client.models.generate_content_stream(
                model=self.model,
                contents=user,
                config={"system_instruction": system or None, "temperature": temperature or self.temperature},
            )
            for chunk in r:
                if chunk.text:
                    yield chunk.text
        except Exception:
            yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_stream(system, user, temperature)
        logger.info("Google stream completed (model=%s, elapsed=%.2fs)", self.model, time.perf_counter() - start)

    def ask_with_system_tools_stream(self, system: str, user: str, tools: list, temperature: float | None = None):
        yield from OllamaProvider(temperature=temperature or self.temperature).ask_with_system_tools_stream(system, user, tools, temperature)

    @property
    def model_name(self):
        return self.model

    def update_model(self, model: str):
        self._model_key = model
        self.model = GOOGLE_MODELS.get(model, GOOGLE_MODELS["fast"])

    def update_temperature(self, temperature: float):
        self.temperature = temperature


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
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        google_key = os.getenv("GOOGLE_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")

        if settings.provider == "openai" and openai_key:
            logger.info("Using OpenAI provider")
            return OpenAIProvider(openai_key, model=settings.provider_model, temperature=settings.temperature)

        if settings.provider == "anthropic" and anthropic_key:
            logger.info("Using Anthropic provider")
            return AnthropicProvider(anthropic_key, model=settings.provider_model, temperature=settings.temperature)

        if settings.provider == "google" and google_key:
            logger.info("Using Google provider")
            return GoogleProvider(google_key, model=settings.provider_model, temperature=settings.temperature)

        if settings.provider == "groq" and groq_key:
            logger.info("Using Groq provider")
            return GroqProvider(groq_key, model=settings.groq_model, temperature=settings.temperature)

        if settings.provider in ("ollama", "auto") or True:
            logger.info("Using Ollama provider")
            return OllamaProvider(model=settings.ollama_model, temperature=settings.temperature)

    def reinit(self):
        self.provider = self._detect_provider()

    def apply_settings(self):
        from app.services.settings_service import settings_service
        settings = settings_service.get()
        model_map = {
            "ollama": settings.ollama_model,
            "groq": settings.groq_model,
            "openai": settings.provider_model,
            "anthropic": settings.provider_model,
            "google": settings.provider_model,
        }
        self.provider.update_model(model_map.get(settings.provider, settings.ollama_model))
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
