# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Selected direction

User selected the first ivory/lilac ribbon concept and likes its overall composition. Subsequent annotations should stay scoped; the headline can be refined without redesigning the page.

The public website should present Voice Prompt as a general desktop voice-to-prompt product, not as a MiniMax-only tool. Do not add a "Developer" nav item or a MiniMax Code-specific guide CTA to the main navigation. Keep the language switch visible and simple, with Chinese and English available for users who need either language.
