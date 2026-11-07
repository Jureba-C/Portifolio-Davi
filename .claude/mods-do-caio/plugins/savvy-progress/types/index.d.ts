export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  tier: string
  after: number[]
}

export type Flow = {
  title: string
  total: number
  done: number
  phase: Phase
  isFinished: boolean
  finishedAt?: number
  tasks: PlannedTask[]
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  lastAt?: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  round: number
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type PlanWindow = {
  kind: string
  percentUsed: number
  resetsAt?: string
}

export type Plan = {
  windows: PlanWindow[]
  contextWindow: number
}

export type Warned = Record<string, { level: number; resetsAt?: string }>

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': {
      flow: Shaped<Flow | null>
      agents: AgentRun[]
      panel: Panel
      now: number
      plan: Plan
      warned: Warned
      isBandHidden: boolean
      lang: '' | 'en' | 'ru' | 'pt'
    }
  }
}
