# Chat Feature (Hidden)

## Status

Chat is **fully built but hidden**. The tab has `href: null` in the navigator. All code is preserved for future activation.

## Tables (Migration 0007)

- `conversations` — one per pair of users
- `messages` — text messages with sender_id, conversation_id, content, created_at
- `conversation_participants` — links users to conversations

## File Map

| File | Status |
|------|--------|
| `backend/api/alembic/versions/0007_chat.py` | Migration ready |
| `backend/api/app/models/chat.py` | Pydantic models |
| `backend/api/app/routers/chat.py` | 5 endpoints |
| `frontend/pocket/types/database.ts` | Updated |
| `frontend/pocket/lib/api/chat.ts` | FastAPI client |
| `frontend/pocket/lib/chat/realtime.ts` | Supabase Realtime |
| `frontend/pocket/stores/chatStore.ts` | State management |
| `frontend/pocket/app/(main)/(tabs)/chat.tsx` | Conversation list |
| `frontend/pocket/app/(main)/chat/_layout.tsx` | Stack layout |
| `frontend/pocket/app/(main)/chat/[id].tsx` | Custom chat UI (FlatList) |

## Known Bug: Receiver Real-time

**Symptom:** User B must go back and re-enter the conversation to see messages from User A.

**What works:** Sender side — `sendMessage` uses `.insert().select().single()` and updates state immediately.

**What's broken:** Receiver side — `subscribeToConversation` Realtime subscription not delivering events reliably in local dev.

**Suspected cause:** `postgres_changes` with RLS in local Supabase may need additional config.

**Already tried:**
- Moved subscription to `_layout.tsx` (always-alive) ✅
- `handleConversationMessage` matches temp messages by `temp_` prefix ✅
- `sendMessage` no longer needs Realtime for sender ✅

**Next steps to investigate:**
1. Check `supabase/config.toml` for `[realtime]` section — ensure `enabled = true`
2. Verify `REPLICA IDENTITY FULL` is set on `messages` table in migration
3. Check if `supabase.realtime.setAuth(token)` needs explicit call in `lib/supabase.ts`
4. Try `{ config: { broadcast: { self: true } } }` in channel options

## Critical Dependency Warning

**Do NOT install:**
- `react-native-gifted-chat` — fatal crash with Expo Go SDK 54
- `react-native-keyboard-controller` — fatal crash with Expo Go SDK 54

The chat UI is custom-built with FlatList specifically to avoid these libraries.

## To Re-enable Chat Tab

In `frontend/pocket/app/(main)/(tabs)/_layout.tsx`, change:
```tsx
<Tabs.Screen name="chat" options={HIDDEN} />
```
to:
```tsx
<Tabs.Screen name="chat" options={CHAT_OPT} />
```
(CHAT_OPT needs to be defined similarly to the other tab options)
