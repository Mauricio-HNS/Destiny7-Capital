export interface AgentEconomyState {
  agentId: string;
  capital: number;
  lifetimePnl: number;
  computeSpent: number;
  trades: number;
  wins: number;
  losses: number;
  alive: boolean;
  generation: number;
  children: string[];
  parentId?: string;
  lastEvent?: string;
}

export interface EconomyConfig {
  initialCapital: number;
  thoughtCost: number;
  decisionCost: number;
  executionCost: number;
  reproductionThreshold: number;
  reproductionCost: number;
  minimumSurvivalCapital: number;
}

const DEFAULT_CONFIG: EconomyConfig = {
  initialCapital: 5,
  thoughtCost: 0.002,
  decisionCost: 0.01,
  executionCost: 0.025,
  reproductionThreshold: 25,
  reproductionCost: 10,
  minimumSurvivalCapital: 0,
};

export class AgentEconomy {
  readonly config: EconomyConfig;
  private states = new Map<string, AgentEconomyState>();
  private nextAgentNumber = 51;

  constructor(agentIds: string[], config: Partial<EconomyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    for (const agentId of agentIds) this.states.set(agentId, this.createState(agentId));
  }

  private createState(agentId: string, parentId?: string, generation = 0): AgentEconomyState {
    return { agentId, capital: this.config.initialCapital, lifetimePnl: 0, computeSpent: 0, trades: 0, wins: 0, losses: 0, alive: true, generation, children: [], parentId };
  }

  get(agentId: string) { return this.states.get(agentId); }
  all() { return [...this.states.values()]; }
  alive() { return this.all().filter((state) => state.alive); }

  chargeThought(agentId: string, amount = this.config.thoughtCost) {
    return this.charge(agentId, amount, 'compute');
  }

  chargeDecision(agentId: string, amount = this.config.decisionCost) {
    return this.charge(agentId, amount, 'decision');
  }

  chargeExecution(agentId: string, amount = this.config.executionCost) {
    return this.charge(agentId, amount, 'execution');
  }

  private charge(agentId: string, amount: number, event: string) {
    const state = this.states.get(agentId);
    if (!state || !state.alive) return false;
    state.capital -= amount;
    state.computeSpent += amount;
    state.lastEvent = `${event} cost ${amount.toFixed(3)}`;
    this.checkDeath(state);
    return state.alive;
  }

  recordTrade(agentId: string, pnl: number) {
    const state = this.states.get(agentId);
    if (!state || !state.alive) return;
    state.capital += pnl;
    state.lifetimePnl += pnl;
    state.trades += 1;
    if (pnl >= 0) state.wins += 1;
    else state.losses += 1;
    state.lastEvent = `${pnl >= 0 ? 'profit' : 'loss'} ${pnl.toFixed(2)}`;
    this.checkDeath(state);
  }

  reproduce(parentId: string): AgentEconomyState | null {
    const parent = this.states.get(parentId);
    if (!parent || !parent.alive || parent.capital < this.config.reproductionThreshold) return null;
    if (parent.capital < this.config.reproductionCost + this.config.minimumSurvivalCapital) return null;

    parent.capital -= this.config.reproductionCost;
    const childId = `agent-${String(this.nextAgentNumber++).padStart(2, '0')}`;
    const child = this.createState(childId, parentId, parent.generation + 1);
    parent.children.push(childId);
    parent.lastEvent = `replicated ${childId}`;
    this.states.set(childId, child);
    return child;
  }

  private checkDeath(state: AgentEconomyState) {
    if (state.capital <= this.config.minimumSurvivalCapital) {
      state.capital = Math.max(0, state.capital);
      state.alive = false;
      state.lastEvent = 'CAPITAL EXHAUSTED — AGENT DEACTIVATED';
    }
  }
}
