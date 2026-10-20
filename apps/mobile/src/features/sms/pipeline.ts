import type { RawSms } from '@ledgr/parser';

// Steps 7–8: parse → dedupe → categorize → save → update budgets → fire alerts.
// Failed parses from known senders go to review_queue.
export async function processSms(_sms: RawSms): Promise<void> {
  // TODO
}
