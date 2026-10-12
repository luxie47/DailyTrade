---
name: dailytrade-release
description: Standardized release and APK build workflow for DailyTrade. Enforces zero-local Gradle builds, 5-point version sync, asset sync, and cloud GitHub Actions compilation. Triggers on /release, /build-apk, or when releasing updates.
---

# DailyTrade Release & Build Protocol

Whenever releasing an update or building a new APK for DailyTrade, follow this exact protocol:

## 1. Zero Local Gradle Builds (Cloud-Only)
- **NEVER** run `./gradlew assembleDebug` or `./gradlew assembleRelease` locally.
- Keep the local machine fast and prevent lockups.
- GitHub Actions (`.github/workflows/build-apk.yml`) compiles and packages `DailyTrade.apk` in the cloud on git tag push (`v*`).

## 1.1 IDE Diagnostics & False-Positive Guardrail
- **Ignore Background Gradle / JDT Errors**: The IDE's Java language server (Eclipse Buildship) frequently flags errors in `.kilo/worktrees/*` or internal cache directories (`redhat.java/jdt_ws`). These are background scanner artifacts and **not project defects**.
- **True Health Indicator**: Project correctness is strictly determined by `npx tsc --noEmit` and `npm run build` (`tsc && vite build`).

## 1.2 Atomic Execution & Anti-Hallucination Protocol
Whenever executing multi-step refactors, features, or architecture changes:
1. **Deconstruct into Atomic Micro-Tasks**: Split large plans into single-responsibility phases and track them step-by-step in `task.md`.
2. **Inspect Real Code First**: Always read the exact active file lines (`view_file`) before writing edits. Never assume or hallucinate imports, property names, or signatures.
3. **One Phase at a Time**: Execute only one phase at a time. Do not jump ahead.
4. **Immediate Compiler Verification**: Run `npx tsc --noEmit` after every atomic modification to catch contract mismatches, undefined variables, and type errors instantly.
5. **Zero Auto-Commits**: Never commit code to Git automatically. Commits remain strictly user-directed.


## 2. Mandatory 5-Point Version Synchronization Checklist
Before pushing any release:
1. `package.json`: Increment `"version"` (e.g. `1.2.2`).
2. `android/app/build.gradle`: Increment integer `versionCode` (e.g. `5`) and update `versionName` (e.g. `"1.2.2"`).
3. `CHANGELOG.md`: Add release entry under `## [X.X.X] - YYYY-MM-DD` with formal, professional change items.
4. `README.md`: Update the APK badge link `.../download/vX.X.X/DailyTrade.apk`.
5. Mobile Layout Check: Verify header and UI components do not overflow on 360px portrait screens.

## 3. Asset Synchronization
Always bundle latest web assets into Android Capacitor before release:
```powershell
npm run build; npx cap sync android
```

## 4. Git Commit & Release Tag Push
```powershell
git add -A
git commit -m "feat(vX.X.X): <description>"
git tag vX.X.X
git push origin main
git push origin vX.X.X
```
GitHub Actions will automatically trigger, build `DailyTrade.apk`, and attach it to the release.

## 5. Tone & Brand Guidelines
- In-app changelog and notification text must remain **strictly formal and professional** (no informal slang like "cheesy", no regionalisms in notification copy).
- Support link "Buy Me A Chai 🍵 / Donate" (`https://buymeachai.ezee.li/luxie47`) is strictly preserved in app UI and README.
