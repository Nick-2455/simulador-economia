# Especificación del Modelo Causal
## Simulador de Política Económica — Documentación Técnica

> **Versión:** 1.0 · **Fecha:** Marzo 2026
> **Autor:** Nicolás Peralta · **Implementación:** `src/SimuladorEconomico.jsx`

---

## Índice

1. [Visión general](#1-visión-general)
2. [Variables de política (inputs)](#2-variables-de-política-inputs)
3. [Variables de resultado (outputs)](#3-variables-de-resultado-outputs)
4. [Formulación matemática](#4-formulación-matemática)
5. [Baseline empírico — Hermosillo 2024](#5-baseline-empírico--hermosillo-2024)
6. [Coeficientes y justificación académica](#6-coeficientes-y-justificación-académica)
   - [6.1 Crecimiento del PIB](#61-crecimiento-del-pib)
   - [6.2 Desempleo](#62-desempleo)
   - [6.3 Pobreza](#63-pobreza)
   - [6.4 Desigualdad (Gini)](#64-desigualdad-gini)
   - [6.5 Confianza Institucional](#65-confianza-institucional)
   - [6.6 Presión Migratoria](#66-presión-migratoria)
7. [Score de Salud Económica](#7-score-de-salud-económica)
8. [Dimensiones del Radar](#8-dimensiones-del-radar)
9. [Supuestos y limitaciones](#9-supuestos-y-limitaciones)
10. [Referencias](#10-referencias)

---

## 1. Visión general

El modelo es un **sistema de ecuaciones lineales de forma reducida** que traduce seis variables de política económica en seis indicadores de resultado. No es un modelo de equilibrio general (DSGE) ni un modelo econométrico con estimación de parámetros; es un modelo calibrado cuyos coeficientes están anclados en estimaciones promedio reportadas en la literatura académica y organismos multilaterales para el contexto latinoamericano.

La filosofía de diseño privilegia **interpretabilidad y velocidad de cómputo** sobre precisión econométrica. El objetivo es pedagógico: ilustrar la dirección y magnitud relativa de las relaciones causales entre política y resultados.

---

## 2. Variables de política (inputs)

| Variable | Símbolo | Rango | Unidad | Descripción |
|---|---|---|---|---|
| Inflación | π | 0 – 30 | % anual | Tasa de inflación. Proxy de estabilidad monetaria y expectativas |
| Gasto Social | G_s | 0 – 20 | % del PIB | Inversión pública en salud, educación, protección social y programas de transferencias |
| Corrupción | C | 0 – 100 | índice | Índice de percepción de corrupción (escala TI). 0 = sin corrupción, 100 = máxima corrupción |
| Carga Fiscal | T | 0 – 40 | % del PIB | Recaudación tributaria total como porcentaje del PIB |
| Tasa de Interés | r | 0 – 25 | % anual | Tasa de política monetaria del banco central |
| Infraestructura | I | 0 – 10 | % del PIB | Inversión pública en infraestructura física (carreteras, agua, energía, telecomunicaciones) |

---

## 3. Variables de resultado (outputs)

| Variable | Símbolo | Unidad | Dirección deseable |
|---|---|---|---|
| Crecimiento del PIB | y | % anual | ↑ mayor es mejor |
| Desempleo | u | % de la PEA | ↓ menor es mejor |
| Pobreza | p | % de la población | ↓ menor es mejor |
| Desigualdad (Gini) | G | índice 0–100 | ↓ menor es mejor |
| Confianza Institucional | Cf | índice 0–100 | ↑ mayor es mejor |
| Presión Migratoria | M | índice 0–100 | ↓ menor es mejor |

---

## 4. Formulación matemática

### 4.1 Ecuación general

Cada output se calcula como una corrección lineal sobre el valor baseline:

$$\hat{y}_k = y_k^* + \sum_{j} \beta_{kj} \cdot (\tilde{x}_j - x_j^*)$$

Donde:
- $\hat{y}_k$ = valor estimado del output $k$ bajo el escenario actual
- $y_k^*$ = valor baseline empírico del output $k$ (Hermosillo 2024)
- $\beta_{kj}$ = coeficiente del input $j$ sobre el output $k$
- $\tilde{x}_j$ = valor actual del input $j$ (controlado por el usuario)
- $x_j^*$ = valor baseline del input $j$

### 4.2 Interpretación de los coeficientes

$\beta_{kj}$ representa el **efecto marginal ceteris paribus**: el cambio en el output $k$ ante un incremento de una unidad en el input $j$, manteniendo todos los demás inputs en su valor baseline.

Por ejemplo, $\beta_{\text{PIB}, \pi} = -0.080$ significa que un punto porcentual adicional de inflación reduce el crecimiento del PIB en **0.08 puntos porcentuales**, todo lo demás constante.

### 4.3 Implementación en código

```javascript
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
```

---

## 5. Baseline empírico — Hermosillo 2024

El punto de referencia del modelo son los valores estimados para Hermosillo, Sonora (México) en 2024. Estos valores sirven como anclaje empírico y permiten que los deltas del modelo sean interpretables en un contexto real.

### Inputs baseline

| Variable | Valor | Fuente de referencia |
|---|---|---|
| Inflación | 4.8% | INEGI / Banxico |
| Gasto Social | 4.25% PIB | SHCP / OCDE |
| Corrupción | 62/100 | Transparencia Internacional — México |
| Carga Fiscal | 16% PIB | SAT / OCDE México |
| Tasa de Interés | 11% | Banxico (tasa objetivo 2024) |
| Infraestructura | 3.1% PIB | Estimación IMCO / BID |

### Outputs baseline

| Variable | Valor |
|---|---|
| Crecimiento PIB | +1.7% |
| Desempleo | 11.6% |
| Pobreza | 32.4% |
| Desigualdad (Gini) | 46.9 |
| Confianza Institucional | 8/100 |
| Presión Migratoria | 17/100 |

> **Nota:** Los valores de desempleo y pobreza incluyen empleo informal y pobreza multidimensional (metodología CONEVAL), que producen cifras más altas que las estadísticas de empleo formal solamente.

---

## 6. Coeficientes y justificación académica

### 6.1 Crecimiento del PIB

**Ecuación:**

$$\hat{y} = 1.7 + \beta_\pi(\pi - 4.8) + \beta_{G_s}(G_s - 4.25) + \beta_C(C - 62) + \beta_T(T - 16) + \beta_r(r - 11) + \beta_I(I - 3.1)$$

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **−0.080** | La inflación eleva la incertidumbre, distorsiona precios relativos y contrae la inversión privada. Efecto contractivo documentado en modelos neo-keynesianos y Nueva Curva de Phillips |
| Gasto Social (G_s) | **+0.010** | Multiplicador keynesiano de gasto social, atenuado por posible efecto crowding-out y filtraciones por corrupción |
| Corrupción (C) | **−0.015** | La corrupción eleva costos de transacción, reduce la productividad del capital público y desincentiva la inversión extranjera directa |
| Carga Fiscal (T) | **−0.030** | Impuestos elevados reducen el retorno al capital y al trabajo, contrayendo inversión y oferta laboral (efecto de sustitución) |
| Tasa de Interés (r) | **−0.080** | Canal de transmisión monetaria: tasas altas encarecen el crédito, reducen inversión fija y consumo de bienes duraderos |
| Infraestructura (I) | **+0.200** | Mayor coeficiente del modelo: la inversión en infraestructura pública eleva la productividad total de factores y actúa como complemento del capital privado |

**Fundamento teórico:** Función de producción neoclásica con capital público (Solow, 1956). El efecto de la tasa de interés sigue el modelo IS-LM ampliado. La infraestructura como factor de producción está documentada en Aschauer (1989) y el marco de Barro (1990) sobre gasto productivo del gobierno.

**Referencia principal:**
> Solow, R. M. (1956). A contribution to the theory of economic growth. *The Quarterly Journal of Economics, 70*(1), 65–94.

---

### 6.2 Desempleo

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **+0.080** | Sorpresas inflacionarias generan incertidumbre que retrasa decisiones de contratación. Relación inversa con la Curva de Phillips en el corto plazo, pero directa en el mediano por expectativas desancladas |
| Gasto Social (G_s) | **−0.010** | Programas de empleo público y políticas activas del mercado laboral reducen marginalmente el desempleo friccional |
| Corrupción (C) | **+0.030** | La mala asignación de recursos públicos y la economía informal elevada (correlacionada con corrupción) excluyen trabajadores del mercado formal |
| Carga Fiscal (T) | **+0.020** | Impuestos al trabajo elevan el costo laboral para las firmas, reduciendo demanda de empleo formal |
| Tasa de Interés (r) | **+0.070** | Tasas altas reducen la inversión en capital físico, lo que contrae la demanda de trabajo en el mediano plazo |
| Infraestructura (I) | **−0.300** | Mayor coeficiente negativo: la construcción de infraestructura genera empleo directo e indirecto significativo; además, mejora la movilidad laboral |

**Fundamento teórico:** Curva de Phillips original (Samuelson & Solow, 1960) y extensiones con expectativas adaptativas. La relación inflación-empleo se captura con signos opuestos según el horizonte temporal considerado.

**Referencia principal:**
> Samuelson, P. A., & Solow, R. M. (1960). Analytical aspects of anti-inflation policy. *The American Economic Review, 50*(2), 177–194.

---

### 6.3 Pobreza

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **+0.800** | La inflación actúa como impuesto regresivo: los hogares pobres destinan mayor proporción de su ingreso a bienes básicos (alimentos, transporte) cuyos precios son más volátiles. Coeficiente elevado reflejando la alta exposición de quintiles inferiores |
| Gasto Social (G_s) | **−2.200** | Efecto más fuerte del modelo en pobreza: transferencias directas (programas tipo Oportunidades/Juntos), servicios de salud y educación pública tienen impacto demostrado en reducción de pobreza monetaria y multidimensional |
| Corrupción (C) | **+0.400** | La corrupción filtra recursos de programas sociales y reduce la efectividad del gasto. En contextos de alta corrupción, el multiplicador del gasto social cae drásticamente |
| Carga Fiscal (T) | **−0.300** | Mayor recaudación (con redistribución progresiva) financia servicios públicos que reducen la pobreza no monetaria |
| Tasa de Interés (r) | **+0.500** | Tasas altas excluyen a los pobres del crédito formal, perpetuando trampas de pobreza. Además, reducen inversión y empleo |
| Infraestructura (I) | **−2.000** | La conectividad física (carreteras, agua potable, electricidad) es uno de los predictores más robustos de reducción de pobreza rural en América Latina |

**Fundamento teórico:** La relación inflación-pobreza sigue a Loayza & Raddatz (2010): la composición del crecimiento importa, siendo la inflación particularmente dañina para los pobres. El coeficiente del gasto social refleja estimaciones de Lustig para América Latina.

**Referencias principales:**
> Loayza, N., & Raddatz, C. (2010). The composition of growth matters for poverty alleviation. *Journal of Development Economics, 93*(1), 137–151.

> IMF. (2006). *Growth and reforms in Latin America: A survey of facts and arguments* (Working Paper WP/06/210). International Monetary Fund. https://www.imf.org/external/pubs/ft/wp/2006/wp06210.pdf

---

### 6.4 Desigualdad (Gini)

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **+0.150** | La inflación es regresiva: erosiona más el poder adquisitivo de quienes tienen menor proporción de activos reales (como bienes raíces) en su portafolio, ampliando la brecha entre ricos y pobres |
| Gasto Social (G_s) | **−1.500** | Mayor efecto equalizador: las transferencias y servicios universales comprimen la distribución del ingreso desde abajo. Lustig & Martínez Pabon documentan reducciones del Gini de hasta 10 puntos por políticas fiscales redistributivas en América Latina |
| Corrupción (C) | **+0.200** | La captura regulatoria por élites genera rentas que se concentran en el extremo superior de la distribución |
| Carga Fiscal (T) | **−0.300** | Sistemas tributarios más amplios (con progresividad) financian redistribución. Efecto condicionado a la progresividad efectiva del sistema |
| Tasa de Interés (r) | **+0.100** | Tasas altas favorecen a quienes poseen capital financiero sobre quienes viven de trabajo asalariado, ampliando la brecha capital-trabajo |
| Infraestructura (I) | **−1.000** | La infraestructura reduce disparidades regionales y urbano-rurales que son fuente importante de desigualdad en América Latina |

**Fundamento teórico:** Modelo de redistribución fiscal de Lustig et al. para América Latina 1960–2012. El efecto del gasto social sobre el Gini es el más documentado empíricamente para la región.

**Referencia principal:**
> Lustig, N., & Martínez Pabon, V. (2016). Fiscal policy and inequality in Latin America, 1960–2012. En *Inequality and fiscal policy* (pp. 295–332). Springer. https://doi.org/10.1007/978-3-319-44621-9_16

---

### 6.5 Confianza Institucional

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **−0.080** | La inflación erosiona la credibilidad del banco central y del gobierno. Episodios hiperinflacionarios históricos (Argentina, Venezuela) muestran correlación fuerte entre inflación y colapso de confianza institucional |
| Gasto Social (G_s) | **−0.010** | Coeficiente casi nulo: el gasto social en contextos de alta corrupción no genera confianza porque los ciudadanos perciben filtración y captura. El efecto positivo de los servicios públicos es anulado por la desconfianza en su ejecución |
| Corrupción (C) | **−0.050** | Marginal en el modelo de deltas porque la corrupción (62/100) ya está plenamente incorporada en el baseline de confianza (8/100). Incrementos adicionales de corrupción tienen efecto decreciente |
| Carga Fiscal (T) | **+0.150** | Ciudadanos que perciben que sus impuestos financian servicios de calidad muestran mayor disposición a cumplir y mayor confianza en las instituciones (teoría del intercambio fiscal) |
| Tasa de Interés (r) | **+0.030** | Política monetaria creíble y estable señaliza competencia técnica del banco central, elevando marginalmente la confianza |
| Infraestructura (I) | **+1.200** | Las obras de infraestructura son visibles y tangibles: son el canal más eficiente para construir confianza gubernamental en el corto plazo, especialmente en contextos de baja confianza de partida |

**Nota de calibración:** El valor baseline de confianza (8/100) refleja la crisis de legitimidad institucional documentada en México. El modelo no asume que el gasto social per se genera confianza cuando la corrupción es estructural — esto es consistente con la literatura sobre "trampa institucional".

**Referencia:**
> Zaman, G., Goschin, Z., & Vasile, V. (2022). Impact of corruption, unemployment and inflation on economic growth: Evidence from developing countries. *Quality & Quantity, 57*, 3427–3454. https://doi.org/10.1007/s11135-022-01481-y

---

### 6.6 Presión Migratoria

**Matriz de coeficientes:**

| Input | $\beta$ | Mecanismo causal |
|---|---|---|
| Inflación (π) | **+0.400** | Factor de expulsión por deterioro del poder adquisitivo. La inflación elevada es uno de los tres predictores principales de intención migratoria en encuestas latinoamericanas (junto con violencia e inseguridad laboral) |
| Gasto Social (G_s) | **−0.100** | Programas sociales actúan como factor de retención al reducir la brecha de bienestar percibida entre origen y destino |
| Corrupción (C) | **+0.300** | La percepción de falta de oportunidades y de que "el sistema está capturado" es factor de expulsión documentado. La corrupción reduce la esperanza de movilidad social |
| Carga Fiscal (T) | **−0.100** | Mayor recaudación (con servicios públicos de calidad) reduce incentivo a migrar al reducir la brecha de servicios con destinos más ricos |
| Tasa de Interés (r) | **+0.200** | Tasas altas contraen el crédito y el emprendimiento, reduciendo las oportunidades percibidas y elevando la emigración |
| Infraestructura (I) | **−1.000** | Efecto retención más fuerte: la conectividad, servicios básicos y calidad de vida asociada a infraestructura son factores que reducen la diferencia de bienestar con destinos migratorios |

**Fundamento teórico:** Modelo de migración de Harris-Todaro extendido con variables de gobernanza. La corrupción como factor de expulsión está documentada en encuestas Latinobarómetro y Gallup World Poll para el corredor centroamericano y México-EE.UU.

**Referencia:**
> Guerrero, M., & Rivera-Salgado, G. (2025). Mathematical modeling of economic growth, corruption, employment and inflation. *Mathematics, 13*(7), 1102. https://doi.org/10.3390/math13071102

---

## 7. Score de Salud Económica

El score es un **índice compuesto de 0 a 100** que penaliza desviaciones de valores objetivo considerados saludables para una economía latinoamericana de ingresos medios:

$$S = \text{clip}\left(100 - P_{\text{PIB}} - P_u - P_p - P_G + B_{Cf} - P_M - P_\pi,\ 0,\ 100\right)$$

Donde:

| Componente | Fórmula | Lógica |
|---|---|---|
| $P_{\text{PIB}}$ | $\max(0,\ 5 - \hat{y}) \times 2.5$ | Penaliza PIB por debajo de 5% (meta regional) |
| $P_u$ | $\max(0,\ \hat{u} - 5) \times 1.5$ | Penaliza desempleo sobre la tasa natural estimada del 5% |
| $P_p$ | $\hat{p} \times 0.2$ | Penalización directa proporcional a la tasa de pobreza |
| $P_G$ | $\max(0,\ \hat{G} - 30) \times 0.1$ | Penaliza Gini sobre 30 (umbral de "desigualdad moderada") |
| $B_{Cf}$ | $\hat{Cf} \times 0.1$ | Bono por confianza institucional |
| $P_M$ | $\max(0,\ \hat{M} - 5) \times 0.3$ | Penaliza presión migratoria sobre nivel mínimo esperado |
| $P_\pi$ | $\max(0,\ \pi - 3) \times 0.4$ | Penaliza inflación sobre meta del 3% (referencia Banxico) |

**Verificación con datos de Hermosillo 2024:**
```
S = 100 − (5−1.7)×2.5 − (11.6−5)×1.5 − 32.4×0.2 − (46.9−30)×0.1 + 8×0.1 − (17−5)×0.3 − (4.8−3)×0.4
  = 100 − 8.25 − 9.90 − 6.48 − 1.69 + 0.80 − 3.60 − 0.72
  = 70.06 ≈ 70  ✓
```

---

## 8. Dimensiones del Radar

El gráfico de radar normaliza los outputs a una escala 0–100 donde 100 siempre representa el estado óptimo:

| Dimensión | Fórmula de normalización | Interpretación |
|---|---|---|
| **PIB** | $\text{clip}(\hat{y} \times 20 + 9,\ 0,\ 100)$ | 0% ≈ score 9, 5% ≈ score 109→100 |
| **Empleo** | $\text{clip}(100 - \hat{u} \times 3.3,\ 0,\ 100)$ | Desempleo 0% → 100, 30% → 1 |
| **Equidad** | $\text{clip}(100 - \hat{p} \times 1.4,\ 0,\ 100)$ | Pobreza 0% → 100, 71% → 0 |
| **Igualdad** | $\text{clip}(100 - \hat{G} \times 0.87,\ 0,\ 100)$ | Gini 0 → 100, Gini 115 → 0 |
| **Confianza** | $\hat{Cf}$ | Directo (ya está en 0–100) |
| **Retención** | $\text{clip}(100 - \hat{M},\ 0,\ 100)$ | Migración 0 → 100, 100 → 0 |

---

## 9. Supuestos y limitaciones

### Supuestos del modelo

1. **Linealidad:** Los efectos son lineales en todo el rango de valores. En la realidad, muchas relaciones económicas son no-lineales (rendimientos decrecientes, efectos umbral, no-convexidades).

2. **Ceteris paribus:** Cada coeficiente asume que todos los demás inputs se mantienen constantes, ignorando efectos de interacción. Por ejemplo, el efecto del gasto social sobre la pobreza puede ser mayor cuando la corrupción es baja.

3. **Estática comparativa:** El modelo compara equilibrios, no captura dinámicas de ajuste (lags de política, efectos de anuncio, inercia inflacionaria).

4. **Coeficientes fijos:** Los $\beta_{kj}$ son constantes en todos los escenarios. En economías con estructuras muy distintas al baseline latinoamericano (economías muy abiertas, con regímenes cambiarios distintos, etc.), los coeficientes deberían recalibrarse.

5. **Exogeneidad de los inputs:** El modelo no captura endogeneidad (e.g., alta inflación puede reducir recaudación fiscal, alterando la carga fiscal endógenamente).

### Limitaciones operativas

- La **confianza institucional** con un baseline de 8/100 implica que el sistema está cerca del piso, por lo que los incrementos simulables son acotados y el modelo puede subestimar el colapso institucional en escenarios extremos.

- El **índice de corrupción** es tratado como variable de política, cuando en la práctica es altamente resistente al cambio de corto plazo.

- Los **presets de ciudades alternativas** (ej. Fintechia) heredan los mismos coeficientes del baseline de Hermosillo, lo que puede no ser apropiado para economías con estructuras muy distintas.

---

## 10. Referencias

> Las referencias están ordenadas por sección de uso. Formato APA 7.

---

**Modelo de crecimiento neoclásico (PIB, Infraestructura)**

Solow, R. M. (1956). A contribution to the theory of economic growth. *The Quarterly Journal of Economics, 70*(1), 65–94.

---

**Curva de Phillips — Inflación ↔ Desempleo**

Samuelson, P. A., & Solow, R. M. (1960). Analytical aspects of anti-inflation policy. *The American Economic Review, 50*(2), 177–194.

---

**Corrupción → PIB, Desempleo, Inflación**

Zaman, G., Goschin, Z., & Vasile, V. (2022). Impact of corruption, unemployment and inflation on economic growth: Evidence from developing countries. *Quality & Quantity, 57*, 3427–3454. https://doi.org/10.1007/s11135-022-01481-y

Guerrero, M., & Rivera-Salgado, G. (2025). Mathematical modeling of economic growth, corruption, employment and inflation. *Mathematics, 13*(7), 1102. https://doi.org/10.3390/math13071102

---

**Gasto Social → Desigualdad (Gini), América Latina**

Lustig, N., & Martínez Pabon, V. (2016). Fiscal policy and inequality in Latin America, 1960–2012. En *Inequality and fiscal policy* (pp. 295–332). Springer. https://doi.org/10.1007/978-3-319-44621-9_16

---

**Inflación → Pobreza, Desigualdad**

Loayza, N., & Raddatz, C. (2010). The composition of growth matters for poverty alleviation. *Journal of Development Economics, 93*(1), 137–151.

IMF. (2006). *Growth and reforms in Latin America: A survey of facts and arguments* (Working Paper WP/06/210). International Monetary Fund. https://www.imf.org/external/pubs/ft/wp/2006/wp06210.pdf

---

**Tasa de Interés → Inversión → PIB (datos actualizados)**

IMF. (2025). *World Economic Outlook database, April 2025*. International Monetary Fund. https://www.imf.org/en/publications/weo/weo-database/2025/april

---

**Contexto latinoamericano — Pobreza e Infraestructura**

World Bank. (2025, octubre). *Latin America and the Caribbean economic review: Poverty and inequality*. https://www.worldbank.org/en/region/lac/publication/perspectivas-economicas-america-latina-caribe

---

*Documento generado como parte del proyecto Simulador de Política Económica. Para reportar errores en los coeficientes o sugerir mejoras al modelo, abrir un issue en el repositorio.*
