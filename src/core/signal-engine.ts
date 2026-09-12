import { MarketTick } from './types';

export interface MarketFeatures {
  symbol: string;
  price: number;
  return1: number;
  return5: number;
  momentum: number;
  meanReversion: number;
  volatility: number;
  volumePressure: number;
  regime: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export class SignalEngine {
  features(ticks: MarketTick[]): MarketFeatures | null {
    if (!ticks.length) return null;

    const ordered = ticks.slice().sort((a, b) => a.timestamp - b.timestamp);
    const latest = ordered[ordered.length - 1];
    const price = latest.price;
    const at = (lookback: number) => ordered[Math.max(0, ordered.length - 1 - lookback)];
    const returnFrom = (lookback: number) => {
      const base = at(lookback)?.price ?? price;
      return base ? price / base - 1 : 0;
    };

    const return1 = returnFrom(1);
    const return5 = returnFrom(Math.min(5, ordered.length - 1));
    const recent = ordered.slice(-20);
    const returns: number[] = [];
    for (let i = 1; i < recent.length; i += 1) {
      const previous = recent[i - 1].price;
      if (previous > 0) returns.push(recent[i].price / previous - 1);
    }

    const volatility = returns.length
      ? Math.sqrt(returns.reduce((sum, value) => sum + value * value, 0) / returns.length)
      : 0;

    const mean = recent.reduce((sum, tick) => sum + tick.price, 0) / recent.length;
    const meanReversion = mean ? clamp((mean - price) / mean * 20, -1, 1) : 0;
    const momentum = clamp(return5 * 35 + return1 * 15, -1, 1);

    const recentVolume = recent.slice(-Math.min(5, recent.length));
    const averageVolume = recentVolume.reduce((sum, tick) => sum + tick.volume, 0) / recentVolume.length;
    const volumePressure = averageVolume ? clamp((latest.volume / averageVolume - 1) * 2, -1, 1) : 0;

    let regime: MarketFeatures['regime'] = 'NEUTRAL';
    if (volatility > 0.008) regime = 'VOLATILE';
    else if (momentum > 0.22) regime = 'BULLISH';
    else if (momentum < -0.22) regime = 'BEARISH';

    return {
      symbol: latest.symbol,
      price,
      return1,
      return5,
      momentum,
      meanReversion,
      volatility,
      volumePressure,
      regime,
    };
  }
}
