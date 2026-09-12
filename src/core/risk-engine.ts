import {AccountState, Decision, RiskLimits} from './types';

export class RiskEngine {
  constructor(private readonly limits: RiskLimits) {}

  validate(
    decision: Decision,
    account: AccountState,
    price: number,
    prices: Record<string, number> = {},
  ): {approved: boolean; reason: string} {
    if (decision.quantity <= 0 || !Number.isFinite(decision.quantity)) {
      return {approved: false, reason: 'INVALID_QUANTITY'};
    }
    if (!Number.isFinite(price) || price <= 0) {
      return {approved: false, reason: 'INVALID_MARKET_PRICE'};
    }

    const orderValue = decision.quantity * price;
    if (orderValue > this.limits.maxOrderValue) {
      return {approved: false, reason: 'ORDER_VALUE_LIMIT'};
    }

    const dailyLoss = account.dailyStartingEquity - account.equity;
    if (dailyLoss >= this.limits.maxDailyLoss) {
      return {approved: false, reason: 'DAILY_LOSS_LIMIT'};
    }

    if (account.drawdown >= this.limits.maxDrawdown) {
      return {approved: false, reason: 'MAX_DRAWDOWN_LIMIT'};
    }

    const existing = account.positions[decision.symbol];
    const currentValue = Math.abs((existing?.quantity ?? 0) * price);
    const projectedPosition = Math.abs((existing?.quantity ?? 0) + (decision.side === 'BUY' ? decision.quantity : -decision.quantity)) * price;
    if (projectedPosition > this.limits.maxPositionValue) {
      return {approved: false, reason: 'POSITION_LIMIT'};
    }

    const openPositions = Object.values(account.positions).filter((p) => p.quantity !== 0).length;
    const opensNewPosition = !existing || existing.quantity === 0 || Math.sign(existing.quantity) !== (decision.side === 'BUY' ? 1 : -1);
    if (opensNewPosition && !existing && openPositions >= this.limits.maxConcurrentPositions) {
      return {approved: false, reason: 'POSITION_COUNT_LIMIT'};
    }

    const gross = Object.values(account.positions).reduce((sum, p) => {
      const mark = prices[p.symbol] ?? (p.symbol === decision.symbol ? price : p.averagePrice);
      return sum + Math.abs(p.quantity * mark);
    }, 0);
    const currentGross = gross - currentValue;
    const projectedGross = currentGross + projectedPosition;
    if (projectedGross > this.limits.maxGrossExposure) {
      return {approved: false, reason: 'GROSS_EXPOSURE_LIMIT'};
    }

    return {approved: true, reason: 'RISK_GATE_PASSED'};
  }
}
