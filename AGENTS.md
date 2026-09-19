# Repository instructions

## Hackathon first

- We are building a hackathon product. The top priority is a working end-to-end demo, delivered quickly. Make implementation decisions with that goal in mind.
- Build the complete product flow needed for the requested feature. The starter is a starting point, not a limit on scope.
- Choose the simplest solution that works for the demo. In-memory state, mocks, seeded data, and hardcoded demo defaults are welcome when they save time; make it clear which integrations are mocked.
- Defer production hardening, security audits, compliance work, scalability, exhaustive edge cases, and speculative abstractions unless explicitly requested or necessary to make the demo work. Do not turn them into prerequisites for shipping.
- Fix problems that block the main user journey. Avoid unrelated refactors, extra infrastructure, and process overhead.
- Make reasonable implementation choices and keep moving. Ask only when a missing decision materially blocks progress.

## Implementation basics

- Keep application code in TypeScript and use the existing stack. See README.md for stack details and owners; its starter descriptions do not restrict implementation.
- When changing shared contracts in packages/contracts, update the affected consumers in the same change.
- Verify the main demo path. Keep tests focused on behavior that matters to the demo; run npm run check before committing implementation changes.
- Keep real credentials in .env, out of Git and browser bundles. This basic hygiene does not require a broader security workstream.
