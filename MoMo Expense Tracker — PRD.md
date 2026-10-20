# Ledgr — Product Requirements Document

Oct 20, 2026 · @I want to build a quotes generator that fetches quotes from dive

## Overview

The app turns mobile money SMS alerts into an automatic, categorized spending record, so users see where their money goes without typing a single transaction.

**Name:** Ledgr, a mobile money expense tracker

**Platform:** Android first (SMS read access is not available to third-party apps on iOS). iOS can follow later with manual entry and statement import.

**Problem.** Mobile money users get an SMS for every send, receive, payment, cash-out and airtime purchase, but those messages pile up unread. Existing budgeting apps assume bank feeds or manual entry, so mobile money spending stays invisible. Manual tracking fails within weeks because it is tedious.

**Solution.** The app reads incoming transaction SMS from known mobile money senders, parses amount, fee, counterparty, balance and reference, assigns a category, and updates budgets and charts. Everything works offline on the device first, with optional encrypted cloud backup.

**Vision.** A private, zero-effort money diary for people whose financial life runs on their phone. The parsing engine is provider-agnostic, so new networks or countries are added as configuration, not code.

## Goals, non-goals and success metrics

The MVP succeeds if it captures at least 95% of mobile money transactions automatically and users keep it installed past 30 days.

**Goals**

- Capture transactions from SMS automatically, including past messages on first launch.
- Categorize spending with minimal user correction, and learn from corrections.
- Show clear budgets, trends and monthly summaries.
- Work fully offline; data stays on the device unless the user turns on backup.
- Demonstrate production-grade engineering for a portfolio: tests, CI/CD, crash reporting, documented architecture.

**Non-goals (v1)**

- Moving money or initiating payments. The app is read-only.
- Bank account aggregation or open-banking feeds.
- Investment, credit scoring or lending features.
- Shared or family budgets.

**Success metrics**

| Metric | Target |
| --- | --- |
| Parser accuracy on the test SMS corpus | ≥ 98% fields correct |
| Auto-capture rate (transactions found vs. SMS received) | ≥ 95% |
| Auto-categorization accepted without edit | ≥ 80% after 2 weeks of use |
| Cold start to dashboard | < 1.5 s on a mid-range Android phone |
| Initial import of 2,000 SMS | < 10 s |
| Crash-free sessions | ≥ 99.5% |
| 30-day retention (beta testers) | ≥ 40% |

## Target users and personas

The primary user is a young working adult who earns and spends mostly through mobile money and has no clear picture of monthly outflows.

| Persona | Context | Main need | What would make them quit |
| --- | --- | --- | --- |
| Ama, 26, salaried professional | Salary lands in the bank, moves to mobile money for daily spending | See monthly spending by category and stop running out before payday | Having to enter anything manually |
| Kofi, 21, university student | Receives allowance by mobile money, spends in small amounts | Stay within a weekly limit, track airtime and data spend | Complex setup or a heavy app on a low-storage phone |
| Esi, 34, small trader | Receives customer payments and pays suppliers on one wallet | Separate business and personal flows, see daily inflow | Mislabeled transactions she has to fix one by one |

Persona names are illustrative; replace them with real beta testers once you recruit them.

## User stories

Stories are grouped by priority: P0 ships in the MVP, P1 in v1.1, P2 later.

| ID | As a user, I want to… | So that… | Priority |
| --- | --- | --- | --- |
| US-01 | grant SMS permission once and have past transactions imported | I see my history from day one | P0 |
| US-02 | have new transactions appear within seconds of the SMS | the app is always current | P0 |
| US-03 | see each transaction's amount, fee, counterparty and balance | I understand every movement | P0 |
| US-04 | have transactions categorized automatically | I don't label everything by hand | P0 |
| US-05 | correct a category and have similar future transactions follow | the app gets smarter | P0 |
| US-06 | set a monthly budget per category | I know when I'm overspending | P0 |
| US-07 | see a dashboard of this month's spend vs. budget | I get the picture in one glance | P0 |
| US-08 | lock the app with PIN or fingerprint | my financial data stays private | P0 |
| US-09 | add a cash transaction manually | my record is complete | P1 |
| US-10 | get an alert at 80% and 100% of a budget | I can adjust before it's too late | P1 |
| US-11 | see trends across months and top counterparties | I spot patterns | P1 |
| US-12 | back up to the cloud encrypted and restore on a new phone | I never lose my history | P1 |
| US-13 | export transactions to CSV or PDF | I can share or analyze them | P1 |
| US-14 | tag transactions as business or personal | traders can separate flows | P2 |
| US-15 | get a weekly summary notification | I stay aware without opening the app | P2 |

