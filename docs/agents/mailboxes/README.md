# DEUS Agent Mailboxes

Durable mailbox repository adhering to `docs/AGENT_COMMUNICATION_PROTOCOL.md` and `docs/INVARIANT_REGISTRY.md` (`INV-GOV-04`).

## Mail is local files, not git (DEC-085, Owner 2026-10-01: "Do everything")

The `*.jsonl` mailboxes below are gitignored. PM, AG and the workers share one checkout on one machine, so each side reads and appends the others' files directly, at any time; nothing is committed. A mail commit would move `main` and make merge_gate refuse (MAIN_DIRTY, RACE_REF_MOVED), which is why the half-hour windows of DEC-081 existed and why they are gone. Append each message as one UTF-8 JSON line (no BOM, ending in LF); in PowerShell 5.1 use `[System.IO.File]::AppendAllText($path, $json + "`n", (New-Object System.Text.UTF8Encoding $false))`, never `>>`, `Out-File` or `Add-Content` (they write UTF-16). Mail what git and telemetry cannot say: a decision needed, a blocker, a ruling. Do not restate lane tips, verdicts or run states.

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
