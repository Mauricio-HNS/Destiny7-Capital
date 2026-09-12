import {AccountState, Decision, RiskLimits} from './types';

export class RiskEngine {
  constructor(private readonly limits: RiskLimits) {}

  validate(decision: Decision, account: AccountState, price: number): {approved: boolean; reason: string} {
    const orderValue = decision.quantity * price;
    if (orderValue > this.limits.maxOrderValue) return {approved: false, reason: 'ORDER_VALUE_LIMIT'};
    if (account.realizedPnl + account.unrealizedPnl <= -this.limits.maxDailyLoss) return {approved: false, reason: 'DAILY_LOSS_LIMIT'};

    const existing = account.positions[decision.symbol];
    const currentValue = Math.abs((existing?.quantity ?? 0) * price);
    if (currentValue + orderValue > this.limits.maxPositionValue) return {approved: false, reason: 'POSITION_LIMIT'};

    const openPositions = Object.values(account.positions).filter(p => p.quantity !== 0).length;
    if (!existing && openPositions >= this.limits.maxConcurrentPositions) return {approved: false, reason: 'POSITION_COUNT_LIMIT'};

    const gross = Object.values(account.positions).reduce((sum, p) => sum + Math.abs(p.quantity * price), 0) + orderValue;
    if (gross > this.limits.maxGrossExposure) return {approved: false, reason: 'GROSS_EXPOSURE_LIMIT'};

    return {approved: true, reason: 'RISK_GATE_PASSED'};
  }
}