## Functional requirements

The app has six feature areas; the SMS engine is the core and everything else reads from its output.

### 1. Onboarding and permissions

- FR-1.1 Explain clearly, before the system prompt, why SMS access is needed and that messages never leave the device.
- FR-1.2 Request READ\_SMS and RECEIVE\_SMS; if denied, fall back to manual entry and offer to ask again later.
- FR-1.3 Let the user choose which providers (senders) to track.
- FR-1.4 Run the historical import with a progress indicator, then show a "we found N transactions" summary.

### 2. SMS capture and parsing

- FR-2.1 Read only messages from an allowlist of known provider sender IDs; ignore everything else.
- FR-2.2 Parse type (sent, received, payment, cash-out, cash-in, airtime/data, reversal), amount, fee, tax/levy, counterparty name and number, new balance, transaction ID and timestamp.
- FR-2.3 Deduplicate by transaction ID, falling back to a hash of amount + time + counterparty.
- FR-2.4 Handle reversals by linking them to the original transaction.
- FR-2.5 Store unparseable provider messages in a "needs review" queue instead of dropping them.
- FR-2.6 Parsing templates live in versioned config files, so new formats ship without a full app release.

### 3. Categorization

- FR-3.1 Default categories: Food, Transport, Airtime & Data, Bills & Utilities, Shopping, Transfers to People, Income, Fees, Savings, Other.
- FR-3.2 Rule order: user rules → counterparty memory → keyword rules → type-based default.
- FR-3.3 When the user re-categorizes, offer "apply to all from this counterparty" and save it as a rule.
- FR-3.4 Users can create, rename, recolor and delete categories.

### 4. Budgets and alerts

- FR-4.1 Monthly budget per category, plus an optional overall budget.
- FR-4.2 Configurable month start day (for example, payday on the 25th).
- FR-4.3 Local notifications at 80% and 100% of a budget.

### 5. Insights and reporting

- FR-5.1 Dashboard: month total out and in, fees paid, current balance, budget progress bars.
- FR-5.2 Charts: spending by category (donut), daily spend (bars), month-over-month trend (line).
- FR-5.3 Transaction list with search, filters (date, category, type, amount) and infinite scroll.
- FR-5.4 Top counterparties and "total fees paid this month".
- FR-5.5 Export to CSV and PDF.

### 6. Security, backup and settings

- FR-6.1 Biometric or PIN lock, with auto-lock after a configurable idle time.
- FR-6.2 Optional cloud backup, encrypted on-device before upload.
- FR-6.3 Delete all data from settings in one action.
- FR-6.4 Light and dark themes; currency set by the user.

## Non-functional requirements

Privacy is the product's main promise: raw SMS text never leaves the phone.

| Area | Requirement |
| --- | --- |
| Privacy | Raw SMS is parsed on-device and never uploaded. Only structured transactions go to backup, and only if the user opts in. No ads or third-party analytics SDKs that read financial data. |
| Security | Local database encrypted (SQLCipher); keys in Android Keystore. Backups encrypted client-side (AES-256-GCM) with a key derived from a user passphrase. TLS for all network calls. |
| Offline | Every feature except backup works with no connection. Sync queues changes and retries with backoff. |
| Performance | Cold start < 1.5 s; list scroll at 60 fps with 10,000 transactions; new SMS processed < 2 s. |
| Battery and size | No polling: use the SMS broadcast receiver plus WorkManager for sync. APK < 25 MB. |
| Compatibility | Android 8.0 (API 26) and up; works on 2 GB RAM phones. |
| Accessibility | Screen-reader labels on all controls, 4.5:1 contrast, dynamic font sizes. |
| Reliability | Crash-free sessions ≥ 99.5%; schema migrations tested in CI. |
| Compliance | Google Play's SMS permission policy requires a declaration form; budgeting is not a default-handler use case, so plan for possible rejection (see Risks). Publish a privacy policy. |

