import {MarketSimulator} from './market-simulator';
import {PortfolioEngine} from './portfolio-engine';
import {RiskEngine} from './risk-engine';
import {AccountState, Decision, Order, RiskLimits} from './types';

export class TradingEngine {
  readonly market = new MarketSimulator();
  readonly portfolio = new PortfolioEngine();
  readonly risk: RiskEngine;
  account: AccountState;
  orders: Order[] = [];

  constructor(startingCapital = 2_000_000, limits?: Partial<RiskLimits>) {
    this.account = this.portfolio.createAccount(startingCapital);
    this.risk = new RiskEngine({
      maxPositionValue: 100_000,
      maxGrossExposure: 500_000,
      maxOrderValue: 25_000,
      maxDailyLoss: 50_000,
      maxConcurrentPositions: 12,
      ...limits,
    });
  }

  execute(decision: Decision): Order {
    const tick = this.market.tick(decision.symbol);
    const gate = this.risk.validate(decision, this.account, tick.price);
    const order: Order = {
      id: `ORD-${Date.now()}-${this.orders.length + 1}`,
      agentId: decision.agentIds[0] ?? 0,
      symbol: decision.symbol,
      side: decision.side,
      type: 'MARKET',
      quantity: decision.quantity,
      requestedPrice: tick.price,
      status: gate.approved ? 'FILLED' : 'REJECTED',
      createdAt: Date.now(),
      reason: gate.reason,
    };
    if (gate.approved) {
      order.filledPrice = tick.price;
      order.filledAt = Date.now();
      this.account = this.portfolio.fill(this.account, order);
    }
    this.orders.push(order);
    return order;
  }

  mark(symbols = ['NVDA', 'MSFT', 'AAPL', 'BTC', 'SPX']): AccountState {
    const prices: Record<string, number> = {};
    for (const symbol of symbols) prices[symbol] = this.market.tick(symbol).price;
    this.account = this.portfolio.markToMarket(this.account, prices);
    return this.account;
  }
}
