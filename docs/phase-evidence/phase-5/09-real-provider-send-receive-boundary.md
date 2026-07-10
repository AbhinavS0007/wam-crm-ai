# Phase 5 Real Provider Send/Receive Boundary

## Purpose

This evidence records the first integration step from the working local Baileys POC into the real Phase 5 provider and single-session service.

## What changed

- The real Baileys provider now supports outbound text sending through the active socket.
- The real Baileys provider now listens to messages.upsert.
- Inbound direct messages are normalized into safe internal events.
- Group chats, status broadcasts, self messages, and empty messages are ignored at the provider boundary.
- The single-session service now exposes sendTextMessage for the currently running Phase 5 session.
- Tests verify provider send, provider inbound filtering, and service send forwarding.

## Safety notes

- QR, phone numbers, full JIDs, auth payloads, and raw Baileys logs are not written to evidence.
- Provider inbound events include raw JID only for internal future persistence.
- Provider inbound events also include a safe masked sender preview for logging/evidence.
- Local auth files remain ignored and must not be committed.

## Decision

The real provider boundary is now ready for the next Phase 5 step: adding a real manual script/API path that uses the provider/service send and receive flow.
