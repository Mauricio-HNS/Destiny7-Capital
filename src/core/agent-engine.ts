import { Decision, MarketTick, Side } from './types';
import { MarketFeatures, SignalEngine } from './signal-engine';
import { LearningEngine } from './learning-engine';
import { AgentEconomy } from './agent-economy';

export type AgentRole = 'QUANT' | 'MOMENTUM' | 'MEAN_REVERSION' | 'MACRO' | 'FLOW' | 'VOLATILITY' | 'RESEARCH' | 'PORTFOLIO' | 'EXECUTION' | 'RISK';

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
const ROLES: AgentRole[] = ['QUANT', 'MOMENTUM', 'MEAN_REVERSION', 'MACRO', 'FLOW', 'VOLATILITY', 'RESEARCH', 'PORTFOLIO', 'EXECUTION', 'RISK'];

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function hash(value: string) { let h = 2166136261; for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h >>> 0); }

export class AgentEngine {
  readonly agents: AgentProfile[];
  readonly signals = new SignalEngine();
  readonly learning: LearningEngine;
  readonly economy: AgentEconomy;

  constructor(count = 50) {
    this.agents = Array.from({ length: count }, (_, index) => {
      const role = ROLES[index % ROLES.length];
      return { id: `agent-${String(index + 1).padStart(2, '0')}`, name: `${role.replace('_', ' ')} ${String(index + 1).padStart(2, '0')}`, role, riskWeight: 0.65 + ((index * 17) % 36) / 100, confidenceBias: ((hash(`${role}:${index}`) % 21) - 10) / 100 };
    });
    this.learning = new LearningEngine(this.agents);
    this.economy = new AgentEconomy(this.agents.map((agent) => agent.id));
  }

  signal(agent: AgentProfile, ticks: MarketTick[]): AgentSignal {
    const latest = ticks[ticks.length - 1];
    const features = this.signals.features(ticks) as MarketFeatures;
    this.economy.chargeThought(agent.id);
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
    const learningWeight = this.learning.weight(agent.id);
    const strength = clamp((raw + noise) * (0.9 + learningWeight * 0.1), -1, 1);
    const confidence = clamp(0.55 + Math.abs(strength) * 0.4 + agent.confidenceBias + (learningWeight - 1) * 0.06, 0.1, 0.99);
    const side: Side | 'HOLD' = strength > 0.16 ? 'BUY' : strength < -0.16 ? 'SELL' : 'HOLD';

    return { agentId: agent.id, role: agent.role, symbol: latest.symbol, side, strength, confidence, reason: `${agent.role}: ${features.regime} regime, momentum ${(features.momentum * 100).toFixed(2)}%, volatility ${(features.volatility * 100).toFixed(2)}%.`, timestamp: latest.timestamp };
  }

  decide(symbol: string, ticks: MarketTick[], now = Date.now()): Decision | null {
    const relevant = ticks.filter((tick) => tick.symbol === symbol).slice(-20);
    if (relevant.length < 2) return null;
    const signals = this.agents
      .filter((agent) => this.economy.get(agent.id)?.alive)
      .map((agent) => this.signal(agent, relevant));
    const active = signals.filter((signal) => signal.side !== 'HOLD' && this.economy.get(signal.agentId)?.alive);
    if (!active.length) return null;
    const score = (side: Side) => active.filter((signal) => signal.side === side).reduce((sum, signal) => sum + signal.confidence * Math.abs(signal.strength) * this.learning.weight(signal.agentId), 0);
    const buyScore = score('BUY');
    const sellScore = score('SELL');
    const total = buyScore + sellScore;
    const side: Side = buyScore >= sellScore ? 'BUY' : 'SELL';
    const confidence = total ? Math.max(buyScore, sellScore) / total : 0;
    const supporters = active.filter((signal) => signal.side === side).sort((a, b) => (b.confidence * this.learning.weight(b.agentId)) - (a.confidence * this.learning.weight(a.agentId))).slice(0, 12);
    if (confidence < 0.58 || supporters.length < 4) return null;
    for (const supporter of supporters) this.economy.chargeDecision(supporter.agentId);
    return { id: `decision-${now}-${symbol}`, agentIds: supporters.map((signal) => signal.agentId), symbol, side, quantity: 1, confidence, reason: `${supporters.length} agents reached ${side} consensus; weighted confidence ${(confidence * 100).toFixed(1)}%.`, state: 'APPROVE', approved: false, createdAt: now };
  }

  replicate(parentId: string): AgentProfile | null {
    const child = this.economy.reproduce(parentId);
    if (!child) return null;
    const parent = this.agents.find((agent) => agent.id === parentId) ?? this.agents[0];
    const role = parent.role;
    const profile: AgentProfile = {
      id: child.agentId,
      name: `${role.replace('_', ' ')} ${child.agentId.slice(-2)}`,
      role,
      riskWeight: clamp(parent.riskWeight + (hash(child.agentId) % 11 - 5) / 100, 0.5, 1.2),
      confidenceBias: clamp(parent.confidenceBias + (hash(`${child.agentId}:bias`) % 11 - 5) / 100, -0.2, 0.2),
    };
    this.agents.push(profile);
    return profile;
  }

  symbols() { return SYMBOLS; }
}
