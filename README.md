# Simulador de Política Económica

Aplicación web interactiva para simular el impacto de decisiones de política económica en ciudades latinoamericanas. Construida con React + Vite, integra un modelo causal calibrado con coeficientes del FMI y el Banco Mundial, y genera reportes ejecutivos mediante la API de Claude (Anthropic).

---

## Características

| Módulo | Descripción |
|---|---|
| **Modelo causal** | 6 variables de política → 6 indicadores de resultado, calculados como deltas desde un baseline empírico |
| **Indicadores** | Crecimiento PIB, Desempleo, Pobreza, Desigualdad (Gini), Confianza Institucional, Presión Migratoria |
| **Visualizaciones** | Medidores tipo gauge, gráfico de radar multidimensional, líneas de tendencia temporal |
| **Reporte IA** | Análisis ejecutivo generado por Claude con diagnóstico, efectos, recomendaciones y riesgos |
| **Escenarios** | Presets integrados (Hermosillo 2024, Fintechia) + creación de escenarios custom con persistencia en localStorage |
| **Exportar PDF** | Impresión optimizada del reporte desde el navegador (`window.print()`) |

---

## Stack tecnológico

```
Frontend   React 18 + Vite 5
Gráficas   Recharts 2 (RadarChart, LineChart, gauge SVG custom)
Estilos    CSS custom — sin frameworks UI (JetBrains Mono)
IA         Anthropic Claude (claude-sonnet-4-6) vía proxy Express
Proxy      Express 4 + CORS + dotenv
Dev        concurrently (Vite :5173 + proxy :3001)
```

---

## Instalación y ejecución

### Requisitos

- Node.js ≥ 18
- Una API key de Anthropic ([console.anthropic.com](https://console.anthropic.com))

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Nick-2455/simulador-economia.git
cd simulador-economia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar:
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Ejecutar en desarrollo
npm run dev
# → Frontend: http://localhost:5173
# → Proxy API: http://localhost:3001
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Vite + proxy Express en paralelo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build de producción |
| `npm run server` | Solo el proxy Express |

---

## Estructura del proyecto

```
simulador-economia/
├── src/
│   ├── SimuladorEconomico.jsx   # Componente principal — modelo + UI completa
│   ├── SimuladorEconomico.css   # Estilos (tema dark terminal + print CSS)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server.js                    # Proxy Express para la API de Anthropic
├── vite.config.js               # Proxy /api/* → localhost:3001
├── docs/
│   └── MODELO.md                # Especificación matemática del modelo causal
├── CLAUDE.md                    # Notas de arquitectura para Claude Code
├── .env.example                 # Template de variables de entorno
├── package.json
└── README.md
```

---

## Arquitectura de la API

El componente React **nunca llama directamente** a la API de Anthropic desde el navegador. El flujo es:

```
Browser (fetch /api/messages)
    ↓
Vite dev server (proxy /api → :3001)
    ↓
Express server.js (agrega x-api-key desde .env)
    ↓
https://api.anthropic.com/v1/messages
```

Esto mantiene la API key en el servidor y evita exponerla en el bundle del cliente.

---

## Escenarios

### Presets integrados

| Ciudad | Inflación | Gasto Social | Corrupción | Carga Fiscal | Tasa Interés | Infraestructura |
|---|---|---|---|---|---|---|
| **Hermosillo 2024** | 4.8% | 4.25% PIB | 62/100 | 16% PIB | 11% | 3.1% PIB |
| **Fintechia** | 8% | 3% PIB | 70/100 | 22% PIB | 9% | 2% PIB |

### Escenarios personalizados

Desde la barra de presets, el botón **+ Nuevo** abre un modal para:
- Nombrar el escenario
- Elegir valores de partida (actuales o copia de otro preset)

Los escenarios custom se guardan en `localStorage` y persisten entre sesiones. Se pueden eliminar con el botón ✕ en su chip.

---

## Modelo causal

Ver documentación completa en [`docs/MODELO.md`](./docs/MODELO.md).

El modelo es **lineal por tramos con corrección de baseline**:

```
output[k] = BASELINE[k] + Σⱼ (inputⱼ − baselineInputⱼ) × βₖⱼ
```

Donde `βₖⱼ` son los coeficientes calibrados con evidencia de literatura académica (FMI, Banco Mundial, CEPAL).

---

## Score de Salud Económica

Índice compuesto (0–100) que penaliza desviaciones de valores óptimos:

```
score = 100
  − max(0,  5 − PIB)        × 2.5   // PIB por debajo de meta 5%
  − max(0, Desempleo − 5)   × 1.5   // desempleo sobre tasa natural 5%
  − Pobreza                 × 0.2   // penalización directa
  − max(0, Gini − 30)       × 0.1   // desigualdad sobre umbral
  + Confianza               × 0.1   // bono institucional
  − max(0, Migración − 5)   × 0.3   // presión emigratoria
  − max(0, Inflación − 3)   × 0.4   // inflación sobre meta 3%
```

---

## Limitaciones

- El modelo es **lineal** y no captura no-linealidades (rendimientos decrecientes, umbrales de crisis).
- Los coeficientes están calibrados para un **contexto latinoamericano promedio**; ciudades con estructuras muy distintas pueden requerir recalibración.
- El baseline empírico de referencia es **Hermosillo 2024** — los presets alternativos heredan los mismos coeficientes.
- El reporte de IA es **descriptivo y analítico**, no predictivo con intervalos de confianza.

---

## Referencias

Ver lista completa en [`docs/MODELO.md#referencias`](./docs/MODELO.md#referencias).

---

## Licencia

MIT
