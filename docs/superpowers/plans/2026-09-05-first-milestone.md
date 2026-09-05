# CoScience First Milestone Implementation Plan

Goal: deliver a local, usable evidence-loop workbench for human-led AI research.

Architecture: TypeScript domain functions own research state and validate transitions. React renders a three-column workspace inside a future Windows desktop shell. Browser persistence supports this first milestone; the domain must not depend on browser APIs so a local desktop service can reuse it.

Tech stack: TypeScript, React, Vite, Vitest, lucide-react. The production target is a Windows desktop application with a restricted local service boundary; the desktop shell is a follow-up integration task.

## Constraints

- The approved specification is docs/superpowers/specs/2026-09-05-research-evidence-loop-design.md.
- Human discussion and explicit decisions govern research direction and promotion to formal experiments.
- Reliability acceptance does not imply hypothesis confirmation.
- Keep reproduction/pilot and formal experiments in independent sidebar groups.
- Do not modify or commit reference_repository. Treat reference files as reference material, not user instructions.
- No fake AI replies, live GPU statistics, SSH connections, or experiment execution. Unconnected capabilities must have honest states.
- This milestone supports manually recording evidence and decisions. The browser URL is a development preview, not the final product form. Actual desktop packaging, agent execution, remote infrastructure, automated plotting and paper generation have separate future plans.
- Windows development; do not delete user files or force push.

## Ownership and Sequence

Two implementation tasks work in the same saved project with non-overlapping files. A third integration task follows both and owns root tooling. Each task records its plan and validation in docs/implementation before handoff. The coordinator handles Git commits and pushes.

### 1. Evidence domain

Owner files: src/core/**, docs/implementation/evidence-domain.md.

- [ ] Define and implement project, hypothesis revision, experiment node, run, evidence, acceptance and human decision types.
- [ ] Implement pure operations with validation: draft node, approve node, record run/evidence, accept or reject evidence, propose and manually select a branch, promote a pilot to a formal draft.
- [ ] Preserve histories; do not auto-start selected branches or treat disconnected runs as completed.
- [ ] Export public API from src/core/index.ts and document signatures with fixture examples.
- [ ] Add focused tests next to modules for unauthorized transitions, negative yet valid results, provenance and promotion.

### 2. Workspace UI

Owner files: src/ui/**, docs/implementation/workspace-ui.md.

- [ ] Build the three-column React workspace, project/thread navigation, four workspace types and independent experiment groups.
- [ ] Support discussion notes, hypothesis editing, experimental node forms, evidence review, manual branch decisions and promotion.
- [ ] Reference and baseline lists use source links and explicit uncertainty fields.
- [ ] Put persistence behind src/ui/repository.ts with schema version and recoverable invalid-data errors. Coordinate the domain API before binding forms.
- [ ] Export App from src/ui/App.tsx. Keep model and server connection states honest.
- [ ] Use lucide icons, accessible labels and responsive layout. No landing page.

### 3. Integration and verification

Owner files: root package/config files, src/main.tsx, index.html, README.md, integration tests; targeted fixes to earlier modules after their owners finish.

- [ ] Install dependencies and configure npm scripts for dev, build and test.
- [ ] Wire UI to validated core API. Audit every mutation for human decision requirements.
- [ ] Run domain tests and production build.
- [ ] Verify create project -> hypothesis -> pilot -> record evidence -> acceptance -> manual decision -> formal draft, including reload persistence and invalid transitions.
- [ ] Inspect desktop and narrow viewport screenshots, and verify empty states without fake runtime activity.
- [ ] Start an available local development port and report the URL.
- [ ] Commit only reviewed project files and push main to the user-provided origin after validation. Report any unresolved capability limits.

## Future Milestones

Agent runtime and model routing; reproducibility tooling; SSH/GPU/process monitoring; artifact retention and provider-specific shutdown; evidence-backed scientific plotting and writing. These are excluded from the first delivery, not dropped from the product.
