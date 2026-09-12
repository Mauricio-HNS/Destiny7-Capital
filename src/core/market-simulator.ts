import {MarketTick} from './types';

export class MarketSimulator {
  private prices: Record<string, number> = {NVDA: 140, MSFT: 500, AAPL: 240, BTC: 105000, SPX: 6500};
  private previous: Record<string, number> = {...this.prices};
  private step = 0;

  tick(symbol: string): MarketTick {
    const current = this.prices[symbol] ?? 100;
    this.previous[symbol] = current;
    this.step += 1;
    const wave = Math.sin(this.step * 0.37 + symbol.length) * 0.0025;
    const drift = Math.sin(this.step * 0.071) * 0.001;
    const noise = ((this.hash(symbol + this.step) % 1000) / 1000 - 0.5) * 0.003;
    const next = Math.max(0.01, current * (1 + wave + drift + noise));
    this.prices[symbol] = next;
    return {symbol, price: next, previousPrice: current, timestamp: Date.now(), volume: Math.round(1000 + Math.abs(noise) * 250000)};
  }

  snapshot(): Record<string, number> { return {...this.prices}; }

  private hash(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  }
}
