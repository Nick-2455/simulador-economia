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

## API Integration

The frontend calls `/api/messages` (Vite proxies → `http://localhost:3001`).
The Express server adds `x-api-key` from `ANTHROPIC_API_KEY` env var and forwards to `https://api.anthropic.com/v1/messages`.

Model used: `claude-sonnet-4-6` with `max_tokens: 2000`.
Language: Spanish. Prompt requests: diagnóstico, efectos, recomendaciones, riesgos.

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
