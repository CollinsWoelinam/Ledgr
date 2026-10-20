# 0001: React Native + Kotlin native module

Status: Proposed (open question in the PRD)

## Context
SMS access is Android-only and needs native code. The app UI should be cross-platform-ready for a later iOS version (manual entry and statement import).

## Decision
Expo dev build + TypeScript for the app, with a custom Kotlin module for SMS and WorkManager.

## Consequences
The parser stays pure TypeScript and testable with Jest. The native surface is small and isolated in `apps/mobile/modules/ledgr-sms`.
