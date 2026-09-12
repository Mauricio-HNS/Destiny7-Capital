export type Side = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type AgentState = 'OBSERVE' | 'ANALYZE' | 'DEBATE' | 'RISK' | 'APPROVE' | 'EXECUTE' | 'LEARN' | 'WAIT';

export interface MarketTick {
  symbol: string;
  price: number;
  previousPrice: number;
  timestamp: number;
  volume: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface Order {
  id: string;
  agentId: number;
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  requestedPrice: number;
  filledPrice?: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  reason: string;
}

export interface AccountState {
  cash: number;
  equity: number;
  startingCapital: number;
  realizedPnl: number;
  unrealizedPnl: number;
  fees: number;
  drawdown: number;
  peakEquity: number;
  positions: Record<string, Position>;
}

export interface RiskLimits {
  maxPositionValue: number;
  maxGrossExposure: number;
  maxOrderValue: number;
  maxDailyLoss: number;
  maxConcurrentPositions: number;
}

export interface Decision {
  id: string;
  agentIds: number[];
  symbol: string;
  side: Side;
  quantity: number;
  confidence: number;
  reason: string;
  state: AgentState;
  approved: boolean;
  createdAt: number;
}
