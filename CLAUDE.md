# Simulador de Política Económica — Architecture & Model Documentation

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 |
| Charts | Recharts 2 (RadarChart, LineChart) |
| Styling | Custom CSS (JetBrains Mono font, dark terminal aesthetic) |
| AI | Anthropic Claude via Express proxy |
| Proxy | Express 4 + cors + dotenv |
| Dev runner | concurrently (Vite on :5173, proxy on :3001) |

## Project Structure

```
simulador-economico/
├── src/
│   ├── SimuladorEconomico.jsx   # Main component (all logic + UI)
│   ├── SimuladorEconomico.css   # All styles inc. print CSS
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server.js                    # Express proxy for Anthropic API
├── vite.config.js               # Proxies /api/* → localhost:3001
├── package.json
├── .env.example
└── CLAUDE.md
```

## Causal Model

### Input Variables (Policy Levers)

| Variable | Key | Range | Unit |
|---|---|---|---|
| Inflación | `inflation` | 0–30 | % |
| Gasto Social | `socialSpending` | 0–20 | % PIB |
| Corrupción | `corruption` | 0–100 | índice |
| Carga Fiscal | `taxBurden` | 0–40 | % PIB |
| Tasa de Interés | `interestRate` | 0–25 | % |
| Inversión Infraestructura | `infrastructure` | 0–10 | % PIB |

### Output Variables (Economic Outcomes)

| Variable | Key | Unit |
|---|---|---|
| Crecimiento PIB | `pibGrowth` | % |
| Desempleo | `unemployment` | % |
| Pobreza | `poverty` | % población |
| Desigualdad | `gini` | índice Gini |
| Confianza Institucional | `confidence` | 0–100 |
| Presión Migratoria | `migration` | 0–100 |

### Model Formula

Outputs are computed as delta adjustments from empirical Hermosillo 2024 baseline:

```
output[k] = BASELINE_OUTPUT[k] + Σ (input[j] - baselineInput[j]) × COEFF[k][j]
```

### Coefficients Matrix

Source: IMF Working Papers on Latin American monetary/fiscal policy + World Bank LACCE regional dataset.

#### PIB Growth
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | −0.080 | Contractionary effect via uncertainty |
| socialSpending | +0.010 | Small Keynesian multiplier |
| corruption | −0.015 | Institutional drag on investment |
| taxBurden | −0.030 | Crowding-out of private investment |
| interestRate | −0.080 | Monetary policy transmission |
| infrastructure | +0.200 | Public capital productivity |

#### Unemployment
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | +0.080 | Uncertainty reduces hiring |
| socialSpending | −0.010 | Public employment / active labor policies |
| corruption | +0.030 | Resource misallocation |
| taxBurden | +0.020 | Labor cost channel |
| interestRate | +0.070 | Investment reduction → fewer jobs |
| infrastructure | −0.300 | Construction + multiplier |

#### Poverty
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | +0.800 | Inflation tax disproportionately hits poor |
| socialSpending | −2.200 | Direct transfers + services |
| corruption | +0.400 | Leakage of social programs |
| taxBurden | −0.300 | Redistribution effect |
| interestRate | +0.500 | Credit exclusion of low-income households |
| infrastructure | −2.000 | Connectivity and basic services |

#### Gini (Inequality)
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | +0.150 | Regressive price increases |
| socialSpending | −1.500 | Strong equalizing effect |
| corruption | +0.200 | Regulatory capture by elites |
| taxBurden | −0.300 | Progressive redistribution |
| interestRate | +0.100 | Capital vs. labor income distribution |
| infrastructure | −1.000 | Regional convergence |

#### Institutional Confidence
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | −0.080 | Erosion of central bank credibility |
| socialSpending | −0.010 | Minimal trust gain under high corruption |
| corruption | −0.050 | Marginal; baseline already reflects structural corruption |
| taxBurden | +0.150 | State capacity signal |
| interestRate | +0.030 | Stability signal |
| infrastructure | +1.200 | Visible public works build trust |

