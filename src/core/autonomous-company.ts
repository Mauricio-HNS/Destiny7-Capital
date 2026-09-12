import { AgentEngine } from './agent-engine';
import { DecisionRoom, DecisionRoomResult } from './decision-room';
import { TradingEngine } from './trading-engine';

export interface CompanyCycle {
  timestamp: number;
  symbol: string;
  phase: DecisionRoomResult['phase'];
  decision: DecisionRoomResult['decision'];
  participants: string[];
  message: string;
}

/**
 * The company owns the trading process. Agents have their own survival
 * capital: thinking and decisions cost money, profitable outcomes replenish
 * capital, insolvency deactivates the agent, and successful agents can fund
 * new generations of agents.
 */
export class AutonomousCompany {
  readonly agents: AgentEngine;
  readonly room: DecisionRoom;
  readonly trading: TradingEngine;
  private history: CompanyCycle[] = [];

  constructor(startingCapital = 2_000_000) {
    this.agents = new AgentEngine(50);
    this.room = new DecisionRoom(this.agents);
    this.trading = new TradingEngine(startingCapital);
  }

  runCycle(symbol: string): CompanyCycle {
    const tick = this.trading.market.tick(symbol);
    const marketHistory = this.trading.market.history(symbol, 50);
    const result = this.room.deliberate(symbol, marketHistory, tick.timestamp);

    if (result.decision?.approved) {
      for (const agentId of result.decision.agentIds) this.agents.economy.chargeExecution(agentId);
      this.trading.execute(result.decision);
    }

    this.trading.mark(this.agents.symbols());

    // Closed trades are the ground truth for both learning and survival.
    // Every participating agent receives its share of the actual outcome.
    for (const trade of this.trading.drainClosedTrades()) {
      const pnl = trade.realizedPnl ?? 0;
      const share = pnl / Math.max(1, trade.agentIds.length);
      for (const agentId of trade.agentIds) {
        this.agents.learning.record({
          agentId,
          symbol: trade.symbol,
          side: trade.side,
          pnl: share,
          timestamp: trade.closedAt ?? Date.now(),
        });
        this.agents.economy.recordTrade(agentId, share);
      }
    }

    // Profitable agents can reproduce. Reproduction is not guaranteed: it
    // consumes the parent's own capital and therefore competes with survival.
    for (const state of this.agents.economy.alive()) {
      if (state.capital >= this.agents.economy.config.reproductionThreshold) {
        this.agents.replicate(state.agentId);
      }
    }

    const cycle: CompanyCycle = {
      timestamp: tick.timestamp,
      symbol,
      phase: result.phase,
      decision: result.decision,
      participants: result.participants,
      message: result.reason,
    };

    this.history.push(cycle);
    if (this.history.length > 500) this.history.shift();
    return cycle;
  }

  runAutonomously() {
    const symbols = this.agents.symbols();
    return symbols.map((symbol) => this.runCycle(symbol));
  }

  getHistory() {
    return [...this.history];
  }
}
