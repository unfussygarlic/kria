"""Chat endpoints.

Routes:
  POST /api/v1/conversations                        → create or get existing DM
  GET  /api/v1/conversations                        → list user's conversations
  GET  /api/v1/conversations/unread-count           → total unread count
  GET  /api/v1/conversations/{id}/messages          → paginated message history
  POST /api/v1/conversations/{id}/mark-read         → update last_read_at
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.db.session import get_db
from app.models.chat import (
    ConversationCreate,
    ConversationCreatedResponse,
    ConversationSummary,
    MarkReadResponse,
    MessagesPage,
    MessageResponse,
    UnreadCountResponse,
)

router = APIRouter(tags=["chat"])

PAGE_SIZE = 50


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_participant(
    conversation_id: str,
    user_id: str,
    db: AsyncSession,
) -> None:
    """Raise 403 if the user is not a participant in this conversation."""
    row = await db.execute(
        text("""
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = :cid AND user_id = :uid
        """),
        {"cid": conversation_id, "uid": user_id},
    )
    if not row.first():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant in this conversation.",
        )


async def _get_other_profile(other_user_id: str, db: AsyncSession) -> dict:
    """Fetch display_name and avatar_url for a user."""
    row = await db.execute(
        text("SELECT display_name, avatar_url FROM profiles WHERE id = :uid"),
        {"uid": other_user_id},
    )
    profile = row.mappings().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return dict(profile)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/conversations",
    response_model=ConversationCreatedResponse,
    status_code=status.HTTP_200_OK,
)
async def create_or_get_conversation(
    payload: ConversationCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ConversationCreatedResponse:
    """Find an existing DM between caller and other_user, or create one.

    Idempotent — calling twice with the same pair returns the same conversation.
    """
    my_id = current_user.user_id
    other_id = payload.other_user_id

    if my_id == other_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a conversation with yourself.",
        )

    # Check if a 1-on-1 conversation already exists between these two users
    existing = await db.execute(
        text("""
            SELECT c.id, c.created_at
            FROM conversations c
            WHERE c.type = 'direct'
              AND EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = c.id AND user_id = :my_id
              )
              AND EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = c.id AND user_id = :other_id
              )
              AND (
                SELECT COUNT(*) FROM conversation_participants
                WHERE conversation_id = c.id
              ) = 2
            LIMIT 1
        """),
        {"my_id": my_id, "other_id": other_id},
    )
    existing_row = existing.mappings().first()

    other_profile = await _get_other_profile(other_id, db)

    if existing_row:
        return ConversationCreatedResponse(
            id=str(existing_row["id"]),
            type="direct",
            other_user_id=other_id,
            other_user_name=other_profile["display_name"],
            other_user_avatar=other_profile["avatar_url"],
            created_at=existing_row["created_at"],
            is_new=False,
        )

    # Create a new conversation
    conv_row = await db.execute(
        text("""
            INSERT INTO conversations (type) VALUES ('direct')
            RETURNING id, created_at
        """),
    )
    conv = conv_row.mappings().first()
    conv_id = str(conv["id"])

    # Add both participants
    await db.execute(
        text("""
            INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES (:cid, :uid1), (:cid, :uid2)
        """),
        {"cid": conv_id, "uid1": my_id, "uid2": other_id},
    )
    await db.commit()

    return ConversationCreatedResponse(
        id=conv_id,
        type="direct",
        other_user_id=other_id,
        other_user_name=other_profile["display_name"],
        other_user_avatar=other_profile["avatar_url"],
        created_at=conv["created_at"],
        is_new=True,
    )


@router.get("/conversations/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> UnreadCountResponse:
    """Return total unread message count across all conversations."""
    # IMPORTANT: defined before /conversations/{id}/... to avoid route conflict
    row = await db.execute(
        text("""
            SELECT COUNT(m.id) AS unread_count
            FROM messages m
            JOIN conversation_participants cp
              ON cp.conversation_id = m.conversation_id
             AND cp.user_id = :uid
            WHERE m.sender_id != :uid
              AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
        """),
        {"uid": current_user.user_id},
    )
    result = row.mappings().first()
    return UnreadCountResponse(unread_count=int(result["unread_count"] or 0))


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ConversationSummary]:
    """Return all conversations the user is in with last message and unread count."""
    rows = await db.execute(
        text("""
            SELECT
                c.id,
                c.type,
                c.created_at,
                c.last_message_at,
                other_p.id          AS other_user_id,
                other_p.display_name AS other_user_name,
                other_p.avatar_url   AS other_user_avatar,
                lm.content           AS last_message_content,
                lm.sender_id         AS last_message_sender_id,
                COUNT(um.id)         AS unread_count
            FROM conversations c
            JOIN conversation_participants my_cp
              ON my_cp.conversation_id = c.id AND my_cp.user_id = :uid
            JOIN conversation_participants other_cp
              ON other_cp.conversation_id = c.id AND other_cp.user_id != :uid
            JOIN profiles other_p
              ON other_p.id = other_cp.user_id
            LEFT JOIN LATERAL (
                SELECT id, content, sender_id
                FROM messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) lm ON true
            LEFT JOIN messages um
              ON um.conversation_id = c.id
             AND um.sender_id != :uid
             AND um.created_at > COALESCE(my_cp.last_read_at, my_cp.joined_at)
            GROUP BY
                c.id, c.type, c.created_at, c.last_message_at,
                other_p.id, other_p.display_name, other_p.avatar_url,
                lm.content, lm.sender_id
            ORDER BY c.last_message_at DESC NULLS LAST
        """),
        {"uid": current_user.user_id},
    )
    return [
        ConversationSummary(
            id=str(r["id"]),
            type=r["type"],
            other_user_id=str(r["other_user_id"]),
            other_user_name=r["other_user_name"],
            other_user_avatar=r["other_user_avatar"],
            last_message_content=r["last_message_content"],
            last_message_sender_id=str(r["last_message_sender_id"]) if r["last_message_sender_id"] else None,
            last_message_at=r["last_message_at"],
            unread_count=int(r["unread_count"] or 0),
            created_at=r["created_at"],
        )
        for r in rows.mappings().all()
    ]


@router.get("/conversations/{conversation_id}/messages", response_model=MessagesPage)
async def get_messages(
    conversation_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    before: str | None = Query(default=None, description="ISO timestamp — load messages older than this"),
) -> MessagesPage:
    """Return the last PAGE_SIZE messages in a conversation, paginated by timestamp."""
    await _assert_participant(conversation_id, current_user.user_id, db)

    if before:
        rows = await db.execute(
            text("""
                SELECT id, conversation_id, sender_id, content, type, created_at
                FROM messages
                WHERE conversation_id = :cid
                  AND created_at < :before
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"cid": conversation_id, "before": before, "limit": PAGE_SIZE + 1},
        )
    else:
        rows = await db.execute(
            text("""
                SELECT id, conversation_id, sender_id, content, type, created_at
                FROM messages
                WHERE conversation_id = :cid
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"cid": conversation_id, "limit": PAGE_SIZE + 1},
        )

    all_rows = rows.mappings().all()
    has_more = len(all_rows) > PAGE_SIZE
    page_rows = all_rows[:PAGE_SIZE]

    # Return in chronological order (oldest first) for GiftedChat
    messages = [
        MessageResponse(
            id=str(r["id"]),
            conversation_id=str(r["conversation_id"]),
            sender_id=str(r["sender_id"]),
            content=r["content"],
            type=r["type"],
            created_at=r["created_at"],
        )
        for r in reversed(page_rows)
    ]

    return MessagesPage(messages=messages, has_more=has_more)


@router.post("/conversations/{conversation_id}/mark-read", response_model=MarkReadResponse)
async def mark_conversation_read(
    conversation_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MarkReadResponse:
    """Update last_read_at for the current user in this conversation."""
    await _assert_participant(conversation_id, current_user.user_id, db)

    await db.execute(
        text("""
            UPDATE conversation_participants
            SET last_read_at = NOW()
            WHERE conversation_id = :cid AND user_id = :uid
        """),
        {"cid": conversation_id, "uid": current_user.user_id},
    )
    await db.commit()
    return MarkReadResponse(success=True)
