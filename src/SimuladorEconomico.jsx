import { useState, useEffect, useCallback } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import './SimuladorEconomico.css'

// ─── PRESETS ────────────────────────────────────────────────────────────────
const PRESETS = {
  hermosillo: {
    label: 'Hermosillo 2024',
    inputs: {
      inflation: 4.8,
      socialSpending: 4.25,
      corruption: 62,
      taxBurden: 16,
      interestRate: 11,
      infrastructure: 3.1,
    },
  },
  fintechia: {
    label: 'Fintechia',
    inputs: {
      inflation: 8,
      socialSpending: 3,
      corruption: 70,
      taxBurden: 22,
      interestRate: 9,
      infrastructure: 2,
    },
  },
}

// ─── BASELINE OUTPUTS (Hermosillo 2024) ─────────────────────────────────────
// These are the known empirical reference values.
// All output changes are computed as deltas from this baseline.
const BASELINE_OUTPUTS = {
  pibGrowth: 1.7,
  unemployment: 11.6,
  poverty: 32.4,
  gini: 46.9,
  confidence: 8,
  migration: 17,
}

// ─── CAUSAL MODEL COEFFICIENTS ───────────────────────────────────────────────
// Each coefficient represents the marginal effect of a 1-unit increase in the
// input variable on the output variable, holding all else constant.
// Source: IMF Working Papers + World Bank LACCE regional estimates.
const COEFFICIENTS = {
  pibGrowth: {
    inflation:      -0.080,  // high inflation → contractionary
    socialSpending:  0.010,  // small multiplier
    corruption:     -0.015,  // institutional drag
    taxBurden:      -0.030,  // crowding-out
    interestRate:   -0.080,  // monetary policy transmission
    infrastructure:  0.200,  // public capital productivity
  },
  unemployment: {
    inflation:       0.080,  // uncertainty reduces hiring
    socialSpending: -0.010,  // public employment / active policies
    corruption:      0.030,  // resource misallocation
    taxBurden:       0.020,  // labor cost channel
    interestRate:    0.070,  // investment reduction → fewer jobs
    infrastructure: -0.300,  // construction + multiplier
  },
  poverty: {
    inflation:       0.800,  // inflation tax on poor
    socialSpending: -2.200,  // transfers + services
    corruption:      0.400,  // leakage of social programs
    taxBurden:      -0.300,  // redistribution
    interestRate:    0.500,  // credit exclusion
    infrastructure: -2.000,  // connectivity & services
  },
  gini: {
    inflation:       0.150,  // regressive price increases
    socialSpending: -1.500,  // strong equalizing effect
    corruption:      0.200,  // capture by elites
    taxBurden:      -0.300,  // progressive redistribution
    interestRate:    0.100,  // capital vs. labor income
    infrastructure: -1.000,  // regional convergence
  },
  confidence: {
    inflation:      -0.080,  // erosion of central bank credibility
    socialSpending: -0.010,  // minimal trust gain under high corruption
    corruption:     -0.050,  // already priced into baseline; marginal effect
    taxBurden:       0.150,  // state capacity signal
    interestRate:    0.030,  // stability signal
    infrastructure:  1.200,  // visible public works
  },
  migration: {
    inflation:       0.400,  // cost-of-living push factor
    socialSpending: -0.100,  // retention via programs
    corruption:      0.300,  // governance push factor
    taxBurden:      -0.100,  // service retention
    interestRate:    0.200,  // economic uncertainty
    infrastructure: -1.000,  // quality-of-life retention
  },
}

// ─── SLIDER CONFIG ───────────────────────────────────────────────────────────
const SLIDER_CONFIG = [
  {
    key: 'inflation',
    label: 'Inflación',
    unit: '%',
    min: 0,
    max: 30,
    step: 0.1,
    description: 'Tasa de inflación anual. Controlada por política m…',
  },
  {
    key: 'socialSpending',
    label: 'Gasto Social',
    unit: '% PIB',
    min: 0,
    max: 20,
    step: 0.1,
    description: 'Inversión pública en salud, educación y programas…',
  },
  {
    key: 'corruption',
    label: 'Corrupción',
    unit: '/100',
    min: 0,
    max: 100,
    step: 1,
    description: 'Índice de percepción de corrupción. 0 = sin corrup…',
  },
  {
    key: 'taxBurden',
    label: 'Carga Fiscal',
    unit: '%',
    min: 0,
    max: 40,
    step: 0.5,
    description: 'Impuestos como porcentaje del PIB. Afecta inversió…',
  },
  {
    key: 'interestRate',
    label: 'Tasa de Interés',
    unit: '%',
    min: 0,
    max: 25,
    step: 0.5,
    description: 'Tasa de política monetaria. Alta tasa enfría econo…',
  },
  {
    key: 'infrastructure',
    label: 'Inversión en Infraestructura',
    unit: '% PIB',
    min: 0,
    max: 10,
    step: 0.1,
    description: 'Gasto en infraestructura pública: carreteras, agua…',
  },
]

