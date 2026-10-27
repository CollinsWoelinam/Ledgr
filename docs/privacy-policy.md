<img src="assets/logo.svg" width="56" height="56" alt="Ledgr">

# Privacy policy

*Draft · last updated 27 October 2026*

Ledgr keeps a record of your mobile money from the SMS your wallets send you. It does this entirely on your phone. There is no Ledgr account and no Ledgr server, and nothing you put into Ledgr is sent to us or anyone else.

## What Ledgr reads

- **SMS from your wallets only.** Ledgr asks Android for messages from the wallet sender IDs it supports (`MobileMoney` for MTN MoMo, `T-CASH` for Telecel Cash). Messages from anyone else are never read, stored or processed.
- From each wallet message it takes the transaction details: type, amount, fee, e-levy, the other party's name and number, your new balance, the transaction ID and the time. It also keeps the message text, on the phone, so you can see where a transaction came from.
- From wallet messages that aren't transactions it may keep a few facts that help explain balance changes: the amount and time of an airtime top-up notice, and the **time** of a wallet sign-in. Sign-in codes are never kept.

## What you add

Categories, budgets, manual and cash entries, notes like "business", and your settings.

## Where it's kept

Everything is stored in a database on your phone, encrypted with SQLCipher. Its key is generated on the phone and held in Android Keystore. Preferences (such as theme and notification switches) are stored separately and contain no financial data.

## What leaves the phone

Nothing, unless you send it:

- **Exports.** When you export to CSV or PDF, the file goes only where you send it from the share menu. Exports never include SMS text. Ledgr keeps the latest export in its cache until your next one.
- **Notifications** are created on the phone. On a secure lock screen their amounts are hidden.

Ledgr's code makes no network requests, has no analytics, ads or trackers, and doesn't share data with third parties.

## Permissions

| Permission | Why |
| --- | --- |
| Read SMS, receive SMS | To read your wallet messages, including new ones as they arrive. |
| Notifications | Budget alerts and the weekly summary. Optional; Ledgr works without them. |
| Biometrics | App lock, with your fingerprint or the phone's PIN. Optional. |

The app package also declares a few permissions that come with Expo's standard Android template (internet, storage, and display over other apps). Ledgr doesn't use them.

## Your control

- Turn notifications and app lock on or off in Settings.
- Remove a message Ledgr couldn't read from **Needs review** (your SMS inbox is never changed).
- **Delete all data** in Settings erases everything Ledgr stored on the phone. Uninstalling Ledgr does the same.

## Changes

Planned encrypted backup will be optional and encrypted on the phone with a passphrase only you know, before anything is stored elsewhere. This policy will be updated before it's released.

## Contact

Questions about this policy: open an issue at [github.com/CollinsWoelinam/Ledgr](https://github.com/CollinsWoelinam/Ledgr/issues).

---

<sub>[README](../README.md) · [Features](features.md) · [How it works](architecture.md) · [Development](development.md)</sub>
