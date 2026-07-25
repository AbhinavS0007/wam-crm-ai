# Phase 8 Evidence — 03 Retry and Safety

## Retry model

- Each claim increments `deliveryAttempts` atomically.
- A send failure below the cap sets `status: failed` with
  `nextAttemptAt = now + backoff(attempts)` (exponential: 30s base, doubling, capped at
  15 minutes).
- Once `deliveryAttempts` reaches `WHATSAPP_OUTBOUND_MAX_ATTEMPTS` (default 3), the message
  becomes `failed_permanent` and is never re-claimed.
- A message with no resolvable recipient becomes `failed_permanent` immediately
  (`no_recipient`) and is never sent.

## Safety controls

- Delivery only runs in the session process, gated by `WHATSAPP_OUTBOUND_DELIVERY_ENABLED`,
  and only sends when `WHATSAPP_SEND_TEXT_POC_ENABLED` is true.
- Throughput is bounded by `WHATSAPP_MAX_OUTBOUND_PER_MINUTE` per drain cycle.
- The stored `lastDeliveryError` keeps only the provider error `code`/`name`, never the
  full message — provider errors can echo recipient identifiers, so the raw message is
  discarded. A unit test asserts a phone/JID never appears in the stored error.
- Runtime logs print only counts and error codes; no phone, JID, body, or auth payload.
- The atomic claim prevents double-sends across overlapping polling ticks.

## Recipient resolution

The recipient is decrypted from the contact's stored identifiers via
`findContactPrivatePiiForInternalUse`, preferring the normalized provider JID and falling
back to the phone. Plaintext identifiers exist only transiently in memory during a send.
