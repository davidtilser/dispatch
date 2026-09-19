# Repository Instructions — GetItDone

Guidance for anyone (human or agent) working in this repository. See
README.md for the product, stack, and security posture.

## Scope and ownership

- Keep application code in TypeScript.
- This is a hackathon demo. Do not add full product flows or infrastructure
  beyond what a milestone explicitly asks for.
- Run `npm run typecheck`, `npm test`, and `npm run check:security` before
  committing implementation changes.
- Keep secrets out of Git and out of the client bundle (see README
  "Security Posture").

## Environment (Windows)

- Dev machine runs Windows with PowerShell in VS Code (project at
  D:\VS Code Projects\GetItDoneMOCK), Node v26.
- Never give bash-only commands in docs or terminal instructions (lsof,
  grep, cp, rm, export). Use PowerShell (Get-NetTCPConnection,
  Select-String, Copy-Item, Remove-Item, $env:VAR). Anything inside
  package.json scripts must be cross-platform Node or plain
  npm/cmd-compatible.
- Windows PowerShell 5.1 does not support && in interactive commands: give
  one command per line. && inside package.json scripts is fine.
- Use path.join or URLs in code, never hard-coded backslashes.
- Two logged-in roles in one browser share cookies: manual testing and
  demos use two separate browser contexts (a normal window plus a private
  window).
