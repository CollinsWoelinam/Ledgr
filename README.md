# Ledgr

Ledgr turns mobile money SMS alerts into an automatic, categorized spending record. It is offline-first, Android-first, and SMS never leaves the device.

See [the PRD](./MoMo%20Expense%20Tracker%20—%20PRD.md) and [docs/architecture.md](docs/architecture.md).

## Repository layout

```
apps/mobile/            React Native (Expo dev build) app
  src/app/              Screens (expo-router): onboarding flow + 5 tabs, transaction detail, review, categories
  src/features/         Feature logic: sms, categorization, budgets, insights, security, backup, export
  src/db/               SQLite schema and migrations (encrypted storage not wired up yet)
  src/state/            Zustand stores
  src/ui/               Theme, shared components, floating tab bar
  src/demo/             Seeded demo data, including the SMS each transaction came from
  modules/ledgr-sms/    Kotlin native module: SMS BroadcastReceiver + inbox scan
  e2e/                  Maestro flows
packages/parser/        Provider-agnostic SMS parsing engine (pure TS, no RN deps)
  templates/            Versioned per-provider templates (JSON)
  fixtures/             Anonymized SMS corpus → expected output (the test suite)
services/backup-api/    v1.1: encrypted backup backend (Fastify + PostgreSQL)
docs/                   Architecture, decisions (ADRs), privacy policy
.github/workflows/      CI (lint, test, typecheck) and release (signed APK)
```

## Running it

```sh
npm install
npm test               # parser + app unit tests
npm run typecheck
npm run lint

cd apps/mobile
npx expo start --go    # open in Expo Go on an Android device or emulator
```

The app runs on demo data in Expo Go. Reading real SMS needs the Kotlin module and a dev build (`npx expo run:android`).

## Status

| Area | State |
| --- | --- |
| Parser | Engine, tests and accuracy gate done; MTN templates are synthetic until real samples are collected |
| Screens | All MVP screens built to the redesign, on in-memory demo data |
| Categorization, budgets, insights | Logic done and tested |
| SMS reading (Kotlin) | Not started |
| Encrypted database | Not started; ledger lives in memory |
| App lock, export, backup | Not started (shown as "coming soon") |

## Build order

1. `packages/parser` until it passes the accuracy gate (≥ 98% fields correct).
2. `modules/ledgr-sms` + import pipeline.
3. Database, categorization, budgets.
4. UI.
