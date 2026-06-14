# Bladesmith Project Guidelines

## Karpathy Engineering Principles

### 1. Deep Analysis Before Action
- Stop and explicitly state assumptions about the task or bug.
- If a requirement has multiple interpretations, present the trade-offs before editing code. Do not silently pick a path.

### 2. Radical Simplicity First
- Write the minimum amount of code required to completely solve the problem.
- Avoid abstractions, interfaces, or helper files for single-use logic.
- If 200 lines of generated code can be written cleanly in 40, refactor and cut the noise.

### 3. Surgical Code Modification
- Modify ONLY the lines of code absolutely required to accomplish the goal.
- Do not auto-format, "clean up", or improve adjacent code styles unless explicitly instructed. Match the existing codebase style flawlessly.

### 4. Goal-Driven Execution
- Never assume code works because it looks correct.
- Define the exact success parameters, run local compilation/test commands, and loop until verified.

## Browser Testing Playbook

When writing, debugging, or executing Playwright browser automation tests:

1. **Selector Protocol:** Prioritize user-facing, semantic locators (`getByRole`, `getByText`, `getByLabel`) over brittle CSS classes or internal test IDs.
2. **State Isolation:** Ensure test scripts cleanly initialize state or mock API responses using network interceptors (`page.route`) rather than relying on live, mutable server states.
3. **Flakiness Protection:** Never use arbitrary timeouts (`setTimeout` or hard sleep). Always wait for specific, deterministic DOM conditions or network idle states (`waitForSelector`, `waitForResponse`).

## Security Audit Guidelines

Analyze targeted codebase focusing strictly on identifying vulnerabilities:

- **Injection & Ingestion:** Look for raw query interpolations, unvalidated inputs passing into execution commands, or unsafe JSON parsing.
- **Access Control:** Check if database rules or backend endpoints rely entirely on client-side security mechanisms rather than server-side validation.
- **Environment & Assets:** Ensure no secrets or private keys are accidentally committed or hardcoded. Look for outdated dependencies or insecure baseline image configurations.

## Project Stack

- Backend: Express.js + Supabase (PostgreSQL) + JWT auth
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Admin panel: `/admin/` directory
- Public pages: `/pages/` directory
- Tracking: Custom visitor tracker (`assets/js/tracker.js`)
- Process manager: PM2 (cluster mode, port 5000)
- Tunnel: Cloudflare (trycloudflare.com)
