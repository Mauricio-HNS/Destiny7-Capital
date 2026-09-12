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

    // Mark the whole portfolio after every market event so the company always
    // has an up-to-date view of equity, exposure and unrealized P&L.
    this.trading.mark(this.agents.symbols());

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
