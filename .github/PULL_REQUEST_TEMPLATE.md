## Overview

<!-- Summarize the change in 1-2 lines. Link the related issue. -->

Closes #

## What changed and why

<!-- Explain the root cause, motivation, or design decision behind this change.
     Keep it concise. Link or collapse lengthy supporting material. -->

## Validation

<!-- Show that the change works as intended.
     Include commands to reproduce the validation steps. -->

```sh
# e.g.
npm test
cd agent && pytest tests/ -v
cd backend && go test ./...
```

## Notes for reviewers

<!-- Anything that needs special attention during review: tricky logic, known limitations,
     follow-up issues, or things that are intentionally out of scope. -->

---

<details>
<summary>Pull Request Checklist</summary>

- [ ] My PR title follows [Conventional Commits](../CONTRIBUTING.md#branch--commit-guidelines) format (e.g. `fix(scanner): ...`, `feat(webhook): ...`).
- [ ] I linked the related issue above (`Closes #...`).
- [ ] I added or updated tests for the logic I changed.
- [ ] All CI checks pass locally (`npm test`, `pytest`, `go test ./...`, `npm run build` in `frontend/`).
- [ ] I updated documentation (README, CONTRIBUTING, inline comments) if the public API, CLI, or config format changed.
- [ ] Breaking changes are described in the "What changed and why" section.
- [ ] I did not include secrets, tokens, or personal credentials in code, comments, or test fixtures.

</details>
