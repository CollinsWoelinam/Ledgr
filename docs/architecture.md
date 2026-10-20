# Architecture

```
SMS (broadcast / inbox scan)
  → modules/ledgr-sms (Kotlin)        sender allowlist, hand body to JS
  → @ledgr/parser                     normalize → match template → map → validate
  → features/sms/pipeline             dedupe → categorize → save → budgets → alerts
  → db (SQLCipher)                    single source of truth for the UI
  → [optional] backup (AES-256-GCM)   → services/backup-api
```

Unparseable messages from known senders go to `review_queue`, never dropped.
Money is stored as integer minor units.
