# Ledgr

Ledgr turns mobile money SMS alerts into an automatic, categorized spending record. It is offline-first, Android-first, and SMS never leaves the device.

## What it does

- **Reads MTN MoMo and Telecel Cash SMS** on the phone, including your history on first launch, and records each transaction with its fee, e-levy and balance. Messages from any other sender are never read.
- **Accounts for every cedi.** Each wallet's reported balances are reconciled; money that moved without an SMS is flagged, with a likely cause where there is one (an airtime top-up notice, or a round amount plus that wallet's usual charges).
- **Categories** that learn from your corrections, **budgets** per category or overall, and **insights** by month.
- **Notifications**, posted by the phone itself: a budget reaching 80% and 100%, even while Ledgr is closed, and a weekly summary on Sunday evenings.
- **Cash and manual entries.** Recorded cash spending re-sorts your cash withdrawals into real categories instead of counting twice.
- **Business or personal** tags, remembered per counterparty.
- **Export** to CSV or a PDF statement, through the phone's share menu.
- **Private by design**: an encrypted database (SQLCipher, key in Android Keystore), app lock, and nothing uploaded.

See [the PRD](./MoMo%20Expense%20Tracker%20—%20PRD.md) and [docs/architecture.md](docs/architecture.md).

## Repository layout

```
apps/mobile/            React Native (Expo dev build) app
  src/app/              Screens (expo-router): onboarding flow + 5 tabs, transaction detail, review, categories
  src/features/         Feature logic: sms, categorization, budgets, insights, security, backup, export
  src/db/               SQLCipher database: migrations, repositories, Keystore-held key
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

The app runs on demo data in Expo Go, where the database is plain SQLite. Encryption (SQLCipher) and reading real SMS need a dev build (`npx expo run:android`).

## Status

| Area | State |
| --- | --- |
| Parser | MTN MoMo and Telecel Cash templates built from 3,329 real SMS; 151 anonymized fixtures; balance-chain consistency 99.2% (MTN), 95.6% (Telecel) |
| Screens | All MVP screens built to the redesign, running on real SMS data or demo data |
| Categorization, budgets, insights | Logic done and tested |
| SMS reading (Kotlin) | Done: inbox import (US-01) and live sync on launch, foreground and new SMS (US-02); verified on a Galaxy A32 |
| Encrypted database | Done: expo-sqlite with SQLCipher, key in Android Keystore; encrypted file header confirmed on device. Expo Go has no SQLCipher |
| App lock (US-08) | Done: fingerprint with the phone's PIN/pattern as fallback; locks on launch and after 0/1/5 min away; verified on device |
| Budgets and notifications (US-06, US-10, US-15) | Done: 80%/100% alerts, also while Ledgr is closed (a manifest SMS receiver starts a headless JS sync); weekly summary on Sundays |
| Manual entry (US-09) | Done: cash wallet, MoMo entries without an SMS (replaced if the SMS turns up), edit and delete |
| Business tags (US-14) | Done |
| Export (US-13) | Done: CSV and PDF through the share menu |
| Encrypted backup (US-12) | Not started (shown as "coming soon") |
| Performance (release, Galaxy A32) | Cold start to dashboard 1.0–1.5 s with 1,914 transactions; import of 3,329 SMS ≈ 10 s |

## Releasing

Pushing a tag like `v0.2.0` runs `.github/workflows/release.yml`, which builds an APK signed with Ledgr's upload key and attaches it to a GitHub Release. The key is never in the repository: the workflow reads it from four repository secrets (`LEDGR_UPLOAD_KEYSTORE_BASE64`, `LEDGR_UPLOAD_STORE_PASSWORD`, `LEDGR_UPLOAD_KEY_ALIAS`, `LEDGR_UPLOAD_KEY_PASSWORD`) and refuses to publish a debug-signed build. Locally, the same values in `~/.gradle/gradle.properties` (`LEDGR_UPLOAD_STORE_FILE` and the other three) make `npx expo run:android --variant release` use it (see `apps/mobile/plugins/withReleaseSigning.js`).

Keep the keystore and its passwords backed up: updates must be signed with the same key. A phone with a debug-signed Ledgr must uninstall it (losing its local data) before installing a release-signed one.

## Build order

1. `packages/parser` until it passes the accuracy gate (≥ 98% fields correct).
2. `modules/ledgr-sms` + import pipeline.
3. Database, categorization, budgets.
4. UI.
