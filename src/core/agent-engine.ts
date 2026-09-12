import { Decision, MarketTick, Side } from './types';
import { MarketFeatures, SignalEngine } from './signal-engine';

export type AgentRole =
  | 'QUANT'
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'MACRO'
  | 'FLOW'
  | 'VOLATILITY'
  | 'RESEARCH'
  | 'PORTFOLIO'
  | 'EXECUTION'
  | 'RISK';

export interface AgentProfile {
  id: string;
  name: string;
  role: AgentRole;
  riskWeight: number;
  confidenceBias: number;
}

export interface AgentSignal {
  agentId: string;
  role: AgentRole;
  symbol: string;
  side: Side | 'HOLD';
  strength: number;
  confidence: number;
  reason: string;
  timestamp: number;
}

const SYMBOLS = ['NVDA', 'MSFT', 'AAPL', 'BTC', 'SPX'];
const ROLES: AgentRole[] = [
  'QUANT',
  'MOMENTUM',
  'MEAN_REVERSION',
  'MACRO',
  'FLOW',
  'VOLATILITY',
  'RESEARCH',
  'PORTFOLIO',
  'EXECUTION',
  'RISK',
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export class AgentEngine {
  readonly agents: AgentProfile[];
  readonly signals = new SignalEngine();

  constructor(count = 50) {
    this.agents = Array.from({ length: count }, (_, index) => {
      const role = ROLES[index % ROLES.length];
      return {
        id: `agent-${String(index + 1).padStart(2, '0')}`,
        name: `${role.replace('_', ' ')} ${String(index + 1).padStart(2, '0')}`,
        role,
        riskWeight: 0.65 + ((index * 17) % 36) / 100,
        confidenceBias: ((hash(`${role}:${index}`) % 21) - 10) / 100,
      };
    });
  }

  signal(agent: AgentProfile, ticks: MarketTick[]): AgentSignal {
    const latest = ticks[ticks.length - 1];
    const features = this.signals.features(ticks) as MarketFeatures;
    let raw = features.momentum * 0.55 + features.volumePressure * 0.12;

    if (agent.role === 'MOMENTUM') raw = features.momentum * 0.95 + features.volumePressure * 0.2;
    if (agent.role === 'MEAN_REVERSION') raw = features.meanReversion * 0.9 - features.momentum * 0.25;
    if (agent.role === 'FLOW') raw = features.volumePressure * 0.7 + features.momentum * 0.3;
    if (agent.role === 'VOLATILITY') raw = features.volatility > 0.008 ? -features.momentum * 0.45 : features.momentum * 0.2;
    if (agent.role === 'MACRO') raw = latest.symbol === 'SPX' ? features.momentum * 0.8 : features.momentum * 0.35;
    if (agent.role === 'PORTFOLIO') raw = features.momentum * 0.25 + features.meanReversion * 0.35;
    if (agent.role === 'EXECUTION') raw = features.momentum * 0.3 + features.volumePressure * 0.35;
    if (agent.role === 'RISK') raw = features.volatility > 0.008 ? -Math.sign(features.momentum) * 0.3 : features.momentum * 0.2;
    if (agent.role === 'RESEARCH') raw = features.return5 * 18 + features.meanReversion * 0.25;

    const seed = hash(`${agent.id}:${latest.symbol}:${latest.timestamp}`);
    const noise = ((seed % 1000) / 1000 - 0.5) * 0.08;
    const strength = clamp(raw + noise, -1, 1);
    const confidence = clamp(0.55 + Math.abs(strength) * 0.4 + agent.confidenceBias, 0.1, 0.99);
    const side: Side | 'HOLD' = strength > 0.16 ? 'BUY' : strength < -0.16 ? 'SELL' : 'HOLD';

    return {
      agentId: agent.id,
      role: agent.role,
      symbol: latest.symbol,
      side,
      strength,
      confidence,
      reason: `${agent.role}: ${features.regime} regime, momentum ${(features.momentum * 100).toFixed(2)}%, volatility ${(features.volatility * 100).toFixed(2)}%.`,
      timestamp: latest.timestamp,
    };
  }

  decide(symbol: string, ticks: MarketTick[], now = Date.now()): Decision | null {
    const relevant = ticks.filter((tick) => tick.symbol === symbol).slice(-20);
    if (relevant.length < 2) return null;

    const signals = this.agents.map((agent) => this.signal(agent, relevant));
    const active = signals.filter((signal) => signal.side !== 'HOLD');
    if (!active.length) return null;

    const buyScore = active
      .filter((signal) => signal.side === 'BUY')
      .reduce((sum, signal) => sum + signal.confidence * Math.abs(signal.strength), 0);
    const sellScore = active
      .filter((signal) => signal.side === 'SELL')
      .reduce((sum, signal) => sum + signal.confidence * Math.abs(signal.strength), 0);
    const total = buyScore + sellScore;
    const side: Side = buyScore >= sellScore ? 'BUY' : 'SELL';
    const winningScore = Math.max(buyScore, sellScore);
    const confidence = total ? winningScore / total : 0;
    const supporters = active
      .filter((signal) => signal.side === side)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 12);

    if (confidence < 0.58 || supporters.length < 4) return null;

    return {
      id: `decision-${now}-${symbol}`,
      agentIds: supporters.map((signal) => signal.agentId),
      symbol,
      side,
      quantity: 1,
      confidence,
      reason: `${supporters.length} agents reached ${side} consensus; weighted confidence ${(confidence * 100).toFixed(1)}%.`,
      state: 'APPROVE',
      approved: false,
      createdAt: now,
    };
  }

  symbols() {
    return SYMBOLS;
  }
}