// ─── CAUSAL MODEL ────────────────────────────────────────────────────────────
function computeOutputs(inputs, baselineInputs) {
  const result = {}
  for (const [outputKey, coeffs] of Object.entries(COEFFICIENTS)) {
    let value = BASELINE_OUTPUTS[outputKey]
    for (const [inputKey, coeff] of Object.entries(coeffs)) {
      value += (inputs[inputKey] - baselineInputs[inputKey]) * coeff
    }
    result[outputKey] = value
  }
  return result
}

function computeScore(outputs, inputs) {
  const pibPenalty       = Math.max(0, 5 - outputs.pibGrowth) * 2.5
  const unemployPenalty  = Math.max(0, outputs.unemployment - 5) * 1.5
  const povertyPenalty   = outputs.poverty * 0.2
  const giniPenalty      = Math.max(0, outputs.gini - 30) * 0.1
  const confBonus        = outputs.confidence * 0.1
  const migrationPenalty = Math.max(0, outputs.migration - 5) * 0.3
  const inflationPenalty = Math.max(0, inputs.inflation - 3) * 0.4

  return Math.round(
    Math.min(100, Math.max(0,
      100 - pibPenalty - unemployPenalty - povertyPenalty
          - giniPenalty + confBonus - migrationPenalty - inflationPenalty
    ))
  )
}

function getScoreLabel(score) {
  if (score >= 80) return { text: 'ÓPTIMO',    color: '#00ff41' }
  if (score >= 65) return { text: 'SALUDABLE', color: '#00ff41' }
  if (score >= 50) return { text: 'RIESGO',    color: '#fbbf24' }
  if (score >= 35) return { text: 'CRÍTICO',   color: '#ef4444' }
  return               { text: 'COLAPSO',   color: '#ef4444' }
}

function getIndicatorStatus(key, value) {
  const thresholds = {
    pibGrowth:    { ok: 3,    warn: 1 },
    unemployment: { ok: 6,    warn: 10 },  // lower is better
    poverty:      { ok: 20,   warn: 35 },  // lower is better
    gini:         { ok: 35,   warn: 45 },  // lower is better
    confidence:   { ok: 50,   warn: 25 },
    migration:    { ok: 20,   warn: 40 },  // lower is better
  }
  const t = thresholds[key]
  const higherIsBetter = ['pibGrowth', 'confidence'].includes(key)
  if (higherIsBetter) {
    if (value >= t.ok)   return { label: 'BIEN',     color: '#00ff41' }
    if (value >= t.warn) return { label: 'RIESGO',   color: '#fbbf24' }
    return                      { label: 'CRÍTICO',  color: '#ef4444' }
  } else {
    if (value <= t.ok)   return { label: 'BIEN',     color: '#00ff41' }
    if (value <= t.warn) return { label: 'RIESGO',   color: '#fbbf24' }
    return                      { label: 'CRÍTICO',  color: '#ef4444' }
  }
}

