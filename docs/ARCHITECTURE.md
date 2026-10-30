# Architecture

Athar separates language-model suggestions from deterministic checks and human decisions.

```text
User-provided passage
       │
       ▼
Browser UI ── POST /api/extract ──► Local Node server
       │                               │
       │                               ▼
       │                      QVAC SDK + local GGUF
       │                               │
       │                               ▼
       │                     Candidate numbers + quotes
       │                               │
       │                               ▼
       │                    Literal grounding checks
       │                               │
       ◄────────────── grounded suggestions ────────────┘
       │
       ▼
Human classification → evidence comparison → editable review draft
```

- **`public/app.js`** manages the browser workflow, local storage and explicit user actions.
- **`public/core.mjs`** validates periods, evidence entries and literal model-output grounding. A matched quote does not prove its interpretation or source authenticity.
- **`server.mjs`** serves an allowlisted interface, loads `@qvac/sdk` 0.22.0 and calls `completion()` on the local model. It binds to `127.0.0.1` by default and does not save cases.
- **Data:** cases are stored in browser `localStorage`, without encryption. The selected passage travels to the local server for inference. JSON backups and drafts are also unencrypted.
- **Boundaries:** no automatic complaint submission, payroll calculation, identity verification, source authentication or legal finding. `SECURITY.md` explains remaining risks.

The recorded demonstration used CPU with two threads. GPU execution and Windows are not tested. For the offline test only, the recorder, browser, server and QVAC child shared a Linux network namespace with loopback only; the host Wi-Fi state is not asserted.
