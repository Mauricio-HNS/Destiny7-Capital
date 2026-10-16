# Destiny7 Capital

**AI-agent financial-market simulation and risk-control research platform.**

Destiny7 Capital explores how specialized agents can analyse market scenarios, propose portfolio actions, apply risk constraints and produce auditable decisions. The repository currently includes an interactive React/TypeScript dashboard and a set of TypeScript domain modules for agent logic, portfolio metrics, risk checks, learning and audit events.

> **Project status:** research prototype. The dashboard currently includes simulated/randomized market and agent activity. It should not be interpreted as evidence of live market data, a validated trading strategy, or autonomous real-money trading. The domain modules and dashboard are still being integrated and verified as one end-to-end workflow.

## What this project is intended to demonstrate

- Multi-agent role separation: research, momentum, mean reversion, macro, execution, portfolio and risk.
- Weighted signal/consensus logic and decision traceability.
- Portfolio and performance metrics.
- Risk-policy checks, including position/exposure and loss/drawdown limits.
- Learning experiments that adjust strategy weights based on observed outcomes.
- An interactive command-centre UI for inspecting agents, markets, portfolios and risk.

These are engineering capabilities under development; each capability should be considered implemented only where source code and tests verify it.

## Current implementation boundary

| Area | Current interpretation |
| --- | --- |
| React + TypeScript UI | Interactive prototype; parts of the visible activity are simulated |
| `src/core/` | Domain modules for agent, portfolio, risk, learning and audit logic |
| Live market data | Not claimed |
| Live brokerage execution | Not implemented/claimed |
| Generative LLM integration | Not yet verified as an end-to-end capability |
| Automated test coverage | Must be added/expanded before making reliability claims |

## Architecture direction

The intended workflow is:

```text
Market scenario / historical dataset
            ↓
Specialized agents produce signals
            ↓
Consensus and portfolio proposal
            ↓
Deterministic risk-policy validation
            ↓
Paper-trade simulation
            ↓
Outcome measurement and audit log
            ↓
Evaluation / bounded strategy-weight updates
```

The risk engine must remain authoritative: an LLM or agent may explain or propose an action, but it must not bypass deterministic limits or execute a financial action without explicit authorization.

## Recommended validation sequence

1. Connect the UI to the actual domain modules instead of generating placeholder activity.
2. Add deterministic tests for consensus, invalid orders, position/exposure limits, daily loss and drawdown.
3. Add reproducible market scenarios and record expected versus actual outcomes.
4. Add an optional LLM adapter for structured analysis, with schema validation, timeouts and a deterministic fallback.
5. Measure strategy performance against baselines before presenting any performance claim.
6. Add CI that runs tests and builds the frontend on every pull request.

## Safety and scope

This is a software research prototype using simulated activity. It is not investment advice, does not establish that a strategy is profitable, and should not be connected to real-money execution without extensive validation, security controls, authorization, and appropriate regulatory review.

## Technology

- TypeScript
- React
- Vite
- Domain modules for agents, portfolio, risk, learning and audit

See the source tree for the implementation and its current boundaries.
