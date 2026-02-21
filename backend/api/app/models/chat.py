"""Pydantic models for the chat system."""

from datetime import datetime

from pydantic import BaseModel, field_validator


# ── Request models ─────────────────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    """Payload to start or retrieve a 1-on-1 conversation."""
    other_user_id: str

    @field_validator("other_user_id")
    @classmethod
    def must_be_non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("other_user_id must not be empty")
        return v.strip()


# ── Response models ────────────────────────────────────────────────────────────

class ConversationCreatedResponse(BaseModel):
    """Returned after creating or finding an existing DM."""
    id: str
    type: str
    other_user_id: str
    other_user_name: str
    other_user_avatar: str | None
    created_at: datetime
    is_new: bool  # True if just created, False if pre-existing


class ConversationSummary(BaseModel):
    """One item in the conversation list — includes last message and unread count."""
    id: str
    type: str
    other_user_id: str
    other_user_name: str
    other_user_avatar: str | None
    last_message_content: str | None
    last_message_sender_id: str | None
    last_message_at: datetime | None
    unread_count: int
    created_at: datetime


class MessageResponse(BaseModel):
    """A single chat message."""
    id: str
    conversation_id: str
    sender_id: str
    content: str
    type: str
    created_at: datetime


class MessagesPage(BaseModel):
    """Paginated message response."""
    messages: list[MessageResponse]
    has_more: bool


class UnreadCountResponse(BaseModel):
    """Total unread message count across all conversations."""
    unread_count: int


class MarkReadResponse(BaseModel):
    success: bool
