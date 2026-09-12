import { AccountState, Order } from './types';

export interface PerformanceMetrics {
  trades: number;
  filledTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  unrealizedPnl: number;
  netPnl: number;
  returnPct: number;
  fees: number;
  drawdownPct: number;
  turnover: number;
  expectancy: number;
}

export class MetricsEngine {
  calculate(account: AccountState, orders: Order[]): PerformanceMetrics {
    const filled = orders.filter((order) => order.status === 'FILLED');
    const wins = filled.filter((order) => order.reason.includes('profit')).length;
    const losses = filled.filter((order) => order.reason.includes('loss')).length;
    const turnover = filled.reduce(
      (sum, order) => sum + (order.filledPrice ?? order.requestedPrice) * order.quantity,
      0,
    );
    const netPnl = account.realizedPnl + account.unrealizedPnl;
    const tradeCount = wins + losses;

    return {
      trades: orders.length,
      filledTrades: filled.length,
      wins,
      losses,
      winRate: tradeCount ? wins / tradeCount : 0,
      realizedPnl: account.realizedPnl,
      unrealizedPnl: account.unrealizedPnl,
      netPnl,
      returnPct: account.startingCapital ? netPnl / account.startingCapital : 0,
      fees: account.fees,
      drawdownPct: account.peakEquity ? account.drawdown / account.peakEquity : 0,
      turnover,
      expectancy: tradeCount ? netPnl / tradeCount : 0,
    };
  }
}
