# DailyTrade Agent Guidelines

## 1. Specification & Planning Protocol (.specify)
Always leverage the Spec-Kit system located at:
`c:\Users\ASUS\Downloads\DailyTrade\my-project\.specify`

- Use templates from `my-project/.specify/templates/` (`spec-template.md`, `plan-template.md`, `tasks-template.md`, `checklist-template.md`) to structure complex tasks into clear user stories and atomic micro-tasks.
- Consult `my-project/.specify/memory/constitution.md` for core engineering principles (test-first, library-first, simplicity/YAGNI).

## 2. Release & Build Protocols
- **Zero Local Gradle Builds**: Local builds use `npm run build; npx cap sync android`. Cloud GitHub Actions builds APKs on tag push (`v*`).
- **5-Point Release Sync**: Keep `package.json`, `android/app/build.gradle`, `CHANGELOG.md`, `README.md`, and assets strictly in sync.
- **Atomic Verification**: Run `npx tsc --noEmit` after every atomic step.