// ─── GAUGE COMPONENT ─────────────────────────────────────────────────────────
function Gauge({ value, max, color, size = 100 }) {
  const pct = Math.min(1, Math.max(0, value / max))
  const startAngle = -210
  const endAngle   = 30
  const totalDeg   = endAngle - startAngle  // 240°
  const angle      = startAngle + pct * totalDeg

  const toRad = (deg) => (deg * Math.PI) / 180
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38

  const arcPath = (start, end, radius) => {
    const s = toRad(start)
    const e = toRad(end)
    const x1 = cx + radius * Math.cos(s)
    const y1 = cy + radius * Math.sin(s)
    const x2 = cx + radius * Math.cos(e)
    const y2 = cy + radius * Math.sin(e)
    const large = end - start > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  const needleX = cx + r * 0.9 * Math.cos(toRad(angle))
  const needleY = cy + r * 0.9 * Math.sin(toRad(angle))

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.75}`}>
      {/* Track */}
      <path
        d={arcPath(startAngle, endAngle, r)}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={size * 0.08}
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={arcPath(startAngle, startAngle + pct * totalDeg, r)}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.08}
        strokeLinecap="round"
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke={color}
        strokeWidth={size * 0.025}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={size * 0.04} fill={color} />
    </svg>
  )
}

// ─── INDICATOR CARD ──────────────────────────────────────────────────────────
function IndicatorCard({ label, value, baselineValue, unit, maxScale, formatValue }) {
  const status = getIndicatorStatus(label === 'Crecimiento PIB' ? 'pibGrowth'
    : label === 'Desempleo' ? 'unemployment'
    : label === 'Pobreza' ? 'poverty'
    : label === 'Desigualdad (Gini)' ? 'gini'
    : label === 'Confianza Inst.' ? 'confidence'
    : 'migration', value)

  const delta = value - baselineValue
  const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(1)
  const fv = formatValue ? formatValue(value) : value.toFixed(1)

  return (
    <div className="indicator-card">
      <div className="indicator-header">
        <span className="indicator-label">{label}</span>
        <span className="indicator-status" style={{ color: status.color, borderColor: status.color }}>
          {status.label}
        </span>
      </div>
      <div className="indicator-gauge">
        <Gauge value={value} max={maxScale} color={status.color} size={90} />
      </div>
      <div className="indicator-value" style={{ color: status.color }}>
        {fv}
        {unit && <span className="indicator-unit">{unit}</span>}
      </div>
      <div className="indicator-baseline">
        BASE {baselineValue.toFixed(1)}{unit}
        <span
          className="indicator-delta"
          style={{ color: delta > 0 ? '#ef4444' : '#00ff41' }}
        >
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
        </span>
      </div>
    </div>
  )
}

// ─── POLICY SLIDER ───────────────────────────────────────────────────────────
function PolicySlider({ config, value, baselineValue, onChange }) {
  const pct = ((value - config.min) / (config.max - config.min)) * 100
  const delta = value - baselineValue

  return (
    <div className="policy-slider">
      <div className="policy-slider-header">
        <div>
          <div className="policy-slider-label">{config.label}</div>
          <div className="policy-slider-desc">{config.description}</div>
        </div>
        <div className="policy-slider-value">
          {config.key === 'socialSpending' || config.key === 'infrastructure'
            ? value.toFixed(1)
            : config.key === 'corruption'
            ? value.toFixed(0)
            : value.toFixed(1)}
          <span className="policy-slider-unit">{config.unit}</span>
          {delta !== 0 && (
            <span
              className="policy-slider-delta"
              style={{ color: delta > 0 ? '#fbbf24' : '#00ff41' }}
            >
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="slider-track-wrapper">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="slider-input"
          style={{ '--pct': `${pct}%` }}
        />
        <div className="slider-labels">
          <span>{config.min}{config.unit}</span>
          <span style={{ color: '#555' }}>base: {baselineValue}{config.unit}</span>
          <span>{config.max}{config.unit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── COMPARISON TABLE ────────────────────────────────────────────────────────
function ComparisonTable({ outputs, baselineOutputs }) {
  const rows = [
    { label: 'Crecimiento PIB', key: 'pibGrowth', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, higherBetter: true },
    { label: 'Desempleo',       key: 'unemployment', format: (v) => `${v.toFixed(1)}%`, higherBetter: false },
    { label: 'Pobreza',         key: 'poverty',      format: (v) => `${v.toFixed(1)}%`, higherBetter: false },
    { label: 'Desigualdad (Gini)', key: 'gini',      format: (v) => v.toFixed(1),       higherBetter: false },
    { label: 'Confianza Inst.', key: 'confidence',   format: (v) => `${v.toFixed(0)}/100`, higherBetter: true },
    { label: 'Presión Migratoria', key: 'migration', format: (v) => `${v.toFixed(0)}/100`, higherBetter: false },
  ]

  return (
    <div className="comparison-table">
      <div className="comparison-title">★ COMPARATIVA BASELINE VS ESCENARIO ACTUAL</div>
      <div className="comparison-header">
        <span>INDICADOR</span>
        <span>BASELINE</span>
        <span>ACTUAL</span>
        <span>ΔCAMBIO</span>
      </div>
      {rows.map((row) => {
        const delta = outputs[row.key] - baselineOutputs[row.key]
        const improved = row.higherBetter ? delta > 0 : delta < 0
        const deltaStr = (delta > 0 ? '+' : '') + delta.toFixed(1)
        return (
          <div key={row.key} className="comparison-row">
            <span>{row.label}</span>
            <span className="comparison-baseline">{row.format(baselineOutputs[row.key])}</span>
            <span style={{ color: improved ? '#00ff41' : '#ef4444' }}>
              {row.format(outputs[row.key])}
            </span>
            <span
              style={{ color: improved ? '#00ff41' : '#ef4444' }}
              className="comparison-delta"
            >
              {improved ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── RADAR DIMENSIONS ────────────────────────────────────────────────────────
function getRadarDimensions(outputs) {
  return {
    pib:       Math.round(Math.min(100, Math.max(0, outputs.pibGrowth * 20 + 9))),
    empleo:    Math.round(Math.min(100, Math.max(0, 100 - outputs.unemployment * 3.3))),
    equidad:   Math.round(Math.min(100, Math.max(0, 100 - outputs.poverty * 1.4))),
    igualdad:  Math.round(Math.min(100, Math.max(0, 100 - outputs.gini * 0.87))),
    confianza: Math.round(Math.min(100, Math.max(0, outputs.confidence))),
    retencion: Math.round(Math.min(100, Math.max(0, 100 - outputs.migration))),
  }
}

// ─── RADAR SUBSCORES ─────────────────────────────────────────────────────────
function RadarSubScore({ label, value, baseline }) {
  const delta = value - baseline
  return (
    <div className="radar-subscore">
      <div className="radar-subscore-label">{label}</div>
      <div className="radar-subscore-values">
        <span className="radar-subscore-val">{value}</span>
        <span className="radar-subscore-max">/100</span>
        {delta !== 0 && (
          <span
            className="radar-subscore-delta"
            style={{ color: delta > 0 ? '#00ff41' : '#ef4444' }}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── AI REPORT ───────────────────────────────────────────────────────────────
async function generateReport(inputs, outputs, score, presetLabel) {
  const prompt = `Eres un economista senior especializado en desarrollo regional latinoamericano.
Analiza el siguiente escenario de política económica para ${presetLabel} y genera un REPORTE EJECUTIVO en español.

VARIABLES DE POLÍTICA:
- Inflación: ${inputs.inflation}%
- Gasto Social: ${inputs.socialSpending}% del PIB
- Corrupción (índice): ${inputs.corruption}/100
- Carga Fiscal: ${inputs.taxBurden}% del PIB
- Tasa de Interés: ${inputs.interestRate}%
- Inversión en Infraestructura: ${inputs.infrastructure}% del PIB

RESULTADOS DEL MODELO CAUSAL:
- Crecimiento PIB: ${outputs.pibGrowth.toFixed(1)}%
- Desempleo: ${outputs.unemployment.toFixed(1)}%
- Pobreza: ${outputs.poverty.toFixed(1)}%
- Desigualdad (Gini): ${outputs.gini.toFixed(1)}
- Confianza Institucional: ${outputs.confidence.toFixed(0)}/100
- Presión Migratoria: ${outputs.migration.toFixed(0)}/100
- Score de Salud Económica: ${score}/100

El reporte debe incluir:
1. DIAGNÓSTICO GENERAL (2-3 párrafos profundos)
2. EFECTOS PRINCIPALES (análisis de los 3 factores más críticos)
3. RECOMENDACIONES DE POLÍTICA (3-5 acciones concretas y priorizadas)
4. RIESGOS Y ADVERTENCIAS (2-3 riesgos de mediano plazo)

Usa un tono técnico pero accesible. Sé específico y usa datos del escenario.
Formato: usa encabezados en mayúsculas, párrafos densos con análisis real, no bullet points superficiales.`

  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// ─── REPORT RENDERER ─────────────────────────────────────────────────────────
function ReportContent({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="report-content">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="report-spacer" />
        if (line.match(/^#{1,3}\s/)) {
          const content = line.replace(/^#{1,3}\s/, '')
          return <h3 key={i} className="report-h3">{content}</h3>
        }
        if (line.match(/^[A-ZÁÉÍÓÚÑ\s]{4,}$/) && line.trim().length < 60) {
          return <h4 key={i} className="report-section">{line}</h4>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="report-bold">{line.replace(/\*\*/g, '')}</p>
        }
        return <p key={i} className="report-para">{line}</p>
      })}
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SimuladorEconomico() {
  const [activePreset, setActivePreset] = useState('hermosillo')
  const [inputs, setInputs] = useState(PRESETS.hermosillo.inputs)
  const [tab, setTab] = useState('indicadores')
  const [history, setHistory] = useState([])
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)

  const baselineInputs = PRESETS[activePreset].inputs
  const outputs = computeOutputs(inputs, baselineInputs)
  const baselineOutputs = computeOutputs(baselineInputs, baselineInputs)
  const score = computeScore(outputs, inputs)
  const baselineScore = computeScore(baselineOutputs, baselineInputs)
  const scoreLabel = getScoreLabel(score)
  const scoreDelta = score - baselineScore

  // Track history on input change
  useEffect(() => {
    setHistory((prev) => {
      const entry = {
        pibGrowth: parseFloat(outputs.pibGrowth.toFixed(2)),
        unemployment: parseFloat(outputs.unemployment.toFixed(2)),
        poverty: parseFloat(outputs.poverty.toFixed(2)),
        score,
        t: prev.length,
      }
      const next = [...prev, entry].slice(-10)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs])

  const handleInputChange = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handlePresetChange = (presetKey) => {
    setActivePreset(presetKey)
    setInputs(PRESETS[presetKey].inputs)
    setReport(null)
    setReportError(null)
  }

  const handleResetToBaseline = () => {
    setInputs(baselineInputs)
    setReport(null)
    setReportError(null)
  }

  const handleGenerateReport = async () => {
    setTab('reporte')
    setReportLoading(true)
    setReportError(null)
    try {
      const text = await generateReport(inputs, outputs, score, PRESETS[activePreset].label)
      setReport(text)
    } catch (err) {
      setReportError(err.message)
    } finally {
      setReportLoading(false)
    }
  }

  const handlePrintReport = () => {
    window.print()
  }

  // Radar data
  const dims = getRadarDimensions(outputs)
  const baselineDims = getRadarDimensions(baselineOutputs)
  const radarData = [
    { subject: 'PIB',      actual: dims.pib,       baseline: baselineDims.pib },
    { subject: 'EMPLEO',   actual: dims.empleo,    baseline: baselineDims.empleo },
    { subject: 'EQUIDAD',  actual: dims.equidad,   baseline: baselineDims.equidad },
    { subject: 'IGUALDAD', actual: dims.igualdad,  baseline: baselineDims.igualdad },
    { subject: 'CONFIANZA',actual: dims.confianza, baseline: baselineDims.confianza },
    { subject: 'RETENCIÓN',actual: dims.retencion, baseline: baselineDims.retencion },
  ]

  const TABS = [
    { key: 'indicadores', label: 'INDICADORES' },
    { key: 'radar',       label: 'RADAR' },
    { key: 'tendencia',   label: 'TENDENCIA' },
    { key: 'reporte',     label: 'REPORTE IA' },
  ]

  return (
    <div className="sim-root">
      {/* ── HEADER ── */}
      <header className="sim-header">
        <div className="sim-header-left">
          <h1 className="sim-title">SIMULADOR DE POLÍTICA ECONÓMICA</h1>
          <p className="sim-subtitle">
            MODELO CAUSAL &nbsp;·&nbsp; REFERENCIA: {PRESETS[activePreset].label.toUpperCase()} &nbsp;·&nbsp; COEFICIENTES FMI/BANCO MUNDIAL
          </p>
        </div>
        <div className="sim-header-right">
          <button className="btn-baseline" onClick={handleResetToBaseline}>
            ↺ BASELINE
          </button>
          {tab === 'reporte' && report && (
            <button className="btn-print" onClick={handlePrintReport}>
              ⎙ EXPORTAR PDF
            </button>
          )}
          <button
            className="btn-report"
            onClick={handleGenerateReport}
            disabled={reportLoading}
          >
            {reportLoading ? '◌ ANALIZANDO...' : '◌ GENERAR REPORTE'}
          </button>
        </div>
      </header>

      {/* ── PRESET SELECTOR ── */}
      <div className="preset-bar">
        <span className="preset-label">CIUDAD / ESCENARIO:</span>
        <div className="preset-buttons">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`preset-btn ${activePreset === key ? 'preset-btn-active' : ''}`}
              onClick={() => handlePresetChange(key)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HEALTH SCORE BAR ── */}
      <div className="score-bar">
        <div className="score-bar-label">SALUD ECONÓMICA GENERAL</div>
        <div className="score-bar-content">
          <div className="score-number" style={{ color: scoreLabel.color }}>
            {score}
          </div>
          <span className="score-max">/100</span>
          <span className="score-status" style={{ color: scoreLabel.color }}>
            {scoreLabel.text}
          </span>
          {scoreDelta !== 0 && (
            <span
              className="score-delta"
              style={{ color: scoreDelta > 0 ? '#00ff41' : '#ef4444' }}
            >
              {scoreDelta > 0 ? '▲' : '▼'} {Math.abs(scoreDelta)} VS BASELINE
            </span>
          )}
          <div className="score-track">
            <div
              className="score-fill"
              style={{
                width: `${score}%`,
                background: score >= 65 ? '#00ff41' : score >= 50 ? '#fbbf24' : '#ef4444',
              }}
            />
            <div
              className="score-baseline-marker"
              style={{ left: `${baselineScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <nav className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'tab-btn-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <div className="sim-layout">
        {/* ── LEFT PANEL: SLIDERS ── */}
        <aside className="sim-sidebar">
          <div className="sidebar-title">★ VARIABLES DE POLÍTICA</div>
          {SLIDER_CONFIG.map((config) => (
            <PolicySlider
              key={config.key}
              config={config}
              value={inputs[config.key]}
              baselineValue={baselineInputs[config.key]}
              onChange={(v) => handleInputChange(config.key, v)}
            />
          ))}
          <div className="sidebar-legend">
            <div>LEYENDA</div>
            <div>— Valor actual &nbsp;|&nbsp; Baseline</div>
            <div>▲▼ Δ vs baseline</div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="sim-main">
          {/* ── INDICADORES TAB ── */}
          {tab === 'indicadores' && (
            <div className="tab-indicadores">
              <div className="indicator-grid">
                <IndicatorCard
                  label="Crecimiento PIB"
                  value={outputs.pibGrowth}
                  baselineValue={baselineOutputs.pibGrowth}
                  unit="%"
                  maxScale={10}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                />
                <IndicatorCard
                  label="Desempleo"
                  value={outputs.unemployment}
                  baselineValue={baselineOutputs.unemployment}
                  unit="%"
                  maxScale={30}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
                <IndicatorCard
                  label="Pobreza"
                  value={outputs.poverty}
                  baselineValue={baselineOutputs.poverty}
                  unit="%"
                  maxScale={80}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
                <IndicatorCard
                  label="Desigualdad (Gini)"
                  value={outputs.gini}
                  baselineValue={baselineOutputs.gini}
                  unit=""
                  maxScale={80}
                  formatValue={(v) => v.toFixed(1)}
                />
                <IndicatorCard
                  label="Confianza Inst."
                  value={outputs.confidence}
                  baselineValue={baselineOutputs.confidence}
                  unit="/100"
                  maxScale={100}
                  formatValue={(v) => `${v.toFixed(0)}/100`}
                />
                <IndicatorCard
                  label="Presión Migratoria"
                  value={outputs.migration}
                  baselineValue={baselineOutputs.migration}
                  unit="/100"
                  maxScale={100}
                  formatValue={(v) => `${v.toFixed(0)}/100`}
                />
              </div>
              <ComparisonTable outputs={outputs} baselineOutputs={baselineOutputs} />
            </div>
          )}

          {/* ── RADAR TAB ── */}
          {tab === 'radar' && (
            <div className="tab-radar">
              <div className="tab-section-title">★ PERFIL MULTIDIMENSIONAL — ESCENARIO VS BASELINE</div>
              <div className="radar-layout">
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#1a1a1a" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#555', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="BASELINE"
                      dataKey="baseline"
                      stroke="#444"
                      fill="#444"
                      fillOpacity={0.15}
                    />
                    <Radar
                      name="ESCENARIO ACTUAL"
                      dataKey="actual"
                      stroke="#00ff41"
                      fill="#00ff41"
                      fillOpacity={0.2}
                    />
                    <Legend
                      formatter={(v) => (
                        <span style={{ color: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                          {v}
                        </span>
                      )}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="radar-subscores">
                  {[
                    { label: 'PIB',       val: dims.pib,       base: baselineDims.pib },
                    { label: 'EMPLEO',    val: dims.empleo,    base: baselineDims.empleo },
                    { label: 'EQUIDAD',   val: dims.equidad,   base: baselineDims.equidad },
                    { label: 'IGUALDAD',  val: dims.igualdad,  base: baselineDims.igualdad },
                    { label: 'CONFIANZA', val: dims.confianza, base: baselineDims.confianza },
                    { label: 'RETENCIÓN', val: dims.retencion, base: baselineDims.retencion },
                  ].map((d) => (
                    <RadarSubScore
                      key={d.label}
                      label={d.label}
                      value={d.val}
                      baseline={d.base}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TENDENCIA TAB ── */}
          {tab === 'tendencia' && (
            <div className="tab-tendencia">
              <div className="tab-section-title">★ EVOLUCIÓN TEMPORAL — ÚLTIMOS 10 CAMBIOS</div>
              {history.length < 2 ? (
                <p className="tendencia-empty">
                  Mueve los controles para generar datos de tendencia.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={history} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid stroke="#111" strokeDasharray="3 3" />
                      <XAxis dataKey="t" tick={false} axisLine={{ stroke: '#333' }} />
                      <YAxis
                        tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: '#333' }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#0d0d0d', border: '1px solid #333', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                        labelStyle={{ color: '#555' }}
                      />
                      <Legend
                        formatter={(v) => (
                          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}>{v}</span>
                        )}
                      />
                      <Line type="monotone" dataKey="pibGrowth"   name="PIB %"       stroke="#00ff41" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="unemployment" name="Desempleo %"  stroke="#fbbf24" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="poverty"      name="Pobreza %"    stroke="#ef4444" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="tendencia-score-label">SCORE GENERAL</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={history} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid stroke="#111" strokeDasharray="3 3" />
                      <XAxis dataKey="t" tick={false} axisLine={{ stroke: '#333' }} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={{ stroke: '#333' }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#0d0d0d', border: '1px solid #333', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                      />
                      <Line type="monotone" dataKey="score" name="Score" stroke="#00ff41" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {/* ── REPORTE IA TAB ── */}
          {tab === 'reporte' && (
            <div className="tab-reporte">
              <div className="reporte-header">
                <div>
                  <div className="reporte-title">REPORTE EJECUTIVO — ANÁLISIS DE ESCENARIO</div>
                  <div className="reporte-meta">
                    Score: {score}/100 &nbsp;·&nbsp;
                    <span style={{ color: scoreLabel.color }}>{scoreLabel.text}</span>
                    &nbsp;·&nbsp; Generado por Claude
                  </div>
                </div>
                {report && (
                  <button className="btn-regenerate" onClick={handleGenerateReport} disabled={reportLoading}>
                    ↺ REGENERAR
                  </button>
                )}
              </div>

              {!report && !reportLoading && !reportError && (
                <div className="reporte-empty">
                  <p>Presiona <strong>GENERAR REPORTE</strong> para analizar el escenario con IA.</p>
                </div>
              )}

              {reportLoading && (
                <div className="reporte-loading">
                  <div className="loading-spinner">◌</div>
                  <p>ANALIZANDO ESCENARIO...</p>
                  <p className="loading-sub">Consultando modelo económico con Claude</p>
                </div>
              )}

              {reportError && (
                <div className="reporte-error">
                  <p>Error al generar el reporte: {reportError}</p>
                  <p className="error-hint">Verifica que VITE_ANTHROPIC_API_KEY esté configurada en .env y el servidor proxy esté activo.</p>
                </div>
              )}

              {report && !reportLoading && (
                <div id="print-report">
                  <div className="print-only print-header">
                    <h1>SIMULADOR DE POLÍTICA ECONÓMICA</h1>
                    <p>Escenario: {PRESETS[activePreset].label} · Score: {score}/100 · {scoreLabel.text}</p>
                  </div>
                  <ReportContent text={report} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
