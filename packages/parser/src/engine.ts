import { parseDate } from './date';
import { toMinorUnits } from './money';
import { normalize } from './normalize';
import { isValid } from './validate';
import type { Direction, Evidence, ParseResult, ParsedTransaction, Provider, RawSms, Template, TransactionType } from './types';

export interface EngineConfig {
  providers: Provider[];
  templates: Template[]; // tried in order within a provider: most specific first
}

const MACROS: Record<string, string> = {
  // Commas only as thousands separators, so "GHS9.99,Tax" stops at the amount.
  '{amount}': '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?',
  '{cur}': '[A-Z]{3}',
};

const DEFAULT_DIRECTION: Record<TransactionType, Direction> = {
  transfer_out: 'out',
  payment: 'out',
  cash_out: 'out',
  airtime_data: 'out',
  transfer_in: 'in',
  cash_in: 'in',
  reversal: 'in',
};

const compiled = new WeakMap<Template, RegExp>();

function expandMacros(pattern: string): string {
  return Object.entries(MACROS).reduce((s, [macro, value]) => s.split(macro).join(value), pattern);
}

export function compileTemplate(template: Template): RegExp {
  let re = compiled.get(template);
  if (!re) {
    const source = expandMacros(template.pattern);
    re = new RegExp(source, 'i');
    compiled.set(template, re);
  }
  return re;
}

export function findProvider(sender: string, providers: Provider[]): Provider | undefined {
  const s = sender.trim().toLowerCase();
  return providers.find((p) => p.senderIds.some((id) => id.toLowerCase() === s));
}

// Steps 2–6 of the parsing pipeline. Dedupe and categorization happen in the app.
export function parseSms(sms: RawSms, config: EngineConfig): ParseResult {
  const provider = findProvider(sms.sender, config.providers);
  if (!provider) return { ok: false, reason: 'unknown_sender' };

  const body = normalize(sms.body);
  for (const template of config.templates) {
    if (template.provider !== provider.id) continue;
    const groups = compileTemplate(template).exec(body)?.groups;
    if (!groups) continue;
    const transaction = mapGroups(groups, template, provider, sms);
    return isValid(transaction) ? { ok: true, transaction } : { ok: false, reason: 'invalid' };
  }
  const evidence = findEvidence(body, provider, sms.receivedAt);
  if (evidence) return { ok: false, reason: 'ignored', evidence };
  if (provider.failed?.some((pattern) => compilePattern(pattern).test(body))) return { ok: false, reason: 'ignored' };
  // Otherwise a message carrying a transaction ID is never ignored: if no template knows it, a person should see it.
  const looksLikeTransaction = TRANSACTION_ID.test(body);
  if (!looksLikeTransaction && provider.ignore?.some((pattern) => compilePattern(pattern).test(body))) return { ok: false, reason: 'ignored' };
  return { ok: false, reason: 'no_template_match' };
}

const TRANSACTION_ID = /Transaction I[dD]:? ?\d{6,}/;

const ignoreCache = new Map<string, RegExp>();

function compilePattern(pattern: string): RegExp {
  let re = ignoreCache.get(pattern);
  if (!re) {
    re = new RegExp(pattern, 'i');
    ignoreCache.set(pattern, re);
  }
  return re;
}

function mapGroups(groups: Record<string, string | undefined>, template: Template, provider: Provider, sms: RawSms): ParsedTransaction {
  const money = (key: string) => (groups[key] ? toMinorUnits(groups[key]) : undefined);
  const text = (key: string) => groups[key]?.trim() || undefined;
  const occurredAt = groups.date && template.date_format ? parseDate(groups.date, template.date_format) : sms.receivedAt;

  return {
    provider: provider.id,
    templateVersion: template.version,
    type: template.type,
    direction: template.direction ?? DEFAULT_DIRECTION[template.type],
    amountMinor: money('amount') ?? NaN,
    feeMinor: money('fee') ?? 0,
    taxMinor: money('tax') ?? 0,
    currency: groups.currency?.toUpperCase() ?? provider.currency,
    counterpartyName: text('name') ?? template.counterparty,
    counterpartyNumber: text('number'),
    balanceAfterMinor: money('balance'),
    externalRef: text('ref'),
    reversesRef: text('original_ref'),
    occurredAt,
  };
}

function findEvidence(body: string, provider: Provider, at: number): Evidence | undefined {
  for (const rule of provider.evidence ?? []) {
    const m = compilePattern(expandMacros(rule.pattern)).exec(body);
    if (!m) continue;
    const money = (v?: string) => (v ? toMinorUnits(v) : undefined);
    return { provider: provider.id, kind: rule.kind, amountMinor: money(m.groups?.amount), at };
  }
  return undefined;
}
