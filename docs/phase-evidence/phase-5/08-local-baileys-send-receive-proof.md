# Phase 5 Local Baileys Send/Receive Proof

## Purpose

This evidence records the successful local WhatsApp connectivity proof for the Phase 5 Baileys POC.

The local Baileys POC successfully verified:

- QR-based login
- Session restore using local auth folder
- Outbound WhatsApp send
- Inbound WhatsApp receive
- Group and status message filtering
- Safe masked logging

## Manual verification result

The local Baileys POC was started with npm run phase5:local-baileys-poc.

The status endpoint returned connected with hasQr false and authDir .phase5-local-auth.

This confirmed that the local Baileys session was already linked and no QR was needed.

## Outbound send proof

The local /send endpoint was tested with a WhatsApp number entered locally.

Result: success true.

The recipient received the outbound WhatsApp message.

## Inbound receive proof

A WhatsApp message was sent to the disposable POC WhatsApp account.

The local Baileys POC received the message and printed a safe masked log.

## Safety confirmation

The following were not stored in this evidence:

- QR code
- Pairing code
- Phone number
- Full JID
- Auth files
- Raw Baileys provider logs
- WhatsApp auth payload

The local auth folder remains ignored: backend/.phase5-local-auth/

## Decision

The local Baileys POC is confirmed working for QR login, session restore, outbound send, and inbound receive.

Next step is to adapt this working lifecycle into the real Phase 5 provider and service flow.
