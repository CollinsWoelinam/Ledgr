import { normalize } from './normalize';
import { isValid } from './validate';
import type { ParseResult, Provider, RawSms, Template } from './types';

export interface EngineConfig {
  providers: Provider[];
  templates: Template[]; // most specific first, per provider
}

// Steps 2–6 of the parsing pipeline. Dedupe and categorization happen in the app.
export function parseSms(sms: RawSms, config: EngineConfig): ParseResult {
  const provider = config.providers.find((p) => p.senderIds.includes(sms.sender));
  if (!provider) return { ok: false, reason: 'unknown_sender' };

  const body = normalize(sms.body);
  for (const template of config.templates.filter((t) => t.provider === provider.id)) {
    const match = new RegExp(template.pattern).exec(body);
    if (!match?.groups) continue;
    // TODO: map named groups → ParsedTransaction (amounts via toMinorUnits, dates via template.date_format)
    const transaction = mapGroups(match.groups, template, provider, sms);
    return isValid(transaction) ? { ok: true, transaction } : { ok: false, reason: 'invalid' };
  }
  return { ok: false, reason: 'no_template_match' };
}

declare function mapGroups(
  groups: Record<string, string>,
  template: Template,
  provider: Provider,
  sms: RawSms,
): import('./types').ParsedTransaction;
