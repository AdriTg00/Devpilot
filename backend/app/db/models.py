"""Modelos ORM para SQLite."""
import datetime

from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from sqlalchemy.orm import DeclarativeBase
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    @classmethod
    def hash_password(cls, plain: str) -> str:
        return _pwd.hash(plain)

    def verify_password(self, plain: str) -> bool:
        return _pwd.verify(plain, self.password_hash)


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
