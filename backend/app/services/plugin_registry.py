"""Plugin registry for extensible tools and analyzers."""

import logging
from typing import Any, Callable

logger = logging.getLogger("devpilot.plugins")

_registered_tools: dict[str, dict] = {}
_registered_analyzers: dict[str, Callable] = {}


def register_tool(
    name: str,
    description: str,
    handler: Callable,
    parameters: dict[str, Any],
) -> None:
    """Register a new LLM-callable tool."""
    _registered_tools[name] = {
        "name": name,
        "description": description,
        "handler": handler,
        "parameters": parameters,
    }
    logger.info("Plugin tool registered: %s", name)


def register_analyzer(extensions: list[str], handler: Callable) -> None:
    """Register a code analyzer for given file extensions."""
    for ext in extensions:
        _registered_analyzers[ext] = handler
    logger.info("Plugin analyzer registered for: %s", extensions)


def get_tool_definitions() -> list[dict]:
    """Get all registered tool definitions (OpenAI function-calling format)."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in _registered_tools.values()
    ]


def get_tool_names() -> list[str]:
    return list(_registered_tools.keys())


def execute_tool(name: str, args: dict[str, Any]) -> Any:
    """Execute a registered tool by name."""
    tool = _registered_tools.get(name)
    if not tool:
        raise ValueError(f"Unknown tool: {name}")
    return tool["handler"](**args)


def get_analyzer(ext: str) -> Callable | None:
    """Get an analyzer for a file extension."""
    return _registered_analyzers.get(ext)


def get_all_analyzers() -> dict[str, Callable]:
    return dict(_registered_analyzers)
