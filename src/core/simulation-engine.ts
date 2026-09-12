import { AutonomousCompany, CompanyCycle } from './autonomous-company';
import { AuditLog } from './audit-log';

export interface SimulationSnapshot {
  timestamp: number;
  cycles: number;
  completedCycles: number;
  decisions: number;
  executions: number;
  equity: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  drawdown: number;
  recentCycles: CompanyCycle[];
}

/**
 * Runs the company as a self-operating organization.
 * No manual trading command is exposed by this engine.
 */
export class SimulationEngine {
  readonly company: AutonomousCompany;
  readonly audit: AuditLog;
  private running = false;
  private cycles = 0;

  constructor(startingCapital = 2_000_000) {
    this.company = new AutonomousCompany(startingCapital);
    this.audit = new AuditLog();
  }

  runCycle(): CompanyCycle[] {
    const results: CompanyCycle[] = [];

    for (const symbol of this.company.agents.symbols()) {
      const cycle = this.company.runCycle(symbol);
      results.push(cycle);
      this.cycles += 1;

      this.audit.record({
        timestamp: cycle.timestamp,
        type: 'DEBATE',
        symbol,
        agentIds: cycle.participants,
        message: cycle.message,
        data: {
          phase: cycle.phase,
          approved: cycle.decision?.approved ?? false,
          confidence: cycle.decision?.confidence ?? 0,
        },
      });

      if (cycle.decision) {
        this.audit.record({
          timestamp: cycle.timestamp,
          type: 'ORDER',
          symbol,
          agentIds: cycle.decision.agentIds,
          message: cycle.decision.reason,
          data: {
            side: cycle.decision.side,
            quantity: cycle.decision.quantity,
            approved: cycle.decision.approved,
          },
        });
      }
    }

    return results;
  }

  start(intervalMs = 1000) {
    if (this.running) return;
    this.running = true;

    const loop = () => {
      if (!this.running) return;
      this.runCycle();
      setTimeout(loop, intervalMs);
    };

    loop();
  }

  stop() {
    this.running = false;
  }

  isRunning() {
    return this.running;
  }

  snapshot(): SimulationSnapshot {
    const account = this.company.trading.account;
    const history = this.company.getHistory();
    const decisions = history.filter((cycle) => cycle.decision).length;
    const executions = this.company.trading.orders.filter((order) => order.status === 'FILLED').length;

    return {
      timestamp: Date.now(),
      cycles: this.cycles,
      completedCycles: history.length,
      decisions,
      executions,
      equity: account.equity,
      cash: account.cash,
      realizedPnl: account.realizedPnl,
      unrealizedPnl: account.unrealizedPnl,
      drawdown: account.drawdown,
      recentCycles: history.slice(-20),
    };
  }
}
