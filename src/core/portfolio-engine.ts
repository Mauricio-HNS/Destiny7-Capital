import {AccountState, Order, Position} from './types';

export class PortfolioEngine {
  constructor(private readonly feeRate = 0.0005, private readonly slippageRate = 0.0002) {}

  createAccount(startingCapital: number): AccountState {
    return {
      cash: startingCapital,
      equity: startingCapital,
      startingCapital,
      realizedPnl: 0,
      unrealizedPnl: 0,
      fees: 0,
      drawdown: 0,
      peakEquity: startingCapital,
      dailyStartingEquity: startingCapital,
      dailyRealizedPnl: 0,
      positions: {},
    };
  }

  fill(account: AccountState, order: Order): AccountState {
    const direction = order.side === 'BUY' ? 1 : -1;
    const fillPrice = order.requestedPrice * (1 + direction * this.slippageRate);
    const quantity = Math.max(0, order.quantity);
    const current = account.positions[order.symbol] ?? this.emptyPosition(order.symbol);
    const oldQty = current.quantity;
    const oldAvg = current.averagePrice;
    const signedQty = direction * quantity;

    let nextQty = oldQty + signedQty;
    let realizedDelta = 0;

    // Closing an existing position realizes P&L. Any remainder opens/reverses.
    if (oldQty !== 0 && Math.sign(oldQty) !== Math.sign(signedQty)) {
      const closingQty = Math.min(Math.abs(oldQty), quantity);
      realizedDelta = (fillPrice - oldAvg) * closingQty * Math.sign(oldQty);
    }

    let nextAvg = oldAvg;
    const sameDirection = oldQty !== 0 && Math.sign(oldQty) === Math.sign(signedQty);
    const reversal = oldQty !== 0 && Math.sign(oldQty) !== Math.sign(nextQty) && nextQty !== 0;

    if (nextQty === 0) {
      nextAvg = 0;
    } else if (sameDirection) {
      nextAvg = (Math.abs(oldQty) * oldAvg + quantity * fillPrice) / Math.abs(nextQty);
    } else if (reversal) {
      nextAvg = fillPrice;
    } else if (oldQty === 0) {
      nextAvg = fillPrice;
    }

    const value = fillPrice * quantity;
    const fee = value * this.feeRate;
    const realizedPnl = account.realizedPnl + realizedDelta;
    const position: Position = {
      symbol: order.symbol,
      quantity: nextQty,
      averagePrice: nextAvg,
      realizedPnl: current.realizedPnl + realizedDelta,
      unrealizedPnl: 0,
    };

    const positions = {...account.positions};
    if (nextQty === 0) delete positions[order.symbol];
    else positions[order.symbol] = position;

    const cash = account.cash - direction * value - fee;
    return this.markToMarket(
      {
        ...account,
        cash,
        realizedPnl,
        fees: account.fees + fee,
        positions,
      },
      {[order.symbol]: fillPrice},
    );
  }

  markToMarket(account: AccountState, prices: Record<string, number>): AccountState {
    let unrealized = 0;
    let marketValue = 0;

    const positions = {...account.positions};
    for (const [symbol, position] of Object.entries(positions)) {
      const price = prices[symbol];
      if (price !== undefined) {
        position.unrealizedPnl = (price - position.averagePrice) * position.quantity;
      }
      unrealized += position.unrealizedPnl;
      marketValue += position.quantity * (price ?? position.averagePrice);
    }

    const equity = account.cash + marketValue;
    const peakEquity = Math.max(account.peakEquity, equity);
    const drawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;

    return {
      ...account,
      positions,
      equity,
      unrealizedPnl: unrealized,
      peakEquity,
      drawdown,
    };
  }

  resetDailyBaseline(account: AccountState): AccountState {
    return {...account, dailyStartingEquity: account.equity, dailyRealizedPnl: 0};
  }

  private emptyPosition(symbol: string): Position {
    return {symbol, quantity: 0, averagePrice: 0, realizedPnl: 0, unrealizedPnl: 0};
  }
}
