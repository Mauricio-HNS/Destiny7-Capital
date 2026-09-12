export type AuditEventType =
  | 'MARKET'
  | 'SIGNAL'
  | 'DEBATE'
  | 'RISK'
  | 'ORDER'
  | 'FILL'
  | 'PORTFOLIO'
  | 'LEARNING';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  symbol?: string;
  agentIds?: string[];
  message: string;
  data?: Record<string, unknown>;
}

export class AuditLog {
  private events: AuditEvent[] = [];
  private sequence = 0;

  record(event: Omit<AuditEvent, 'id'>): AuditEvent {
    const entry: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${++this.sequence}`,
    };
    this.events.push(entry);
    if (this.events.length > 5000) this.events.splice(0, this.events.length - 5000);
    return entry;
  }

  recent(limit = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }

  byType(type: AuditEventType, limit = 100): AuditEvent[] {
    return this.events.filter((event) => event.type === type).slice(-limit);
  }

  bySymbol(symbol: string, limit = 100): AuditEvent[] {
    return this.events.filter((event) => event.symbol === symbol).slice(-limit);
  }

  clear() {
    this.events = [];
  }
}
