# AgentGate — hackathon demo

Verification and authorization layer that sits in front of a platform and lets AI assistants in,
with per-action permissions, phone confirmations, throttling, and a tamper-evident audit log.
Product spec: see the original spec (sections referenced below as §N). Display name is one env var: `APP_DISPLAY_NAME`.

## Run it (Docker, isolated)

```bash
docker compose up -d --build
```

| What | URL |
|---|---|
| **Stage** (assistant · phone · console side by side) | http://localhost:3000/stage |
| Console dashboard | http://localhost:3000/dashboard |
| Phone simulator | http://localhost:3000/phone |
| Assistant (chat + live browser view) | http://localhost:3100 |
| FlyDemo (airline, through the gateway) | http://localhost:4001 |
| ShopDemo (marketplace, through the gateway) | http://localhost:4002 |

Reset demo state: **Reset demo** button in the dashboard, or

```bash
docker exec agentgate pnpm seed
```

A normal reset keeps registered passkeys (no re-registering Touch ID / Windows Hello on stage).
`pnpm seed -- --full` / `POST /api/demo/reset?full=1` also wipes passkeys.

### Claude intent parsing (optional)

Set `ANTHROPIC_API_KEY` in `.env` (model from `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`). Without a key the
assistant runs in **Scripted mode** (keyword matcher). The numbered buttons / hotkeys `1`–`7` never depend on the LLM;
`0` starts a fresh agent session.

## Stage script (§3)

Start with FlyDemo's gateway **OFF** (state after reset). On the assistant: `1` → legacy bot block. Flip **Gateway ON**
in the console. `1` again → link on the phone → approve with passkey → €240 ticket. `2` → €1,400 → **Deny** on phone.
`3` → 30,000 miles → **Approve**. `4` → email change blocked by guardrail. `5` → ShopDemo connect + €89 order.
`6` → address change blocked. `7` → 100 searches → throttled. Phone → Assistants → **Revoke** ShopDemo → `5` again
→ stopped. Console → **Verify chain** → "Chain verified ✓" (optionally **Simulate tampering** → "Chain broken at #N").

Safety nets: "demo fallback" links on consent/approval screens (`DEMO_PASSKEY_FALLBACK=true`), and
`test-output/final/agentgate-demo.webm` is a recorded backup run of the whole script.

## Tests

```bash
docker exec agentgate pnpm test
docker exec agentgate npx tsx tests/e2e/phase2-human.ts
docker exec agentgate npx tsx tests/e2e/phase3-happy.ts
docker exec agentgate npx tsx tests/e2e/phase45-confirm-guardrails.ts
docker exec agentgate npx tsx tests/e2e/phase67-shop-revoke-audit.ts
docker exec agentgate npx tsx tests/e2e/full-demo.ts
```

Unit tests (Vitest): policy engine (every branch of §8), action mapper, audit hash chain.
E2E tests (Playwright, virtual WebAuthn authenticator in place of Touch ID) write screenshots to `test-output/<phase>/`.

## Layout

```
apps/console   Next.js 14 control plane: /dashboard /connect /phone /stage, APIs, policy, passkeys, SSE, SQLite
apps/gateway   Hono reverse proxy, one listener per platform (:4001, :4002); identity/detect.ts = detector boundary
apps/flydemo   Delta-style airline (upstream :5001)
apps/shopdemo  Amazon-style marketplace (upstream :5002)
apps/agent     Assistant runner: Playwright (agent UA tag) + Claude intent parsing + chat UI with live screencast
packages/shared  zod config schemas, action mapper, policy engine, audit hash chain (+ unit tests)
config/platforms  action catalog, guardrails, rate limits, default grants per platform
```

## Implementation choices beyond the spec

- Passkeys belong to the person (email), so one passkey works on both platforms; consent/approval screens offer
  "Use a new passkey on this device" when the device doesn't hold the registered key.
- The gateway forwards verified identity to the upstream as `X-AgentGate-User/-Agent/-Grant` (incoming copies are
  stripped); the demo sites show "booked by InstinctDemo via AgentGate".
- An authorized agent hitting a login path is redirected (`/?agentgate=signed-in`) instead of seeing a password form.
- Upstreams price orders themselves and reject a mismatching client-declared total (an agent can't lie about €).
- Revenue counts only forwarded purchases that returned 2xx (gateway reports outcomes to `POST /api/events`).
- Shadow mode per platform (decisions logged, not enforced) is implemented (§14.6).
- SQLite is accessed with `better-sqlite3` directly (no ORM).