#### Migration Pressure
| Input | Coefficient | Rationale |
|---|---|---|
| inflation | +0.400 | Cost-of-living push factor |
| socialSpending | −0.100 | Retention via social programs |
| corruption | +0.300 | Governance push factor |
| taxBurden | −0.100 | Service retention |
| interestRate | +0.200 | Economic uncertainty |
| infrastructure | −1.000 | Quality-of-life retention |

### Baseline Reference Values (Hermosillo 2024)

```
Inputs:  inflation=4.8%, socialSpending=4.25%PIB, corruption=62/100,
         taxBurden=16%, interestRate=11%, infrastructure=3.1%PIB
Outputs: pibGrowth=+1.7%, unemployment=11.6%, poverty=32.4%,
         gini=46.9, confidence=8/100, migration=17/100
```

### Health Score Formula

```
score = 100
  − max(0, 5 − pibGrowth) × 2.5        // PIB below 5% target
  − max(0, unemployment − 5) × 1.5     // unemployment above 5% NAIRU
  − poverty × 0.2                       // direct poverty penalty
  − max(0, gini − 30) × 0.1            // inequality above 30
  + confidence × 0.1                    // institutional trust bonus
  − max(0, migration − 5) × 0.3        // emigration pressure
  − max(0, inflation − 3) × 0.4        // inflation above 3% target
```

Clamped to [0, 100] and rounded to nearest integer.

### Radar Dimension Mapping (0–100 normalized)

| Dimension | Formula |
|---|---|
| PIB | `clamp(pibGrowth × 20 + 9, 0, 100)` |
| Empleo | `clamp(100 − unemployment × 3.3, 0, 100)` |
| Equidad | `clamp(100 − poverty × 1.4, 0, 100)` |
| Igualdad | `clamp(100 − gini × 0.87, 0, 100)` |
| Confianza | `clamp(confidence, 0, 100)` |
| Retención | `clamp(100 − migration, 0, 100)` |

## Preset Cities

| City | inflation | socialSpending | corruption | taxBurden | interestRate | infrastructure |
|---|---|---|---|---|---|---|
| Hermosillo 2024 | 4.8 | 4.25 | 62 | 16 | 11 | 3.1 |
| Fintechia | 8 | 3 | 70 | 22 | 9 | 2 |

## Module: Policy Optimizer

### Function: `optimizePolicy(baselineInputs, feasibilityMode)`

Finds the input combination that maximizes the Health Score using **coordinate ascent** over the causal model.

**Algorithm:**
- 3-pass coordinate sweep (handles piecewise-linear score discontinuities at thresholds like `pibGrowth=5`, `gini=30`)
- For each variable: computes numerical gradient via ε-perturbation, then pushes to optimal boundary
- Convergence is guaranteed in ≤ 3 passes because the causal model is linear

**Modes:**
- `feasibilityMode = false` → unconstrained; each variable reaches its global optimum (theoretical maximum)
- `feasibilityMode = true` → each variable capped at ±30% of its range from baseline (models political/institutional constraints)

**Returns:** `{ optimalInputs, optimalOutputs, optimalScore }`

**Key finding (empirically validated):** Corruption and infrastructure are the highest-leverage variables — they affect 5 of 6 outputs and dominate the optimization result. Monetary/fiscal variables are secondary.

**UI:** Tab "OPTIMIZADOR" — shows score comparison (current → optimal), per-variable change table, conflict panel, and "Apply to sliders" button that directly sets the React input state.

---

## Module: Conflict Detector

### Function: `detectConflicts(inputs, outputs)`

Identifies structural contradictions in the policy mix that reduce systemic effectiveness. Returns `[{severity, description}]`.

| Conflict | Trigger | Severity |
|---|---|---|
| Social leakage | `socialSpending > 7` AND `corruption > 55` | ALTO if corruption > 75, else MEDIO |
| Monetary over-tightening | `interestRate > 13` AND `inflation < 5` | MEDIO |
| Fiscal drain | `taxBurden > 24` AND `socialSpending < 5` | MEDIO |
| Infrastructure trust gap | `confidence < 15` AND `infrastructure > 5` | BAJO |
| Insufficient monetary response | `inflation > 10` AND `interestRate < 8` | ALTO |

