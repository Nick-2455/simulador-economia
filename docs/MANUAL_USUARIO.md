# Manual de Usuario
## Simulador de Política Económica

> **Versión:** 2.0 · **Fecha:** Marzo 2026
> **Proyecto:** Simulador de Política Económica — Modelo Causal para América Latina

---

## Índice

1. [¿Qué es el simulador?](#1-qué-es-el-simulador)
2. [Cómo iniciar la aplicación](#2-cómo-iniciar-la-aplicación)
3. [Interfaz general](#3-interfaz-general)
4. [Variables de política (sliders)](#4-variables-de-política-sliders)
5. [Score de Salud Económica](#5-score-de-salud-económica)
6. [Escenarios y presets](#6-escenarios-y-presets)
7. [Tab: Indicadores](#7-tab-indicadores)
8. [Tab: Radar](#8-tab-radar)
9. [Tab: Tendencia](#9-tab-tendencia)
10. [Tab: Optimizador](#10-tab-optimizador)
11. [Tab: Simulación](#11-tab-simulación)
12. [Tab: Reporte IA](#12-tab-reporte-ia)
13. [Exportar a PDF](#13-exportar-a-pdf)
14. [Flujos de trabajo recomendados](#14-flujos-de-trabajo-recomendados)
15. [Glosario económico](#15-glosario-económico)
16. [Limitaciones del modelo](#16-limitaciones-del-modelo)

---

## 1. ¿Qué es el simulador?

El Simulador de Política Económica es una herramienta interactiva que permite explorar cómo diferentes decisiones de política pública afectan los principales indicadores económicos y sociales de una ciudad o región de América Latina.

El sistema usa un **modelo causal lineal** calibrado con coeficientes provenientes de documentos de trabajo del FMI y el Banco Mundial. No es un modelo de predicción econométrica — su objetivo es **pedagógico**: mostrar la dirección, magnitud relativa e interacciones de las principales palancas de política económica.

### ¿Para qué sirve?

- Experimentar con combinaciones de política sin consecuencias reales
- Entender qué variables tienen mayor impacto sobre pobreza, desempleo o desigualdad
- Detectar contradicciones en un mix de políticas (ej. gasto social alto con corrupción alta)
- Encontrar automáticamente la combinación óptima de políticas dado un escenario
- Visualizar cómo una economía converge hacia un nuevo equilibrio en el tiempo
- Generar reportes ejecutivos con análisis de IA para presentar escenarios

---

## 2. Cómo iniciar la aplicación

### Requisitos previos

- Node.js 18 o superior
- Una API Key de Anthropic (para el módulo de Reporte IA)

### Instalación y arranque

```bash
# 1. Clonar o navegar al directorio del proyecto
cd simulador-economia

# 2. Instalar dependencias
npm install

# 3. Configurar la API Key
cp .env.example .env
# Editar .env y agregar: ANTHROPIC_API_KEY=sk-ant-...

# 4. Iniciar la aplicación
npm run dev
```

Esto inicia dos procesos simultáneos:
- **Vite** en `http://localhost:5173` — la interfaz web
- **Proxy Express** en `http://localhost:3001` — intermediario para la API de Claude

Abrir el navegador en `http://localhost:5173`.

> **Nota:** La aplicación funciona completamente sin la API Key, excepto por el módulo de Reporte IA. El resto de funcionalidades (sliders, optimizador, simulación, radar) son cálculos locales en el navegador.

---

## 3. Interfaz general

La pantalla está organizada en cuatro zonas:

```
┌─────────────────────────────────────────────────────────────────┐
│  ENCABEZADO — Título · Nombre del escenario activo · Botones    │
├─────────────────────────────────────────────────────────────────┤
│  BARRA DE ESCENARIOS — Presets + escenarios personalizados      │
├─────────────────────────────────────────────────────────────────┤
│  SCORE DE SALUD ECONÓMICA — Número grande + barra de progreso   │
├─────────────────────────────────────────────────────────────────┤
│  TABS — Indicadores · Radar · Tendencia · Optimizador · ...     │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│  PANEL IZQUIERDO     │  PANEL DERECHO                          │
│  (sliders de         │  (contenido del tab activo)             │
│   política)          │                                          │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

### Botones del encabezado

| Botón | Función |
|---|---|
| `↺ BASELINE` | Restaura todos los sliders al valor de referencia del escenario activo |
| `◌ GENERAR REPORTE` | Envía el escenario a Claude y genera un análisis ejecutivo; abre el tab Reporte IA |
| `⎙ EXPORTAR PDF` | Imprime el reporte como PDF (solo visible cuando hay un reporte generado) |

---

## 4. Variables de política (sliders)

El panel izquierdo contiene los seis controles de política. Cada slider representa una variable que el tomador de decisiones puede ajustar.

### Descripción de cada variable

| Variable | Rango | Qué representa |
|---|---|---|
| **Inflación** | 0–30% | Tasa de inflación anual. Controlada por política monetaria. Una inflación alta daña principalmente a los más pobres |
| **Gasto Social** | 0–20% PIB | Inversión en salud, educación, transferencias y programas sociales. La palanca de reducción de pobreza más directa |
| **Corrupción** | 0–100 | Índice de percepción de corrupción (0 = sin corrupción, 100 = máxima). Afecta todas las demás variables indirectamente |
| **Carga Fiscal** | 0–40% PIB | Recaudación tributaria total. Financia gasto público pero puede desincentivar inversión privada |
| **Tasa de Interés** | 0–25% | Tasa de política monetaria. Alta tasa enfría inflación pero también contrae inversión y empleo |
| **Infraestructura** | 0–10% PIB | Inversión en carreteras, agua, energía, telecomunicaciones. El mayor multiplicador económico del modelo |

### Cómo leer cada slider

```
Inflación                                              4.8%
Tasa de inflación anual. Controlada por política m...  ▲ 2.1

[████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]

0%          base: 4.8%                               30%
```

- **Valor grande** (derecha): valor actual del slider
- **Flecha ▲▼ + número**: diferencia vs. el baseline del escenario activo. Verde = mejora, amarillo = empeora
- **Marca "base:"**: posición del valor de referencia del escenario
- Los cambios se reflejan instantáneamente en todos los indicadores

### Botón BASELINE

Presionar `↺ BASELINE` en el encabezado restaura todos los sliders al valor de referencia del escenario activo. Útil para comparar vs. el punto de partida antes de continuar explorando.

---

## 5. Score de Salud Económica

La barra bajo los escenarios muestra el **Score de Salud Económica** (0–100), un índice compuesto que penaliza desviaciones de metas consideradas saludables para una economía latinoamericana de ingresos medios.

### Escala de interpretación

| Rango | Etiqueta | Significado |
|---|---|---|
| 80–100 | ÓPTIMO | Todos los indicadores en rangos saludables |
| 65–79 | SALUDABLE | Economía funcional con algunos problemas menores |
| 50–64 | RIESGO | Indicadores problemáticos que requieren atención |
| 35–49 | CRÍTICO | Varios indicadores en zona de alerta grave |
| 0–34 | COLAPSO | Deterioro sistémico severo |

### Componentes del score

El score penaliza:
- PIB por debajo de 5% (meta regional)
- Desempleo sobre 5% (tasa natural estimada)
- Cualquier nivel de pobreza (penalización directa)
- Desigualdad (Gini) por encima de 30
- Presión migratoria sobre 5/100
- Inflación por encima del 3% (meta de estabilidad)

Y bonifica:
- Confianza institucional (directamente proporcional)

La **barra de progreso** muestra el score actual (barra de color) y la posición del baseline (marcador gris). El delta `▲▼ X VS BASELINE` indica cuántos puntos mejoró o empeoró respecto al punto de partida.

---

## 6. Escenarios y presets

### Presets incluidos

| Escenario | Descripción |
|---|---|
| **Hermosillo 2024** | Valores empíricos reales de Hermosillo, Sonora. Es el baseline de referencia del modelo |
| **Fintechia** | Ciudad hipotética con alta carga fiscal y corrupción, baja infraestructura — caso de estudio |

### Crear un escenario personalizado

1. Presionar **`+ Nuevo`** en la barra de escenarios
2. Ingresar un nombre (ej. "Ciudad de México 2025")
3. Elegir valores de partida:
   - **Usar valores actuales** — toma los sliders en su posición actual
   - **Copiar de:** — copia los valores de un preset existente
4. Presionar **Guardar escenario**

El escenario nuevo queda guardado en el navegador (localStorage) y persiste entre sesiones.

### Eliminar un escenario personalizado

Presionar la **✕** al lado del nombre del escenario en la barra. Los presets incluidos (Hermosillo, Fintechia) no pueden eliminarse.

### Cambiar de escenario

Al hacer clic en cualquier escenario:
- Los sliders se mueven a los valores de ese escenario
- El baseline cambia al nuevo escenario (las flechas Δ se recalculan)
- El reporte anterior se limpia

---

## 7. Tab: Indicadores

Muestra los seis outputs del modelo como tarjetas con medidores visuales.

### Anatomía de una tarjeta de indicador

```
┌─────────────────────────────┐
│ CRECIMIENTO PIB       BIEN  │  ← etiqueta y estado
│                             │
│         [Gauge]             │  ← medidor tipo velocímetro
│                             │
│          +2.3%              │  ← valor actual (coloreado)
│  BASE 1.7%  ▲ 0.6           │  ← baseline y delta
└─────────────────────────────┘
```

**Estados de los indicadores:**

| Estado | Color | Criterio |
|---|---|---|
| BIEN | Verde | Valor en rango saludable |
| RIESGO | Amarillo | Valor en zona de alerta |
| CRÍTICO | Rojo | Valor en zona de deterioro grave |

### Tabla comparativa

Debajo de las tarjetas aparece la **Comparativa Baseline vs Escenario Actual**, que muestra para cada indicador: valor baseline, valor actual, y delta de cambio con flecha de dirección.

---

## 8. Tab: Radar

Visualiza el perfil multidimensional del escenario actual comparado con el baseline.

### Dimensiones del radar (0–100)

Cada eje representa un aspecto del bienestar normalizado a 0–100 donde 100 es siempre el estado óptimo:

| Dimensión | Qué mide | 100 = |
|---|---|---|
| **PIB** | Crecimiento económico | PIB ≥ 5% |
| **EMPLEO** | Nivel de empleo | Desempleo = 0% |
| **EQUIDAD** | Acceso al bienestar | Pobreza = 0% |
| **IGUALDAD** | Distribución del ingreso | Gini = 0 |
| **CONFIANZA** | Legitimidad institucional | Confianza = 100/100 |
| **RETENCIÓN** | Capacidad de retener población | Migración = 0/100 |

**Área gris:** baseline del escenario activo.
**Área verde:** escenario actual con los sliders en su posición actual.

Si el área verde supera el área gris en todos los ejes, el escenario es mejor que el punto de partida en todas las dimensiones.

### Subscores

Bajo el radar, los seis subscores se muestran con su valor numérico y delta vs. baseline.

---

## 9. Tab: Tendencia

Muestra la evolución de los indicadores a medida que el usuario mueve los sliders, como un historial de los últimos 10 estados.

Útil para entender la dirección de cambio cuando se exploran ajustes secuenciales.

- **Gráfico superior:** PIB, Desempleo y Pobreza a lo largo de los últimos 10 movimientos
- **Gráfico inferior:** Score de Salud Económica

> **Nota:** Este tab no es una proyección temporal — registra snapshots de cada vez que cambia un slider. Para proyección temporal, usar el tab **Simulación**.

---

## 10. Tab: Optimizador

El optimizador encuentra automáticamente la combinación de variables de política que **maximiza el Score de Salud Económica** dado el escenario activo.

### Cómo usar el optimizador

1. Ir al tab **OPTIMIZADOR**
2. Elegir el modo de optimización (ver abajo)
3. Presionar **`◎ OPTIMIZAR POLÍTICA`**
4. Revisar los resultados
5. Opcionalmente, presionar **`◎ APLICAR VALORES ÓPTIMOS A SLIDERS`**

### Modos de optimización

**Modo libre (sin restricciones):**
- Cada variable se mueve al extremo que maximiza el score
- Muestra el **máximo teórico alcanzable**
- Útil para entender el potencial total del modelo

**Modo factibilidad política (checkbox activado):**
- Cada variable se limita a moverse máximo ±30% de su rango desde el baseline
- Modela **restricciones institucionales y políticas reales** (nadie puede bajar la corrupción de 70 a 0 de un año al otro)
- Recomendado para análisis más realistas

### Cómo interpretar los resultados

```
  SCORE ACTUAL          SCORE ÓPTIMO
      54         →          70
    /100                   /100
    RIESGO              ▲ +16 pts
```

La tabla de cambios muestra para cada variable:
- Valor **actual** (dónde está el slider ahora)
- Valor **óptimo** (dónde debería estar según el algoritmo)
- **Cambio recomendado** con flecha y magnitud

Las filas en verde claro son las variables que el algoritmo recomienda modificar.

### Panel de conflictos

Si el mix de políticas actual tiene contradicciones estructurales, el optimizador las muestra con etiquetas de severidad:

| Severidad | Ejemplo |
|---|---|
| **ALTO** | Inflación alta con tasa de interés baja — política monetaria insuficiente |
| **MEDIO** | Gasto social alto con corrupción alta — recursos que se filtran |
| **BAJO** | Infraestructura alta pero confianza muy baja — inversión que no genera legitimidad |

Estos conflictos también se inyectan al reporte de IA para un análisis más profundo.

### Aplicar los valores óptimos

Al presionar **`◎ APLICAR VALORES ÓPTIMOS A SLIDERS`**, todos los sliders se mueven instantáneamente a los valores óptimos calculados. El tab cambia a **Indicadores** para ver el efecto.

> **Hallazgo clave del modelo:** La corrupción y la infraestructura son consistentemente las palancas de mayor impacto. Afectan 5 de los 6 outputs. El optimizador tiende a identificarlas como los cambios prioritarios en casi cualquier escenario.

---

## 11. Tab: Simulación

Modela la **transición temporal** de la economía desde su estado actual hacia el nuevo equilibrio establecido por las políticas en los sliders.

### Concepto: ¿por qué la economía no llega al equilibrio instantáneamente?

En la realidad, las políticas económicas tardan en transmitir sus efectos:
- Una reducción de la tasa de interés tarda meses en impactar la inversión
- Una reforma anticorrupción tarda años en cambiar comportamientos
- Un programa social tarda ciclos presupuestarios en desplegarse

El simulador captura estos rezagos con un parámetro α (velocidad de ajuste).

### Controles

**Control de velocidad (α):**
```
VELOCIDAD DE AJUSTE α = 0.35
[Lento (0.1) ────●──────── Rápido (0.8)]
```

| Valor de α | Interpretación | Política típica |
|---|---|---|
| 0.1 – 0.2 | Ajuste muy lento (8–10 períodos para 90% de convergencia) | Reformas institucionales, reducción de corrupción |
| 0.3 – 0.5 | Ajuste moderado | Políticas fiscales, gasto social |
| 0.6 – 0.8 | Ajuste rápido (2–3 períodos para 90% de convergencia) | Política monetaria, tasas de interés |

**Botón `◎ SIMULAR 12 MESES`:**
Ejecuta la simulación con los valores actuales de los sliders y α. Si se modifica α o algún slider, volver a presionar el botón para regenerar.

### Gráficos

La simulación muestra tres gráficos apilados:

**1. Variables económicas principales**
- PIB % (verde) — esperar que suba si las políticas son favorables
- Desempleo % (amarillo) — esperar que baje
- Pobreza % (rojo) — esperar que baje

**2. Bienestar social e institucional**
- Gini (violeta) — índice de desigualdad
- Confianza /100 (azul) — confianza institucional
- Migración /100 (naranja) — presión migratoria

**3. Score de Salud Económica**
- Evolución del score compuesto de 0 a 100

### Fila de equilibrio final

Al pie de los gráficos se muestran los valores de todos los indicadores en el **Mes 12** (estado de equilibrio al que converge la economía).

### Ejemplos de uso

**Escenario 1 — Política exitosa:**
Bajar corrupción de 70 a 20, subir infraestructura a 8% PIB → las curvas caen pronunciadamente (pobreza, desempleo) y el score sube en forma de S.

**Escenario 2 — Política contraproducente:**
Subir corrupción a 100, bajar infraestructura a 0 → las curvas de pobreza y desempleo suben, el score deteriora. La forma de la curva muestra el rezago del daño institucional.

**Efecto de α:**
Con el mismo escenario, α = 0.1 produce curvas muy suaves (economía lenta en responder), α = 0.8 produce curvas casi escalonadas (transmisión casi inmediata).

---

## 12. Tab: Reporte IA

Genera un **reporte ejecutivo en español** mediante Claude (Anthropic), analizando el escenario actual con una perspectiva de economista senior especializado en América Latina.

### Cómo generar un reporte

**Opción A:** Presionar el botón `◌ GENERAR REPORTE` en el encabezado (desde cualquier tab).

**Opción B:** Ir al tab **REPORTE IA** y esperar — si ya hay un reporte generado, se muestra directamente.

El análisis tarda 10–30 segundos dependiendo de la conexión.

### Contenido del reporte

El reporte incluye siete secciones:

| Sección | Descripción |
|---|---|
| **DIAGNÓSTICO GENERAL** | Estado actual de la economía, causas estructurales, contexto regional comparado |
| **EFECTOS PRINCIPALES** | Los tres factores más críticos con análisis de impacto cuantitativo |
| **INTERACCIONES CLAVE** | Cómo las variables se potencian o neutralizan entre sí — relaciones no obvias |
| **CONFLICTOS DEL MODELO** | Ineficiencias y contradicciones detectadas en el mix de política |
| **EFICIENCIA DEL MIX** | ¿Están alineadas las variables? ¿Hay sinergias desperdiciadas? |
| **RECOMENDACIONES** | 3–5 acciones concretas priorizadas por impacto y factibilidad |
| **RIESGOS Y ADVERTENCIAS** | 2–3 riesgos de mediano plazo con probabilidad cualitativa |

### Contexto que recibe la IA

Además del escenario y los outputs, Claude recibe:
- Los **conflictos detectados** por el sistema (con severidad y descripción)
- El **escenario óptimo** calculado por el optimizador (si fue ejecutado antes), permitiendo análisis diferencial

Esto produce análisis más profundos que simples descripciones de valores individuales.

### Botón REGENERAR

Permite solicitar un nuevo análisis sin cambiar los parámetros — útil para obtener una perspectiva alternativa o si el análisis anterior no fue satisfactorio.

---

## 13. Exportar a PDF

Disponible cuando hay un reporte generado en el tab Reporte IA.

1. Ir al tab **REPORTE IA**
2. Asegurarse de que hay un reporte visible
3. Presionar **`⎙ EXPORTAR PDF`** en el encabezado
4. El navegador abre el diálogo de impresión — seleccionar "Guardar como PDF"

El PDF exportado oculta toda la interfaz (sliders, tabs, botones) y muestra únicamente el contenido del reporte con el título del escenario y el score.

---

## 14. Flujos de trabajo recomendados

### Flujo 1: Exploración libre

1. Seleccionar **Hermosillo 2024** como baseline
2. Mover sliders uno a uno — observar qué output cambia más
3. Ir al tab **Radar** para ver el perfil multidimensional
4. Volver al baseline con `↺ BASELINE` y probar otra combinación

### Flujo 2: Diagnóstico de un escenario real

1. Crear un **escenario nuevo** con los valores reales de una ciudad o país
2. Leer el **Score** y los **Indicadores** para identificar los problemas principales
3. Ir al tab **Optimizador** y ejecutar en modo libre para ver el potencial máximo
4. Ejecutar en **modo factibilidad** para ver qué es realista mejorar
5. Generar un **Reporte IA** — los conflictos detectados enriquecen el análisis

### Flujo 3: Análisis de política específica

1. Tomar el baseline y modificar **solo una variable** (ej. bajar corrupción de 62 a 30)
2. Ir al tab **Simulación** — ajustar α según la velocidad de transmisión esperada
3. Presionar **Simular 12 meses** — observar la trayectoria de convergencia
4. Comparar PIB, pobreza y score en el **Mes 12** vs. el estado inicial
5. Generar un **Reporte IA** para documentar el análisis

### Flujo 4: Comparación de escenarios

1. Crear **Escenario A** (ej. "Política conservadora") con valores de partida específicos
2. Crear **Escenario B** (ej. "Política expansiva") con otra combinación
3. Alternar entre ambos usando la barra de escenarios
4. El **Score** y los **Indicadores** permiten comparación directa
5. Generar reportes para cada uno y contrastar las recomendaciones de la IA

---

## 15. Glosario económico

| Término | Definición |
|---|---|
| **Baseline** | Valor de referencia empírico del escenario activo. Sirve como punto de comparación para todos los deltas |
| **Carga fiscal** | Proporción del PIB que el Estado recauda como impuestos. No incluye deuda |
| **Ceteris paribus** | "Lo demás constante". El modelo asume que cada coeficiente actúa de forma independiente |
| **Coeficiente causal** | Número que indica cuánto cambia un output ante un cambio de una unidad en un input |
| **Convergencia** | Proceso por el cual la economía se acerca gradualmente al nuevo equilibrio después de un cambio de política |
| **Crowding-out** | Efecto por el cual el gasto público "desplaza" inversión privada al competir por los mismos recursos financieros |
| **Delta (Δ)** | Diferencia entre el valor actual y el valor baseline de una variable |
| **Equilibrio** | Estado estacionario al que converge la economía si las políticas se mantienen fijas |
| **Gini** | Índice de desigualdad del ingreso. 0 = perfecta igualdad, 100 = máxima desigualdad. América Latina promedia 45–50 |
| **Índice de corrupción** | Escala de 0 a 100 donde 0 es sin corrupción y 100 es máxima corrupción (inverso al CPI de Transparencia Internacional) |
| **Keynesian multiplier** | Efecto amplificador del gasto público sobre el PIB: cada peso gastado genera más de un peso de actividad económica |
| **NAIRU** | Tasa de desempleo de no aceleración de la inflación. El modelo usa 5% como referencia para América Latina |
| **Mix de política** | Combinación de todas las variables de política activas simultáneamente |
| **Palanca de política** | Variable que el tomador de decisiones puede controlar directamente |
| **PIB** | Producto Interno Bruto — valor total de bienes y servicios producidos en un período |
| **Pobreza multidimensional** | Medición de pobreza que incluye acceso a salud, educación y servicios básicos, no solo ingreso monetario |
| **Presión migratoria** | Propensión de la población a emigrar, determinada por factores de expulsión (push) y atracción (pull) |
| **Score de Salud Económica** | Índice compuesto 0–100 que sintetiza el estado general de la economía según múltiples indicadores |
| **Tasa de interés de política** | Tasa que fija el banco central para controlar el costo del crédito en la economía |
| **Velocidad de ajuste (α)** | Parámetro que controla qué fracción de la brecha entre estado actual y equilibrio se cierra cada período |

---

## 16. Limitaciones del modelo

Es importante entender qué **no** puede hacer este simulador:

### Limitaciones técnicas

- **Modelo lineal:** Los coeficientes son constantes. En la realidad, los efectos son no-lineales (rendimientos decrecientes, efectos umbral, retroalimentaciones).

- **Sin interacciones explícitas:** El modelo trata cada input de forma independiente. El efecto real del gasto social depende de la corrupción, pero esta interacción no está algebraicamente modelada (aunque la IA la detecta y analiza).

- **Sin dinámica endógena:** Las variables de política se consideran exógenas. En la realidad, una economía en colapso puede afectar la capacidad de recaudar impuestos o de invertir en infraestructura.

### Limitaciones de interpretación

- **Los resultados son orientativos, no predicciones.** Los coeficientes son promedios regionales de América Latina, no estimaciones específicas para ninguna ciudad real.

- **La corrupción en el modelo puede sobreestimarse como palanca:** En la práctica, reducir la corrupción es uno de los cambios más difíciles y lentos de lograr. El modelo no penaliza la velocidad de implementación.

- **El Score no refleja todo.** Hay dimensiones de bienestar (seguridad, medio ambiente, capital social) que no están en el modelo.

### Cuándo confiar más en los resultados

- Para comparar **direcciones de cambio** (si subo la infraestructura, ¿qué mejora más: el empleo o la pobreza?)
- Para entender **el orden de magnitud relativo** entre variables
- Para detectar **conflictos estructurales** en un mix de políticas
- Para generar hipótesis que luego se validan con datos reales y modelos más robustos

---

*Para reportar errores, sugerir mejoras o consultar sobre los coeficientes del modelo, ver el archivo `docs/MODELO.md` o abrir un issue en el repositorio del proyecto.*

*Manual generado como parte del proyecto Simulador de Política Económica — Versión 2.0, Marzo 2026.*