## Technical architecture

The app is offline-first: SMS flows through an on-device pipeline into an encrypted local database, and a cloud backend exists only for optional encrypted backup.

&#91;embedded content: system architecture · on-device pipeline + optional backup\]

The parser is the highlighted component because it carries most of the engineering risk and most of the interview story.

### Recommended stack

| Layer | Recommended | Alternative |
| --- | --- | --- |
| App | React Native + TypeScript (Expo with a dev build) | Kotlin + Jetpack Compose |
| SMS access | Custom native module in Kotlin (BroadcastReceiver + SMS content provider) | Native only |
| Local database | SQLite via op-sqlite or WatermelonDB, encrypted with SQLCipher | Room + SQLCipher |
| State | Zustand + TanStack Query | Kotlin Flow + ViewModel |
| Charts | Victory Native or react-native-skia | Vico |
| Background work | Android WorkManager via native module | WorkManager |
| Backend (v1.1) | Node.js (NestJS or Fastify) + PostgreSQL, deployed on Fly.io or Railway | Supabase |
| Auth (backup only) | Email magic link or Google sign-in | Firebase Auth |
| Testing | Jest (parser unit tests), Detox or Maestro (end-to-end) | JUnit + Espresso |
| CI/CD | GitHub Actions: lint, test, build signed APK, publish release | Bitrise |
| Monitoring | Sentry (crashes + performance), scrubbed of financial data | Firebase Crashlytics |

The React Native + Kotlin module combination shows both cross-platform and native skills, which is a strong portfolio signal.

### Data model

| Table | Key fields |
| --- | --- |
| transactions | id, provider, external\_ref, type, direction (in/out), amount\_minor, fee\_minor, tax\_minor, currency, counterparty\_name, counterparty\_number, balance\_after\_minor, occurred\_at, category\_id, source (sms/manual), linked\_reversal\_id, created\_at, updated\_at |
| categories | id, name, icon, color, kind (expense/income), is\_default |
| category\_rules | id, match\_type (counterparty/keyword/type), pattern, category\_id, priority, created\_by (user/system) |
| budgets | id, category\_id (null = overall), amount\_minor, period\_start\_day |
| review\_queue | id, sender, body\_hash, received\_at, status |
| parser\_templates | id, provider, version, type, pattern, field\_map |
| sync\_state | table\_name, last\_synced\_at, pending\_changes |

Store money as integer minor units (pesewas, cents), never floats. Keep the raw SMS body only in the review queue, and only until the user resolves it.

### SMS parsing engine

Each provider has versioned templates; the engine tries them in order and returns a typed result or sends the message to review.

1. Receive the SMS (live broadcast, or a content-provider scan on first launch and on app open).
2. Check the sender against the provider allowlist; drop anything else.
3. Normalize: trim whitespace, unify currency symbols and thousand separators.
4. Match against the provider's templates (named-group regexes), most specific first.
5. Map named groups to fields, convert amounts to minor units, parse dates with the provider's format.
6. Validate: amount > 0, balance consistent with the previous transaction where possible.
7. Deduplicate on external\_ref, then on a hash of amount + time + counterparty.
8. Categorize, save, update budgets, fire alerts.

Template example (illustrative; build real ones from collected samples):

```json
{
  "provider": "mtn_momo",
  "version": 3,
  "type": "transfer_out",
  "pattern": "Payment made for (?<currency>[A-Z]{3}) ?(?<amount>[\\d,.]+) to (?<name>.+?)\\. .*Fee was (?<fee_currency>[A-Z]{3}) ?(?<fee>[\\d,.]+).*balance: (?<balance_currency>[A-Z]{3}) ?(?<balance>[\\d,.]+).*Transaction Id: (?<ref>\\d+)",
  "date_format": "yyyy-MM-dd HH:mm:ss"
}
```

