import {MarketSimulator} from './market-simulator';
import {PortfolioEngine} from './portfolio-engine';
import {RiskEngine} from './risk-engine';
import {AccountState, Decision, Order, RiskLimits, TradeRecord} from './types';

export class TradingEngine {
  readonly market = new MarketSimulator();
  readonly portfolio = new PortfolioEngine();
  readonly risk: RiskEngine;
  account: AccountState;
  orders: Order[] = [];
  trades: TradeRecord[] = [];
  private openTrades = new Map<string, TradeRecord>();
  private closedTrades: TradeRecord[] = [];

  constructor(startingCapital = 2_000_000, limits?: Partial<RiskLimits>) {
    this.account = this.portfolio.createAccount(startingCapital);
    this.risk = new RiskEngine({
      maxPositionValue: 100_000,
      maxGrossExposure: 500_000,
      maxOrderValue: 25_000,
      maxDailyLoss: 50_000,
      maxConcurrentPositions: 12,
      maxDrawdown: 0.15,
      ...limits,
    });
  }

  execute(decision: Decision): Order {
    const tick = this.market.tick(decision.symbol);
    const prices = this.market.snapshot();
    const gate = this.risk.validate(decision, this.account, tick.price, prices);
    const now = Date.now();
    const order: Order = {
      id: `ORD-${now}-${this.orders.length + 1}`,
      agentId: decision.agentIds[0] ?? 'system',
      agentIds: [...decision.agentIds],
      decisionId: decision.id,
      symbol: decision.symbol,
      side: decision.side,
      type: 'MARKET',
      quantity: decision.quantity,
      requestedPrice: tick.price,
      status: gate.approved ? 'FILLED' : 'REJECTED',
      createdAt: now,
      reason: gate.reason,
    };

    if (gate.approved) {
      order.filledPrice = tick.price;
      order.filledAt = now;
      this.account = this.portfolio.fill(this.account, order);

      const trade: TradeRecord = {
        id: `TRD-${now}-${this.trades.length + 1}`,
        decisionId: decision.id,
        agentIds: [...decision.agentIds],
        symbol: decision.symbol,
        side: decision.side,
        quantity: decision.quantity,
        entryPrice: tick.price,
        openedAt: now,
        holdingCycles: 0,
        status: 'OPEN',
      };
      this.openTrades.set(trade.id, trade);
      this.trades.push(trade);
    }

    this.orders.push(order);
    return order;
  }

  mark(symbols = ['NVDA', 'MSFT', 'AAPL', 'BTC', 'SPX']): AccountState {
    const prices: Record<string, number> = {};
    for (const symbol of symbols) prices[symbol] = this.market.tick(symbol).price;
    this.account = this.portfolio.markToMarket(this.account, prices);
    this.manageOpenTrades(prices);
    this.account = this.portfolio.markToMarket(this.account, prices);
    return this.account;
  }

  drainClosedTrades(): TradeRecord[] {
    const closed = [...this.closedTrades];
    this.closedTrades = [];
    return closed;
  }

  resetDailyRisk() {
    this.account = this.portfolio.resetDailyBaseline(this.account);
  }

  private manageOpenTrades(prices: Record<string, number>) {
    for (const trade of [...this.openTrades.values()]) {
      trade.holdingCycles += 1;
      const price = prices[trade.symbol];
      if (price === undefined) continue;

      const direction = trade.side === 'BUY' ? 1 : -1;
      const move = ((price - trade.entryPrice) / trade.entryPrice) * direction;
      const takeProfit = 0.008;
      const stopLoss = -0.006;
      const maxHoldingCycles = 12;

      if (move >= takeProfit || move <= stopLoss || trade.holdingCycles >= maxHoldingCycles) {
        this.closeTrade(trade, price, move >= takeProfit ? 'TAKE_PROFIT' : move <= stopLoss ? 'STOP_LOSS' : 'TIME_EXIT');
      }
    }
  }

  private closeTrade(trade: TradeRecord, price: number, exitReason: string) {
    const before = this.account.realizedPnl;
    const closeOrder: Order = {
      id: `EXIT-${Date.now()}-${this.orders.length + 1}`,
      agentId: trade.agentIds[0] ?? 'system',
      agentIds: [...trade.agentIds],
      decisionId: trade.decisionId,
      symbol: trade.symbol,
      side: trade.side === 'BUY' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: trade.quantity,
      requestedPrice: price,
      status: 'FILLED',
      createdAt: Date.now(),
      filledPrice: price,
      filledAt: Date.now(),
      reason: `AUTONOMOUS_EXIT:${exitReason}`,
    };

    this.account = this.portfolio.fill(this.account, closeOrder);
    this.orders.push(closeOrder);

    trade.exitPrice = price;
    trade.realizedPnl = this.account.realizedPnl - before;
    trade.closedAt = Date.now();
    trade.status = 'CLOSED';
    trade.exitReason = exitReason;

    this.openTrades.delete(trade.id);
    this.closedTrades.push({...trade});
  }
}
