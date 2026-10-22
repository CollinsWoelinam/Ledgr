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
