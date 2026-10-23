# Changelog

## [Unreleased]
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
