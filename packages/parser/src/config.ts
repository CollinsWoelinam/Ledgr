import providers from '../templates/providers.json';
import mtnMomo from '../templates/mtn_momo.json';
import telecelCash from '../templates/telecel_cash.json';
import atMoney from '../templates/at_money.json';
import type { EngineConfig } from './engine';
import type { Provider, Template } from './types';

// Templates bundled with the app. Remote updates (FR-2.6) overlay these at runtime.
export const bundledConfig: EngineConfig = {
  providers: providers as Provider[],
  templates: [...mtnMomo, ...telecelCash, ...atMoney] as Template[],
};

// Changes whenever a template or ignore rule is added, removed or edited. The app re-reads the inbox when it
// changes, so messages an older parser couldn't read get recorded (and duplicates are skipped).
export function templatesRevision(config: EngineConfig = bundledConfig): string {
  const text = JSON.stringify([config.providers, config.templates]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${config.templates.length}-${(hash >>> 0).toString(36)}`;
}
