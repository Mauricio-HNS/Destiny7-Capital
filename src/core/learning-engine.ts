import {AgentProfile, AgentRole} from './agent-engine';
import {Side} from './types';

export interface AgentLearningState {
  agentId: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
  score: number;
  weight: number;
  lastUpdated: number;
}

export interface LearningOutcome {
  agentId: string;
  symbol: string;
  side: Side;
  pnl: number;
  timestamp: number;
}

const ROLE_PRIORS: Record<AgentRole, number> = {
  QUANT: 1,
  MOMENTUM: 1,
  MEAN_REVERSION: 1,
  MACRO: 1,
  FLOW: 1,
  VOLATILITY: 1,
  RESEARCH: 1,
  PORTFOLIO: 1,
  EXECUTION: 1,
  RISK: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export class LearningEngine {
  private readonly states = new Map<string, AgentLearningState>();
  private readonly outcomes: LearningOutcome[] = [];

  constructor(agents: AgentProfile[]) {
    for (const agent of agents) {
      this.states.set(agent.id, {
        agentId: agent.id,
        trades: 0,
        wins: 0,
        losses: 0,
        pnl: 0,
        winRate: 0,
        score: ROLE_PRIORS[agent.role],
        weight: 1,
        lastUpdated: Date.now(),
      });
    }
  }

  record(outcome: LearningOutcome) {
    const state = this.states.get(outcome.agentId);
    if (!state) return;

    state.trades += 1;
    state.pnl += outcome.pnl;
    if (outcome.pnl > 0) state.wins += 1;
    if (outcome.pnl < 0) state.losses += 1;
    state.winRate = state.trades ? state.wins / state.trades : 0;

    // Bounded adaptation: learning is deliberately slow and cannot explode a role's influence.
    const normalized = clamp(outcome.pnl / 1000, -1, 1);
    state.score = clamp(state.score * 0.96 + (1 + normalized) * 0.04, 0.5, 1.5);
    state.weight = clamp(0.75 + state.score * 0.35 + (state.winRate - 0.5) * 0.3, 0.5, 1.5);
    state.lastUpdated = outcome.timestamp;

    this.outcomes.push(outcome);
    if (this.outcomes.length > 5000) this.outcomes.shift();
  }

  state(agentId: string) {
    return this.states.get(agentId);
  }

  all() {
    return Array.from(this.states.values());
  }

  top(limit = 10) {
    return this.all().sort((a, b) => b.weight - a.weight).slice(0, limit);
  }

  weight(agentId: string) {
    return this.states.get(agentId)?.weight ?? 1;
  }

  recent(limit = 50) {
    return this.outcomes.slice(-limit);
  }
}
