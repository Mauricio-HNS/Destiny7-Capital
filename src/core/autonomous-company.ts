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
 * The company owns the trading process. There is intentionally no user
 * trading mode or manual trade command here. The user observes the company;
 * agents decide what to study, when to act and whether risk allows an order.
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
      this.trading.execute(result.decision);
    }

    this.trading.mark(this.agents.symbols());

    // Closed trades are the ground truth for learning. The P&L of each
    // decision is attributed to every participating agent so future signals
    // can become stronger or weaker from actual outcomes.
    for (const trade of this.trading.drainClosedTrades()) {
      const pnl = trade.realizedPnl ?? 0;
      for (const agentId of trade.agentIds) {
        this.agents.learning.record({
          agentId,
          symbol: trade.symbol,
          side: trade.side,
          pnl: pnl / Math.max(1, trade.agentIds.length),
          timestamp: trade.closedAt ?? Date.now(),
        });
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
