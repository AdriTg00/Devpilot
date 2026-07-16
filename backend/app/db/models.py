"""SQLAlchemy ORM models for SQLite."""
import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Share(Base):
    __tablename__ = "shares"

    token = Column(String(32), primary_key=True)
    project_name = Column(String(256), nullable=False)
    project_path = Column(Text, nullable=False)
    analysis = Column(JSON, nullable=False)
    file_tree = Column(JSON, nullable=False)
    file_count = Column(Integer, default=0)
    created_at = Column(String(32), nullable=False)
    expires_at = Column(String(32), nullable=False, index=True)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(256), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class Prompt(Base):
    __tablename__ = "prompts"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(256), default="")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