Cover the parser with a fixture corpus: every real (anonymized) SMS sample becomes a test case with its expected output. This test suite is the strongest evidence of quality in the whole project.

## Screens and UX flows

The MVP has nine screens, reached through a four-tab bottom bar: Home, Transactions, Budgets, Settings.

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Welcome and privacy | Earn trust before asking for SMS access | 3 short slides, "your SMS never leaves this phone" |
| Permission and provider pick | Grant access, choose networks to track | Permission rationale, provider checkboxes |
| Import progress | Historical scan | Progress bar, count found, skip option |
| Home dashboard | Month at a glance | Spent vs. income, balance, fees, budget bars, recent 5 transactions |
| Transactions | Browse and search | Search, filter chips, grouped by day, needs-review badge |
| Transaction detail | Inspect and correct | All parsed fields, category picker, "apply to all", original SMS (local only) |
| Budgets | Plan and track | Per-category limits, progress, edit sheet |
| Insights | Patterns | Category donut, daily bars, monthly trend, top counterparties |
| Settings | Control | Lock, backup, categories, month start, export, delete all data |

**Core flow, first run:** Welcome → privacy promise → permission → pick providers → import → dashboard with a prompt to set the first budget.

**Core flow, daily:** SMS arrives → parsed in background → optional notification "GHS 45.00 to Kwame — Food?" with quick-confirm actions → dashboard updated.

**Design notes:** design in Figma first and include the file link in your README. Use skeleton loaders, empty states with a clear next action, and haptic feedback on category confirm.

## Milestones and build plan

At a part-time pace of 15 to 20 hours a week, the P0 MVP takes about ten weeks; v1.1 (backup, export, cash entries) follows in three to four more.

&#91;embedded content: build plan · 4 phases, 2 gates, part-time pace\]

Don't start the UI until the parser passes its accuracy gate: a beautiful app with a broken parser is worthless.

**MVP definition of done**

- [ ] All P0 user stories work on a real phone with real SMS
- [ ] Parser test suite green in CI, with 50+ samples per supported provider
- [ ] Signed APK published through GitHub Releases from CI
- [ ] Demo mode with seeded data and a 60-second demo video
- [ ] README with architecture diagram, trade-offs and setup steps
- [ ] At least 5 beta testers using it for two weeks

## Risks, open questions and portfolio presentation

The biggest risk is Google Play rejecting the SMS permission, so plan distribution beyond Play from the start.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Play Store rejects READ\_SMS for a non-default-handler app | Can't publish on Play | Distribute the APK via GitHub Releases or a landing page; offer a Play build that uses SMS share-to-app and manual entry |
| Providers change SMS wording | Parsing breaks silently | Remote-updatable templates, needs-review queue, parser tests on a real SMS corpus, alert when unparsed rate rises |
| Users distrust SMS access | Low install-to-grant rate | Privacy-first onboarding, open-source the parser, no network calls without backup on |
| Device diversity (OEM SMS apps, dual SIM) | Missed messages | Test on 3+ brands, read SMS content provider on app open to catch missed broadcasts |
| Scope creep | Never finishing | Ship MVP P0 only, then iterate |

**Open questions**

- [ ] Which providers and SMS formats go in v1? Collect 50+ real (anonymized) samples per provider.
- [ ] React Native or native Kotlin? (See architecture.)
- [ ] Is a backend needed for v1, or can backup ship in v1.1?
- [ ] Visual identity for Ledgr (logo, colors, app icon).

**How to present it in your portfolio**

- README with the problem, a 60-second demo video, screenshots, the architecture diagram and key trade-offs (why on-device parsing, why offline-first).
- A downloadable APK plus a demo mode with seeded fake data, so recruiters on iPhone can watch the video and Android users can try it without real SMS.
- A short write-up or blog post on building the parser and handling format drift: this is the story interviewers will ask about.
- Visible engineering signals: CI badge, test coverage, Sentry release health, a CHANGELOG, tagged releases.
- Real usage numbers from beta testers (installs, transactions parsed, retention) if you can get them.
