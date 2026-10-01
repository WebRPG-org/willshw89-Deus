# DEUS Agent Mailboxes

Durable mailbox repository adhering to `docs/AGENT_COMMUNICATION_PROTOCOL.md` and `docs/INVARIANT_REGISTRY.md` (`INV-GOV-04`).

## Schedule (DEC-081, Owner 2026-10-01: "We can do the mail on a half hour schedule")

PM and AG mail moves in two windows an hour, at :00 and :30 UTC. In each window, each side reads the other's new lines and commits its own batched lines once. Nothing is committed to the mailboxes between windows. merge_gate runs between windows (not :55-:05 or :25-:35). The Owner's direct instructions to AG are not mail.

## Structure

```text
docs/agents/mailboxes/
├── gemini/            # Messages and dispatch packets for Gemini / Antigravity
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── fable/             # Messages and handoffs for Claude / Fable
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── grok/              # Defect submissions and review reports for Grok
│   ├── inbox.jsonl
│   └── outbox.jsonl
├── codex/             # Audit requests and findings for Codex
│   ├── inbox.jsonl
│   └── outbox.jsonl
└── broadcast.jsonl    # Global inter-agent broadcasts and milestone events
```
