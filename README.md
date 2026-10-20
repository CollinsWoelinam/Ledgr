# Ledgr

Ledgr turns mobile money SMS alerts into an automatic, categorized spending record. It is offline-first, Android-first, and SMS never leaves the device.

See [the PRD](./MoMo%20Expense%20Tracker%20—%20PRD.md) and [docs/architecture.md](docs/architecture.md).

## Repository layout

```
apps/mobile/            React Native (Expo dev build) app
  src/app/              Screens (expo-router): onboarding flow + 4 tabs
  src/features/         Feature logic: sms, categorization, budgets, insights, security, backup, export
  src/db/               Encrypted SQLite schema, migrations, repositories
  src/state/            Zustand stores
  src/ui/               Shared components and theme
  modules/ledgr-sms/    Kotlin native module: SMS BroadcastReceiver + inbox scan
  e2e/                  Maestro flows
packages/parser/        Provider-agnostic SMS parsing engine (pure TS, no RN deps)
  templates/            Versioned per-provider templates (JSON)
  fixtures/             Anonymized SMS corpus → expected output (the test suite)
services/backup-api/    v1.1: encrypted backup backend (Fastify + PostgreSQL)
docs/                   Architecture, decisions (ADRs), privacy policy
.github/workflows/      CI (lint, test, typecheck) and release (signed APK)
```

## Build order

1. `packages/parser` until it passes the accuracy gate (≥ 98% fields correct).
2. `modules/ledgr-sms` + import pipeline.
3. Database, categorization, budgets.
4. UI.
