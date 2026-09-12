import { Decision } from './types';
import { AgentEngine } from './agent-engine';

export interface DecisionRoomResult {
  decision: Decision | null;
  phase: 'SIGNAL' | 'DEBATE' | 'RISK' | 'APPROVAL' | 'REJECTED';
  participants: string[];
  confidence: number;
  consensus: number;
  reason: string;
}

export class DecisionRoom {
  constructor(private readonly agents: AgentEngine) {}

  deliberate(symbol: string, ticks: Parameters<AgentEngine['decide']>[1], now = Date.now()): DecisionRoomResult {
    const decision = this.agents.decide(symbol, ticks, now);
    if (!decision) {
      return {
        decision: null,
        phase: 'REJECTED',
        participants: [],
        confidence: 0,
        consensus: 0,
        reason: 'No sufficiently strong multi-agent consensus.',
      };
    }

    const consensus = decision.agentIds.length / this.agents.agents.length;
    const approved = decision.confidence >= 0.62 && decision.agentIds.length >= 5;
    decision.approved = approved;
    decision.state = approved ? 'EXECUTE' : 'RISK';

    return {
      decision,
      phase: approved ? 'APPROVAL' : 'RISK',
      participants: decision.agentIds,
      confidence: decision.confidence,
      consensus,
      reason: approved
        ? `Decision approved after multi-agent debate: ${decision.side} ${decision.symbol}.`
        : 'Decision sent back to risk review because consensus was not strong enough.',
    };
  }
}
