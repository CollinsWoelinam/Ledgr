# Changelog

## [Unreleased]

## [0.2.0] - 2026-10-27
First release for testers.
- Signed with Ledgr's own upload key, for phones with 32-bit and 64-bit processors; the build number follows the version.
- Only the permissions Ledgr uses: storage access, drawing over other apps, push messaging and launcher badges are removed.
- Opts out of Android's automatic backup to Google, so Ledgr's data stays on the phone (versions before 0.2.0 were backed up).
- Settings › Send feedback, and an install guide for testers (docs/install.md).
- Fields near the bottom of a page stay above the keyboard.
- README with screenshots, and feature, architecture, privacy and development guides.
- Balance gaps name a likely cause: an airtime notice with no MoMo receipt, or a round amount plus the wallet's own charges. Ignored gaps can be restored.
- Budget alerts at 80% and 100% (US-10), also while Ledgr is closed; a weekly summary on Sunday evenings (US-15).
- Manual entry (US-09): a Cash wallet whose spending re-sorts cash withdrawals instead of adding to them; MoMo entries for movements with no SMS, replaced if the SMS arrives later; edit and delete.
- Business and personal tags (US-14), with counterparty memory, an Activity filter and an Insights split.
- Export (US-13): CSV for spreadsheets and a PDF statement, shared through the phone's share menu; never includes SMS text.
- Confirmations use Ledgr's own bottom sheet instead of the system dialog.
- Project scaffold from PRD.
- Parser: template engine with `{amount}`/`{cur}` macros, date parsing, reversal links, field-accuracy gate.
- Mobile app: all MVP screens on demo data, redesigned (Space Grotesk + Inter, dark-green hero cards, floating tab bar).
- Budgets show pace against the month and a daily allowance; the detail screen highlights what was read from the SMS.
- Demo transactions carry the SMS they came from, verified to round-trip through the parser.
- ESLint (eslint-config-expo); single pinned React version.
- Encrypted local database: expo-sqlite + SQLCipher, random key in Android Keystore, versioned migrations; ledger writes through so changes survive restarts. Repository tests run against real SQLite (node:sqlite).
- Real SMS: Kotlin inbox reader and live sync; real MTN/Telecel templates with anonymized fixtures. Verified on a Galaxy A32 release build: live capture, encrypted database, 1.0–1.5 s cold start.
- App lock (US-08): fingerprint or phone screen lock, re-locks after a chosen time away; wallet filter; Ledgr logo and icons; Cash withdrawals and Bank transfers categories.
- Balance gaps: each wallet's reported balances are reconciled against its transactions; unexplained changes are flagged for review, to record (as spending or money in) or ignore.