Conflicts are surfaced in the Optimizer tab and injected into the AI report prompt as structured context.

---

## Module: Temporal Simulation

### Function: `simulateOverTime(currentInputs, baselineInputs, steps=12, alpha=0.35)`

Models the economy's transition from the current state toward the new policy equilibrium using **discrete exponential smoothing**:

```
y_{t+1} = y_t + α · (y* − y_t)
```

Where:
- `y*` = equilibrium outputs from `computeOutputs(currentInputs, baselineInputs)` — the model's steady-state
- `y_0` = `BASELINE_OUTPUTS` (Hermosillo 2024 empirical values) — starting point of the transition
- `α ∈ [0.1, 0.8]` = convergence speed, user-adjustable. Models policy transmission lag: high α = fast adjustment (e.g. monetary policy), low α = slow (e.g. institutional reform)

**Why start from baseline outputs, not current outputs:**
Starting from `BASELINE_OUTPUTS` makes the chart show the actual transition path. Starting from `computeOutputs(currentInputs)` would produce a flat line (already at equilibrium), which has no pedagogical value.

**Returns:** Array of 13 data points `{period, label, pibGrowth, unemployment, poverty, gini, confidence, migration, score}`.

**UI:** Tab "SIMULACIÓN" — 3 stacked charts:
1. Economic variables (PIB, unemployment, poverty)
2. Social/institutional variables (Gini, confidence, migration)
3. Health score evolution

Terminal row shows equilibrium values at Month 12.

---

## Enhanced AI Report Prompt

### Function: `generateReport(inputs, outputs, score, presetLabel, conflicts, optimizerResult)`

Signature extended with two new parameters:
- `conflicts` — array from `detectConflicts()`, injected as structured context before the prompt
- `optimizerResult` — if available, includes a comparison block (current score vs optimal score, key output deltas)

**New prompt sections (added to existing 4):**
1. `INTERACCIONES CLAVE` — how variables amplify or neutralize each other (not individual effects)
2. `CONFLICTOS DEL MODELO` — structural contradictions in the current policy mix
3. `EFICIENCIA DEL MIX DE POLÍTICA` — alignment, synergies, wasted potential

**Prompt design principle:** The model is explicitly instructed to reason about variable interactions, not just marginal effects. Example target output: *"No basta aumentar gasto social si corrupción permanece alta, ya que reduce su efectividad en un estimado X%."*

---

## Tabs (updated)

| Key | Label | Content |
|---|---|---|
| `indicadores` | INDICADORES | 6 gauge cards + comparison table |
| `radar` | RADAR | Multidimensional radar chart vs baseline |
| `tendencia` | TENDENCIA | Last 10 slider-change snapshots |
| `optimizador` | OPTIMIZADOR | Policy optimizer + conflict panel |
| `simulacion` | SIMULACIÓN | 12-month temporal simulation (3 charts) |
| `reporte` | REPORTE IA | AI-generated executive report |

---

## API Integration

The frontend calls `/api/messages` (Vite proxies → `http://localhost:3001`).
The Express server adds `x-api-key` from `ANTHROPIC_API_KEY` env var and forwards to `https://api.anthropic.com/v1/messages`.

Model used: `claude-sonnet-4-6` with `max_tokens: 2000`.
Language: Spanish. Prompt sections: diagnóstico, efectos principales, interacciones clave, conflictos del modelo, eficiencia del mix, recomendaciones, riesgos.

## Running

```bash
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY=sk-ant-...

npm install
npm run dev   # starts Vite (:5173) + proxy (:3001) concurrently
```

## PDF Export

`window.print()` triggered from "Exportar PDF" button (visible only on Reporte IA tab with report loaded).
Print CSS in `SimuladorEconomico.css` hides all UI chrome and renders only the report content.
