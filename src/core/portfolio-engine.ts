import {AccountState, Order, Position} from './types';

export class PortfolioEngine {
  constructor(private readonly feeRate = 0.0005, private readonly slippageRate = 0.0002) {}

  createAccount(startingCapital: number): AccountState {
    return {cash: startingCapital, equity: startingCapital, startingCapital, realizedPnl: 0, unrealizedPnl: 0, fees: 0, drawdown: 0, peakEquity: startingCapital, positions: {}};
  }

  fill(account: AccountState, order: Order): AccountState {
    const signed = order.side === 'BUY' ? 1 : -1;
    const fillPrice = order.requestedPrice * (1 + signed * this.slippageRate);
    const value = fillPrice * order.quantity;
    const fee = value * this.feeRate;
    const current = account.positions[order.symbol] ?? {symbol: order.symbol, quantity: 0, averagePrice: 0, realizedPnl: 0, unrealizedPnl: 0};

    let realized = account.realizedPnl;
    let nextQty = current.quantity + signed * order.quantity;
    let avg = current.averagePrice;

    if (current.quantity !== 0 && Math.sign(current.quantity) !== Math.sign(nextQty)) {
      const closingQty = Math.min(Math.abs(current.quantity), order.quantity);
      realized += (fillPrice - current.averagePrice) * closingQty * Math.sign(current.quantity);
    }

    if (nextQty === 0) avg = 0;
    else if (Math.sign(current.quantity) === Math.sign(nextQty)) {
      const oldValue = Math.abs(current.quantity) * current.averagePrice;
      avg = (oldValue + value) / Math.abs(nextQty);
    } else avg = fillPrice;

    const next: Position = {...current, quantity: nextQty, averagePrice: avg, realizedPnl: realized - account.realizedPnl};
    const positions = {...account.positions, [order.symbol]: next};
    const cash = account.cash - signed * value - fee;
    const updated = {...account, cash, realizedPnl: realized, fees: account.fees + fee, positions};
    return this.markToMarket(updated, {[order.symbol]: fillPrice});
  }

  markToMarket(account: AccountState, prices: Record<string, number>): AccountState {
    let unrealized = 0;
    for (const position of Object.values(account.positions)) {
      const price = prices[position.symbol];
      if (price !== undefined) position.unrealizedPnl = (price - position.averagePrice) * position.quantity;
      unrealized += position.unrealizedPnl;
    }
    const equity = account.cash + Object.values(account.positions).reduce((s, p) => s + p.quantity * (prices[p.symbol] ?? p.averagePrice), 0);
    const peakEquity = Math.max(account.peakEquity, equity);
    return {...account, equity, unrealizedPnl: unrealized, peakEquity, drawdown: peakEquity ? (peakEquity - equity) / peakEquity : 0};
  }
}
