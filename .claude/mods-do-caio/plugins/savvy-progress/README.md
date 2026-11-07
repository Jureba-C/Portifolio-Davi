# savvy-progress

A Claude Code mod: a progress bar above the prompt and a live panel of subagents. Made for the [savvy-flow](../savvy-flow) skill, and useful with any subagents.

- **Progress bar**: with a plan (the `progress` tool), the flow's title, phase, accepted tasks out of planned, how many workers run and the percent; with no plan while subagents run, how many run and how many finished, with no percent. Nothing running and no plan: no bar. A finished plan shows Done for a few seconds and goes; the ✕ hides the bar until the next plan. The Agents · N button opens the panel (N is the number of subagents in it), and the crab wears the tier of the worker heard from last. The running count comes from the same list as the panel, settled against the engine's own list of agents, so a reload or a lost event never leaves one running forever.
- **Agents panel** (`/agents-info` toggles it): how much of the plan's limits is used and left (5-hour window, week, and a gateway's spend limit when there is one), with when each resets; then running, finished and planned subagents with model, effort, task progress, context and time. Working crabs walk, and each savvy tier animates its prop: the astronaut floats, the detective sweeps the magnifier, the engineer turns the wrench, the chef tosses the omelette, the racer runs with a fluttering flag. `prefers-reduced-motion` stops them.

## Tools it adds

- `mcp__savvy-progress__progress`: the orchestrator reports the plan, phase and accepted tasks.
- `mcp__savvy-progress__step`: a worker reports its own steps (`done`, `total`, `note`). A worker that does not report shows its context fill in grey instead.

## Plan usage

The figures are the engine's own (`$.session.usage()` and the `session.measure` event), the same ones the status line reads. Off a subscription, or before the first response, there is no reading and the panel says so instead of showing zero. The status line under the prompt shows the windows in short (`5h 23% · Wk 41%`) and the flow's bar while one runs. A toast says once when a window crosses 80% and 90%.

## Settings

`language`: `pt` (default), `en`, `ru` or `auto`. `auto` follows Claude Code's `language` setting, then the locale variables and the macOS system locale, where any Portuguese or Brazilian locale (`pt_BR`, `en_BR`) picks Portuguese, and falls back to English. Set it in `/config`, or, for a mod loaded by hand, in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "savvy-progress": { "options": { "language": "pt" } } } }
```

Install instructions are in the [repository README](../../README.md).
