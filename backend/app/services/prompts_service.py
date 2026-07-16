"""Service for managing editable system prompts."""

from sqlalchemy.orm import Session as DBSession

from app.db.database import SessionLocal
from app.db.models import Prompt
from app.core import prompts as default_prompts

_DEFAULT_PROMPTS: dict[str, str] = {
    "chat_system": default_prompts._CHAT_SYSTEM_PROMPT,
    "tool_system": default_prompts._TOOL_SYSTEM_PROMPT,
    "explain_file": default_prompts.EXPLAIN_FILE_PROMPT,
    "explain_project": default_prompts.EXPLAIN_PROJECT_PROMPT,
    "summarize_project": default_prompts.SUMMARIZE_PROJECT_PROMPT,
    "code_review": default_prompts.CODE_REVIEW_PROMPT,
    "code_review_json": default_prompts.CODE_REVIEW_JSON_PROMPT,
    "readme": default_prompts.README_PROMPT,
}

_DESCRIPTIONS: dict[str, str] = {
    "chat_system": "System prompt for general chat sessions",
    "tool_system": "System prompt for tool-calling chat sessions",
    "explain_file": "Prompt for explaining a single file",
    "explain_project": "Prompt for explaining the full project architecture",
    "summarize_project": "Prompt for generating a high-level project summary",
    "code_review": "Prompt for running a full code review (markdown output)",
    "code_review_json": "Prompt for running a code review (JSON output)",
    "readme": "Prompt for generating a README.md file",
}


def get_prompt(key: str, db: DBSession | None = None) -> str:
    """Get a prompt by key, falling back to default if not in DB."""
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        row = db.query(Prompt).filter(Prompt.key == key).first()
        if row:
            return row.value
        return _DEFAULT_PROMPTS.get(key, "")
    finally:
        if close_db:
            db.close()


def get_all_prompts(db: DBSession | None = None) -> dict[str, str]:
    """Get all prompts, merging DB overrides with defaults."""
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        rows = db.query(Prompt).all()
        overrides = {r.key: r.value for r in rows}
        result = {}
        for key, default in _DEFAULT_PROMPTS.items():
            result[key] = overrides.get(key, default)
        return result
    finally:
        if close_db:
            db.close()


def get_prompt_descriptions() -> dict[str, str]:
    return dict(_DESCRIPTIONS)


def update_prompt(key: str, value: str, db: DBSession | None = None) -> None:
    """Update or create a prompt override."""
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        row = db.query(Prompt).filter(Prompt.key == key).first()
        if row:
            row.value = value
        else:
            row = Prompt(key=key, value=value, description=_DESCRIPTIONS.get(key, ""))
            db.add(row)
        db.commit()
    finally:
        if close_db:
            db.close()


def reset_prompt(key: str, db: DBSession | None = None) -> str:
    """Reset a prompt to its default value."""
    default = _DEFAULT_PROMPTS.get(key)
    if default is None:
        raise ValueError(f"Unknown prompt key: {key}")
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        db.query(Prompt).filter(Prompt.key == key).delete()
        db.commit()
        return default
    finally:
        if close_db:
            db.close()


def get_default_prompts() -> dict[str, str]:
    return dict(_DEFAULT_PROMPTS)
