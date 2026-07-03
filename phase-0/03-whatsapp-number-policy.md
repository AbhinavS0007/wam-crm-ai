# WAM CRM AI — WhatsApp Number and Account Policy

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | WhatsApp Number and Account Policy |
| Version | 1.0 |
| Status | Approved simple MVP baseline |
| Approval date | 2026-06-28 |
| Phase | Phase 0.3 |

## 1. Purpose

This policy protects important WhatsApp numbers during development, testing, pilot and production.

No WhatsApp number is connected during Phase 0.

## 2. Core rule

The first proof of concept must use a disposable or replaceable secondary number.

Do not use:

- The primary business number
- A founder's or owner's critical personal number
- A client-owned number
- A number essential to daily business operations
- A number that cannot be safely replaced

## 3. Rollout stages

| Stage | Target | Number type | Purpose |
|---|---:|---|---|
| Proof of concept | 1 account | Disposable secondary number | Basic QR, text send/receive and restart testing |
| Multi-account engineering test | 3 accounts | Disposable or low-risk numbers | Session isolation, reconnect and reliability |
| Internal pilot | 3–5 accounts | Low-risk approved numbers | Limited internal workflow testing |
| Initial production | 5–10 accounts | Approved production numbers | Controlled business use |
| Planned future capacity | Up to 25 accounts | Approved numbers | Long-term target after measurement |

A capacity review is mandatory before operating 20–25 busy accounts.

## 4. Development rules

During development:

- Use one disposable number first.
- Start with text messages only.
- Do not use real client data.
- Do not send bulk or high-volume test messages.
- Do not simulate spam or unsolicited outreach.
- Do not connect multiple accounts until the single-account test is stable.
- Record restart, reconnect and relink results.

## 5. Multi-account test rules

After the one-account proof of concept passes, test three disposable or low-risk accounts.

The test must confirm:

- Each account has an independent session.
- One account cannot access another account's data.
- One account failure does not stop the others.
- Reconnect and restart behavior are independent.
- QR relink affects only the intended account.
- Queued messages remain linked to the correct account.
- Restart or reconnect does not create duplicate sends.

## 6. Production eligibility

A number may enter production only after:

- Disposable-number proof of concept passes
- Restart test passes
- Session restoration test passes
- Three-account engineering test passes
- Account-isolation test passes
- Privacy test passes
- Backup and restore test passes
- Reconnect and relink procedure is tested
- Manual fallback is documented
- Admin gives written approval

If any required gate fails, the number must not be added to production.

## 7. Phone custody and authority

| Responsibility | Owner |
|---|---|
| Physical phone custody | Business owner/Admin |
| QR scanning | Admin |
| New account connection | Admin |
| Account relink | Admin |
| Account disconnection | Admin |
| Account removal | Admin |
| Emergency pause | Admin |
| Technical recovery | Project owner/developer |
| Business fallback decision | Business owner/Admin |

Managers and Staff Agents cannot connect, relink, disconnect or remove WhatsApp accounts.

## 8. Manual fallback

When the custom dashboard or WhatsApp session service is unavailable:

1. Pause new dashboard sends.
2. Show the real account status.
3. Inform internal users that the dashboard is unavailable.
4. Authorized Admin may use the physical phone or official WhatsApp application.
5. The technical owner follows the reconnect or relink process.
6. Queued messages must not be silently sent twice after recovery.
7. Dashboard sending resumes only after the account state is verified.

## 9. Prohibited use

The system must not be used for:

- Bulk messaging
- Broadcast campaigns
- Spam
- Purchased contact lists
- Cold outreach
- Unsolicited marketing
- Automated drip campaigns
- Automatic AI sending
- Aggressive high-volume testing
- Testing with client-owned numbers
- Testing with a business-critical number

## 10. Simple account states

The first MVP will use:

```text
Disconnected
Connecting
Connected
Reconnecting
Paused
Requires relink
Error
```

- **Disconnected:** No active connection.
- **Connecting:** Connection is being created.
- **Connected:** Available for approved operations.
- **Reconnecting:** System is trying to restore the session.
- **Paused:** New sends are intentionally blocked.
- **Requires relink:** A new QR scan is required.
- **Error:** Manual review is required.

## 11. Account removal

Removing an account must eventually:

- Stop its active session
- Stop new outbound jobs
- Remove account-specific locks
- Safely cancel or resolve queued jobs
- Delete encrypted Baileys authentication state
- Remove user access
- Create an audit record
- Apply the approved data-retention rules

Detailed deletion rules will be finalized in Phase 0.5.

## 12. Baileys risk

Baileys is an unofficial WhatsApp protocol client.

Possible risks include:

- Protocol changes
- Broken authentication
- Unexpected logout
- QR relink requirements
- Temporary downtime
- Number restriction
- Dependency breaking changes

Required controls:

- Exact Baileys version pinning
- Disposable-number testing
- No bulk or unsolicited messaging
- Manual fallback
- Account isolation
- Reconnect and relink procedures
- Monitoring
- Written production approval

Formal risk acceptance will be recorded in Phase 0.8.

## 13. Approved decisions

- One disposable number for the first proof of concept
- Three disposable or low-risk numbers for engineering tests
- Three to five low-risk numbers for the pilot
- Five to ten approved numbers for initial production
- Planned capacity up to 25 accounts
- Capacity review before 20–25 busy accounts
- No primary business number during proof of concept
- No critical personal number during development
- No client-owned test number
- Text messaging first
- Media only after separate approval
- Admin controls QR, relink and account removal
- Business owner/Admin controls phone custody
- Official WhatsApp or the physical phone is the fallback
- No bulk, spam, cold outreach or automatic AI sending

## 14. Phase 0.3 completion condition

Phase 0.3 is complete when:

- Development-number policy is approved.
- Critical numbers are excluded from early testing.
- Rollout stages are approved.
- Phone custody is assigned.
- QR and relink authority are assigned.
- Manual fallback is documented.
- Prohibited-use rules are approved.
- Account states are approved.
- Production eligibility gates are documented.
- This document is accepted by the user.
