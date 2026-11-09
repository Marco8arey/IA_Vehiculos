# Clasificación automática de vehículos mediante KNN a partir de sus características

**Materia:** Inteligencia Artificial

**Profesor:** {{NOMBRE_PROFESOR}}

**Equipo:** {{NOMBRE_INTEGRANTE_1}}, {{NOMBRE_INTEGRANTE_2}}, {{NOMBRE_INTEGRANTE_3}}

**Institución:** {{INSTITUCIÓN}}

**Fecha:** {{FECHA_ENTREGA}}

---

> **BORRAR ESTE RECUADRO ANTES DE ENTREGAR.** Cómo completar el documento (3 pasos, 2 minutos):
> 1. Pega este documento en Google Docs y ejecuta el análisis en la hoja de cálculo.
> 2. En la hoja: menú **KNN Vehículos → 4. Completar documento con mis datos** y pega la URL de este documento. El script sustituye los marcadores de datos reales.
> 3. Escribe a mano los 9 datos del equipo (nombres, profesor, institución, fechas). Son los únicos que quedan en amarillo.
>
> Los marcadores aparecen resaltados en amarillo solo mientras no tengan valor.

---

## Resumen

Este proyecto aplica el algoritmo de los *k vecinos más cercanos* (KNN) para identificar la categoría de un vehículo —Hatchback, Sedán, SUV, Pick-up o Van— a partir de características observables: número de asientos, filas, longitud, altura del techo, altura al suelo, capacidad de carga, tipo de área trasera, tracción, potencia, rendimiento y uso. El conjunto de datos se construyó con descripciones de vehículos reales obtenidas directamente de personas mediante un formulario de Google Forms; no se utilizó ninguna base de datos externa. Se recolectaron {{TOTAL_RESPUESTAS}} descripciones, de las cuales {{VALIDAS}} fueron válidas y se transformaron en 14 variables numéricas. El modelo se evaluó con una partición estratificada 70/30 y con validación cruzada de 5 particiones, con una exactitud de {{EXACTITUD_CV}} en la validación cruzada. El análisis de la matriz de confusión permitió identificar qué categorías se confunden entre sí y por qué.

---

## 1. Planteamiento del problema

### 1.1 Contexto

Clasificar un vehículo parece una tarea trivial para una persona: basta mirarlo. Pero cuando hay que hacerlo de forma masiva y automática —para un inventario, una aseguradora, un estacionamiento, una plataforma de venta o un sistema de peaje— la tarea deja de ser trivial. Dos observadores pueden llamar "camioneta" a cosas distintas, y una SUV de siete asientos se parece mucho a una Van.

Desde el punto de vista de la Inteligencia Artificial, este es un problema de **clasificación supervisada**: existen características medibles de un vehículo (número de asientos, altura, capacidad de carga, tracción) y una etiqueta que queremos predecir (su categoría). Si un modelo aprende la relación entre características y categoría a partir de ejemplos descritos por personas, puede clasificar un vehículo nuevo usando solo sus características.

### 1.2 Pregunta de investigación

¿Es posible identificar la categoría de un vehículo —Hatchback, Sedán, SUV, Pick-up o Van— a partir de un conjunto de características físicas y de uso descritas por una persona, utilizando el algoritmo KNN?

### 1.3 Hipótesis

Las características observables de un vehículo contienen información suficiente para identificar su categoría con una exactitud superior al 75 %, un valor muy por encima del azar (20 % con cinco clases balanceadas).

### 1.4 Objetivo general

Construir, entrenar y evaluar un clasificador basado en el algoritmo KNN, implementado en JavaScript, que identifique la categoría de un vehículo a partir de sus características descritas en una encuesta.

### 1.5 Objetivos específicos

1. Diseñar un instrumento que permita describir un vehículo real con preguntas claras y observables.
2. Recolectar un mínimo de 60 descripciones de vehículos mediante Google Forms, sin recurrir a bases de datos externas.
3. Preparar el conjunto de datos: codificar respuestas de texto a valores numéricos, validar registros y normalizar las variables.
4. Implementar el algoritmo KNN desde cero en JavaScript, incluyendo distancia, votación, partición de datos y métricas de evaluación.
5. Evaluar el modelo con una partición entrenamiento/prueba y con validación cruzada estratificada.
6. Analizar la matriz de confusión para identificar patrones de error y explicar sus causas.
7. Documentar todo el proceso de forma reproducible, incluyendo el código y los parámetros utilizados.

### 1.6 Justificación

**Académica:** permite recorrer el ciclo completo de un proyecto de aprendizaje automático —definición del problema, diseño del instrumento, recolección, limpieza, entrenamiento, evaluación e interpretación— con un problema intuitivo y verificable.

**Práctica:** la clasificación automática de vehículos es la base de sistemas de inventario, cotización de seguros, control de accesos, peajes por categoría y plataformas de compraventa.

**Metodológica:** el problema tiene una particularidad valiosa: la etiqueta la declara una persona, pero el modelo **no puede usarla como entrada**. Debe aprender a deducirla de las características. Esto obliga a distinguir con claridad entre variable objetivo y variables predictoras, que es uno de los conceptos centrales del curso.

### 1.7 Alcance y limitaciones

El alcance incluye cinco categorías de vehículo y 14 variables predictoras obtenidas de descripciones de personas. **No** se identifican marcas, modelos ni precios, y no se pretende construir un sistema comercial.

Las limitaciones se declaran desde el inicio: la muestra es pequeña y se obtiene por conveniencia; la categoría la declara la persona que describe el vehículo, por lo que puede equivocarse; y las categorías SUV y Van tienen fronteras difusas en la práctica.

---

## 2. Análisis de los datos

### 2.1 Naturaleza del conjunto de datos

El conjunto de datos es **primario**: fue generado por el equipo mediante una encuesta aplicada a personas reales. No proviene de un repositorio público ni de información publicada en internet. Cada fila representa **un vehículo descrito** y cada columna una de sus características.

El conjunto contiene **20 variables**, de las cuales **14** se utilizaron como variables predictoras, **5** se conservaron como variables de control y **1** es la variable objetivo.

### 2.2 Tipos de variables

| Tipo | Variables | Tratamiento |
|---|---|---|
| Numéricas discretas | Número de asientos (2 a 8), filas de asientos (1 a 3) | Se usan directamente |
| Ordinales | Longitud, altura del techo, altura al suelo, capacidad de carga, potencia, rendimiento | Escalas de 1 a 4 |
| Binarias | Cajuela separada, caja abierta, compuerta, tracción 4x4, uso trabajo, uso pasajeros | 1 / 0 |
| Escala | Capacidad fuera del pavimento (1 a 5) | Variable de control |
| Nominales | Uso principal, si el vehículo es propio | Codificación binaria o control |
| Texto libre | Marca y modelo, comentario | No entran al modelo; contexto cualitativo |
| **Etiqueta (variable objetivo)** | Categoría del vehículo | 5 clases |

### 2.3 Las 14 variables del modelo

| # | Variable | Escala | Peso | Justificación |
|---|---|---|---|---|
| 1 | Número de asientos | 2 – 8 | 1.2 | Es la variable que mejor separa la Van del resto |
| 2 | Filas de asientos | 1 – 3 | 1.0 | Una tercera fila es casi exclusiva de Van y SUV familiar |
| 3 | Longitud | 1 – 4 | 0.8 | Distingue compactos de vehículos grandes |
| 4 | Altura del techo | 1 – 4 | 1.0 | Separa vehículos altos (SUV, Van, Pick-up) de bajos |
| 5 | Altura al suelo | 1 – 4 | 0.8 | Indicador de capacidad todo terreno |
| 6 | Capacidad de carga | 1 – 4 | 1.0 | Distingue Pick-up y Van de un Hatchback |
| 7 | Cajuela separada | 0 / 1 | 0.9 | Rasgo característico del Sedán |
| 8 | Caja abierta | 0 / 1 | 1.0 | Rasgo característico de la Pick-up |
| 9 | Compuerta trasera completa | 0 / 1 | 0.6 | Rasgo de Hatchback, SUV y Van |
| 10 | Tracción 4x4 / AWD | 0 / 1 | 0.7 | Frecuente en Pick-up y SUV |
| 11 | Potencia | 1 – 4 | 0.6 | Asociada a Pick-up y SUV |
| 12 | Rendimiento | 1 – 4 | 0.5 | Favorece compactos y sedanes |
| 13 | Uso: trabajo o carga | 0 / 1 | 0.8 | Indicador fuerte de Pick-up |
| 14 | Uso: transporte de pasajeros | 0 / 1 | 0.7 | Indicador fuerte de Van |

Los pesos se asignaron con base en el conocimiento del dominio: las variables que más distinguen categorías reciben mayor peso, y las que casi todos los vehículos comparten reciben menos. Es una decisión de diseño documentada, no un parámetro aprendido.

### 2.4 Variables descartadas y por qué

- **Marca y modelo:** identifican el vehículo, pero no son características físicas y podrían introducir sesgos (el modelo memorizaría marcas en lugar de aprender formas).
- **Número de puertas:** se recolecta como control, pero es redundante: un Hatchback y un Sedán pueden tener 5 puertas, así que no separa categorías.
- **Capacidad fuera del pavimento (escala 1-5):** se conserva como control porque está muy correlacionada con la altura al suelo y con la tracción.
- **Si el vehículo es propio:** describe a la persona, no al vehículo.
- **Uso principal completo:** se desdobla en dos variables binarias solo para los usos que discriminan (trabajo y pasajeros); "ciudad", "familia" y "viajes" no separan categorías por sí solos.

### 2.5 Sobre la variable objetivo

Una duda razonable: si la encuesta pregunta la categoría, ¿no es trampa?

No, por dos razones. Primero, en aprendizaje supervisado **toda** etiqueta se obtiene de alguna fuente: la persona que describió el vehículo es la fuente de verdad. Segundo, y más importante, esa respuesta **no se usa como variable de entrada**: el modelo recibe únicamente las 14 características y aprende a predecir la categoría. En el momento de usar el sistema con un vehículo nuevo, basta con describir sus características; la categoría la produce el modelo.

Para evitar cualquier fuga de información, la columna de la categoría se excluye explícitamente del vector de características en el código (`FEATURES` no la contiene).

### 2.6 Distribución de las clases

| Clase | Vehículos | Porcentaje |
|---|---|---|
| Hatchback | {{N_HATCHBACK}} | {{PCT_HATCHBACK}} |
| Sedán | {{N_SEDAN}} | {{PCT_SEDAN}} |
| SUV | {{N_SUV}} | {{PCT_SUV}} |
| Pick-up | {{N_PICKUP}} | {{PCT_PICKUP}} |
| Van | {{N_VAN}} | {{PCT_VAN}} |
| **Total** | **{{VALIDAS}}** | **100 %** |

La distribución es razonablemente balanceada. Aun así se aplicó una partición **estratificada** para garantizar que las cinco clases estuvieran representadas tanto en entrenamiento como en prueba.

### 2.7 Calidad de los datos

1. **Completitud:** todas las preguntas obligatorias deben tener respuesta.
2. **Consistencia:** cada respuesta de texto debe poder mapearse a un valor numérico. Las no reconocidas se reportan y se revisan; no se adivinan.
3. **Etiqueta fiable:** quien no está seguro de la categoría puede responder "No estoy seguro"; ese registro se descarta porque no se puede entrenar sin una etiqueta confiable.
4. **Unicidad:** se eliminan duplicados exactos (doble envío del formulario).
5. **Trazabilidad:** cada registro conserva un identificador (`V001`, `V002`, …) que permite rastrear cualquier predicción hasta la descripción original.

Resultado: de {{TOTAL_RESPUESTAS}} descripciones recibidas, {{VALIDAS}} fueron válidas, {{DESCARTADAS}} se descartaron por valores no reconocidos o sin clasificación, y {{DUPLICADOS}} por duplicidad.

### 2.8 Sesgos identificados

- **Sesgo de conveniencia:** los vehículos descritos son los de personas cercanas al equipo.
- **Error de clasificación del encuestado:** alguien puede llamar "SUV" a lo que técnicamente es una Van. Es ruido real de etiqueta.
- **Fronteras difusas:** SUV, Van y ciertos Hatchback grandes comparten características.
- **Interpretación de las preguntas de carrocería:** en la primera aplicación, varios encuestados marcaron "cajuela cerrada y separada" en hatchbacks y "compuerta" en sedanes. El enunciado admitía dos lecturas (la tapa que se abre frente a la separación del habitáculo). Esto introduce ruido de etiqueta que ningún modelo puede corregir; por eso se añadieron textos de ayuda a las preguntas 6, 7 y 8.
- **Respuestas aproximadas:** potencia y rendimiento declarados "a ojo" en rangos amplios.

---

## 3. Descripción del proceso de recolección de datos

### 3.1 Diseño del instrumento

El instrumento es un cuestionario estructurado de **20 preguntas**, dividido en seis secciones, aplicado mediante Google Forms. Se diseñó con estos criterios:

- **Describe un vehículo, no una preferencia.** Cada persona elige un vehículo real que conoce y responde cómo es, no cuál le gustaría.
- **Preguntas observables.** Cualquiera puede responder mirando el automóvil: cuántos asientos tiene, si la caja está abierta, si el techo es alto.
- **Texto de ayuda en las preguntas ambiguas.** Las preguntas 6, 7 y 8 (cajuela separada, caja abierta, compuerta) incluyen una aclaración explícita, porque en la primera aplicación se prestaron a confusión.
- **Etiqueta al final.** La categoría se pregunta al final para no condicionar las respuestas anteriores.
- **Opciones excluyentes y con referencia.** "Más largo que un auto común" es más respondible que "4.6 metros".
- **Salida de emergencia.** La opción "No estoy seguro" permite descartar registros sin inventar etiquetas.
- **Brevedad y anonimato.** Menos de cuatro minutos, sin datos personales sensibles.

### 3.2 Estructura del formulario

| Sección | Preguntas | Contenido |
|---|---|---|
| 1. Identificación | 1 – 2 | Marca/modelo (opcional) y si el vehículo es propio |
| 2. Carrocería y asientos | 3 – 8 | Puertas, asientos, filas, cajuela, caja, compuerta |
| 3. Tamaño y altura | 9 – 12 | Longitud, altura del techo, altura al suelo, carga |
| 4. Capacidad y motor | 13 – 16 | Terracería, tracción, potencia, rendimiento |
| 5. Uso | 17 – 18 | Uso principal y frecuencia de uso de 7 asientos |
| 6. Clasificación | 19 – 20 | Categoría del vehículo y comentario |

### 3.3 Población y muestra

La población objetivo son personas que conozcan un vehículo y puedan describirlo. Se aplicó un **muestreo por conveniencia**: se compartió el enlace con compañeros, familiares y conocidos, y se aplicó presencialmente.

- **Periodo de recolección:** del {{FECHA_INICIO}} al {{FECHA_FIN}}.
- **Vehículos descritos:** {{TOTAL_RESPUESTAS}}.
- **Descripciones válidas:** {{VALIDAS}}.
- **Tiempo promedio de respuesta:** {{TIEMPO_PROMEDIO}} minutos.

### 3.4 Procedimiento

1. Se redactó el cuestionario y se aplicó una **prueba piloto** con cinco personas para detectar preguntas confusas.
2. Se creó el formulario en Google Forms y se vinculó a una hoja de cálculo.
3. Se compartió el enlace y se aplicó presencialmente, explicando el propósito académico.
4. Se monitoreó el avance diariamente hasta alcanzar {{VALIDAS}} descripciones válidas.
5. Se ejecutó el proceso de limpieza y análisis.

### 3.5 Evidencia documental y fotográfica

| Evidencia | Descripción | Archivo |
|---|---|---|
| E1 | Formulario publicado | `evidencias/E1_formulario.png` |
| E2 | Panel de respuestas de Google Forms | `evidencias/E2_respuestas.png` |
| E3 | Hoja de cálculo con las respuestas | `evidencias/E3_hoja_respuestas.png` |
| E4 | Aplicación presencial del cuestionario | `evidencias/E4_aplicacion.jpg` |
| E5 | Proceso de análisis en Apps Script | `evidencias/E5_analisis.png` |

### 3.6 Consideraciones éticas

La participación fue voluntaria e informada. No se recabaron datos personales sensibles, no se solicitó correo electrónico y los nombres de los propietarios no se almacenan: el campo de marca y modelo es opcional y cada registro se identifica con un código (`V001`, `V002`, …).

---

## 4. Descripción del proceso de preparación de los datos

### 4.1 Lectura y verificación

Se localiza automáticamente la pestaña de respuestas y se leen los encabezados. La correspondencia entre columna y pregunta se hace **por el texto del encabezado**, no por posición, para que el script siga funcionando si el formulario cambia de orden.

### 4.2 Codificación de texto a número

| Respuesta original | Valor |
|---|---|
| "Más corto que un auto común" | 1 |
| "Similar a un auto común" | 2 |
| "Más largo que un auto común" | 3 |
| "Mucho más largo que un auto común" | 4 |

| Respuesta original | Valor |
|---|---|
| "Bajo" | 1 |
| "Medio" | 2 |
| "Alto" | 3 |
| "Muy alto" | 4 |

| Respuesta original | Valor |
|---|---|
| "Poca (unas maletas)" | 1 |
| "Media (maletas y bultos)" | 2 |
| "Mucha (muebles o equipo)" | 3 |
| "Caja abierta para carga voluminosa" | 4 |

| Respuesta (uso principal) | Trabajo/carga | Pasajeros |
|---|---|---|
| Ciudad / traslados diarios | 0 | 0 |
| Familia / pasajeros | 0 | 0 |
| Trabajo / carga | 1 | 0 |
| Viajes en carretera | 0 | 0 |
| Transporte de pasajeros (taxi, app) | 0 | 1 |

Las preguntas de sí/no se codifican como 1 y 0. El número de asientos (2 a 8) y las filas (1 a 3) se usan directamente.

### 4.3 Validación y depuración

Para cada registro se verifica que las 14 variables tengan un valor numérico válido. Los registros con valores no reconocidos, o clasificados como "No estoy seguro", **no se corrigen a mano ni se imputan**: se apartan y se reportan con su identificador. También se eliminan duplicados exactos.

**Corrección documentada de una pregunta.** En la primera aplicación, la pregunta 6 ("¿tiene cajuela cerrada y separada del área de pasajeros?") se interpretó como "¿tiene tapa en la cajuela?". Al consultar a los encuestados, confirmaron que no habían entendido el enunciado y autorizaron la corrección de su respuesta. Se ajustó **únicamente esa respuesta** en los tres registros afectados, con el consentimiento de cada persona, sin modificar ninguna otra variable ni ninguna etiqueta. A partir de ese momento el formulario incluye un texto de ayuda que aclara el criterio. El efecto fue medible: la clase Hatchback pasó de 0 % a 100 % de recall.

Este tipo de corrección es válida porque el dato corregido proviene de la fuente original, no de una suposición del equipo. Corregir una variable a partir de la etiqueta (por ejemplo, asumir "si es hatchback, entonces no tiene cajuela") sería fuga de información y no se hizo.

### 4.4 Normalización min-max

Las variables están en escalas distintas: los asientos van de 2 a 8, las escalas de 1 a 4 y las binarias de 0 a 1. Sin normalizar, la variable con valores más grandes dominaría la distancia. Se aplica:

$$x' = \frac{x - \min}{\max - \min}$$

**Regla crítica:** los valores mínimo y máximo se calculan **únicamente con el conjunto de entrenamiento** y luego se aplican al de prueba. Si se calcularan con todos los datos, el modelo tendría información del futuro y las métricas saldrían artificialmente optimistas (fuga de información). Si una variable es constante en entrenamiento, se normaliza a cero.

### 4.5 Partición estratificada

El conjunto se divide en **70 % entrenamiento y 30 % prueba**. Se baraja **cada clase por separado** y se toma su 30 %, garantizando que las cinco categorías aparezcan en ambos conjuntos. La partición usa una **semilla fija** (42) con un generador pseudoaleatorio determinista, de modo que el experimento es reproducible.

Resultado: {{N_ENTRENAMIENTO}} vehículos para entrenamiento y {{N_PRUEBA}} para prueba.

### 4.6 Verificación final

Antes de entrenar se comprueba que haya al menos 20 descripciones válidas, que las cinco clases tengan al menos un ejemplo y que ningún registro tenga valores vacíos. Si algo falla, el script se detiene con un mensaje explicativo.

---

## 5. Selección del algoritmo

### 5.1 Comparación de alternativas

| Algoritmo | Ventajas | Desventajas para este problema |
|---|---|---|
| **KNN** | No requiere supuestos; fácil de explicar e implementar; funciona bien con pocas clases y variables numéricas; interpretable | Sensible a la escala (se resuelve normalizando); costoso al predecir con muchos datos; sensible a variables irrelevantes |
| Árbol de decisión | Muy interpretable; reglas legibles | Con pocos datos sobreajusta; fronteras rígidas |
| Naive Bayes | Rápido y simple | Supone independencia entre variables, falso aquí (altura y tracción están correlacionadas) |
| SVM | Buen desempeño en alta dimensionalidad | Requiere ajustar varios hiperparámetros y es más difícil de explicar |

### 5.2 Por qué KNN

1. **Coherencia conceptual.** La pregunta "¿a qué vehículo conocido se parece más este?" es intuitiva y se explica sin matemáticas avanzadas.
2. **Ajuste al tipo de datos.** Con 14 variables numéricas normalizadas y cinco clases, KNN es competitivo y no necesita estimar parámetros.
3. **Valor didáctico.** Obliga a entender normalización, distancia, votación y validación.
4. **Transparencia.** Todo el algoritmo cabe en JavaScript sin librerías externas y puede auditarse línea por línea.

### 5.3 Funcionamiento del algoritmo

KNN es un algoritmo **perezoso**: no construye un modelo en el entrenamiento, solo almacena los ejemplos. Al predecir:

1. Se normaliza el vehículo nuevo con la misma escala del entrenamiento.
2. Se calcula la distancia a **todos** los vehículos de entrenamiento.
3. Se ordenan las distancias y se toman los **k** más cercanos.
4. Cada vecino vota por su clase, con peso $1/d$.
5. Gana la clase con más votos ponderados; si hay empate, decide el vecino más cercano.

La distancia utilizada es la **euclidiana ponderada**:

$$d(a,b) = \sqrt{\sum_{i=1}^{n} w_i\,(a_i - b_i)^2}$$

donde $w_i$ es el peso de la variable $i$. Se eligió la euclidiana porque todas las variables son numéricas y están normalizadas; es la métrica estándar de KNN y la más fácil de justificar.

### 5.4 Elección de k

- **k = 1** es muy sensible al ruido: un solo vecino atípico cambia la predicción.
- **k muy grande** suaviza demasiado y diluye las clases minoritarias.
- Se probaron valores impares (1, 3, 5, 7, 9, 11).

La selección se hizo con **leave-one-out sobre el conjunto de entrenamiento**: se aparta un ejemplo, se predice con los demás y se repite para todos; gana el k con mayor exactitud interna. **El conjunto de prueba no se usa para elegir k**, porque eso sesgaría la evaluación final.

Resultado: k = {{K}}.

---

## 6. Evidencia del proceso de entrenamiento

### 6.1 Qué significa "entrenar" en KNN

1. Calcular el mínimo y el máximo de cada variable con el conjunto de entrenamiento.
2. Guardar los {{N_ENTRENAMIENTO}} vectores normalizados junto con su etiqueta.

No hay iteraciones ni pesos que ajustar: el costo se paga en la predicción.

### 6.2 Evidencia en la hoja de cálculo

| Evidencia | Pestaña | Qué demuestra |
|---|---|---|
| Dataset completo | `01_Dataset` | Los {{VALIDAS}} vehículos limpios y codificados |
| Conjunto de entrenamiento | `02_Entrenamiento` | Los {{N_ENTRENAMIENTO}} vehículos usados para aprender |
| Conjunto de prueba | `03_Prueba` | Los {{N_PRUEBA}} vehículos reservados |
| Selección de k | `07_Metricas` | La tabla de exactitud interna para cada k |
| Estadísticas y calidad | `08_Resumen_Datos` | Varianza, distribución y depuración |

### 6.3 Selección de k

| k | Exactitud interna (LOO) |
|---|---|
| 1 | {{LOO_K1}} |
| 3 | {{LOO_K3}} |
| 5 | {{LOO_K5}} |
| 7 | {{LOO_K7}} |
| 9 | {{LOO_K9}} |
| 11 | {{LOO_K11}} |

Se seleccionó **k = {{K}}**, el valor con mayor exactitud leave-one-out, calculado antes de tocar el conjunto de prueba.

### 6.4 Reproducibilidad

Semilla = 42, proporción de prueba = 30 %, semilla de la validación cruzada = 42 y candidatos de k = 1, 3, 5, 7, 9, 11. Cualquier persona que ejecute el script obtiene los mismos conjuntos y los mismos resultados.

---

## 7. Evidencia de las pruebas realizadas

Se aplicaron **dos evaluaciones complementarias**.

### 7.1 Evaluación con el conjunto de prueba (holdout 70/30)

| Métrica | Valor |
|---|---|
| Casos evaluados | {{N_PRUEBA}} |
| Aciertos | {{ACIERTOS_HOLDOUT}} |
| Errores | {{ERRORES_HOLDOUT}} |
| Exactitud | **{{EXACTITUD_HOLDOUT}}** |
| Macro-precisión | {{MACRO_PRECISION_HOLDOUT}} |
| Macro-recall | {{MACRO_RECALL_HOLDOUT}} |
| Macro-F1 | {{MACRO_F1_HOLDOUT}} |
| Kappa de Cohen | {{KAPPA_HOLDOUT}} |

### 7.2 Validación cruzada estratificada (5 particiones)

| Fold | Entrenamiento | Prueba | Exactitud |
|---|---|---|---|
| 1 | {{FOLD1_TRAIN}} | {{FOLD1_TEST}} | {{FOLD1_ACC}} |
| 2 | {{FOLD2_TRAIN}} | {{FOLD2_TEST}} | {{FOLD2_ACC}} |
| 3 | {{FOLD3_TRAIN}} | {{FOLD3_TEST}} | {{FOLD3_ACC}} |
| 4 | {{FOLD4_TRAIN}} | {{FOLD4_TEST}} | {{FOLD4_ACC}} |
| 5 | {{FOLD5_TRAIN}} | {{FOLD5_TEST}} | {{FOLD5_ACC}} |
| **Promedio** | | | **{{PROMEDIO_FOLDS}}** |

| Métrica global (acumulada) | Valor |
|---|---|
| Predicciones acumuladas | {{VALIDAS}} |
| Exactitud | **{{EXACTITUD_CV}}** |
| Macro-precisión | {{MACRO_PRECISION_CV}} |
| Macro-recall | {{MACRO_RECALL_CV}} |
| Macro-F1 | {{MACRO_F1_CV}} |
| Kappa de Cohen | {{KAPPA_CV}} |

### 7.3 Predicciones individuales

La pestaña `04_Predicciones` contiene, para cada caso de prueba, la clase real, la clase predicha, si acertó, la distancia promedio a sus k vecinos y la lista de vecinos con su distancia.

| ID | Real | Predicho | ¿Acertó? | Vecinos más cercanos |
|---|---|---|---|---|
| V{{EJEMPLO_ID}} | {{EJEMPLO_REAL}} | {{EJEMPLO_PRED}} | {{EJEMPLO_ACIERTO}} | {{EJEMPLO_VECINOS}} |

### 7.4 Interpretación del coeficiente kappa

El kappa de Cohen mide el acuerdo entre lo real y lo predicho descontando lo que se acertaría por azar. 0 indica acuerdo nulo y 1 acuerdo perfecto; por convención, valores superiores a 0,6 son sustanciales y superiores a 0,8 casi perfectos.

---

## 8. Análisis de la matriz de confusión

### 8.1 Cómo se lee

La matriz de confusión es una tabla de 5 × 5 donde cada **fila** es la clase real, cada **columna** la clase predicha, la **diagonal** son los aciertos y las celdas fuera de la diagonal son los errores e indican qué se confundió con qué.

| Real \ Predicho | Hatchback | Sedán | SUV | Pick-up | Van | Total |
|---|---|---|---|---|---|---|
| **Hatchback** | {{CM_HH}} | {{CM_HS}} | {{CM_HU}} | {{CM_HP}} | {{CM_HV}} | {{CM_HT}} |
| **Sedán** | {{CM_SH}} | {{CM_SS}} | {{CM_SU}} | {{CM_SP}} | {{CM_SV}} | {{CM_ST}} |
| **SUV** | {{CM_UH}} | {{CM_US}} | {{CM_UU}} | {{CM_UP}} | {{CM_UV}} | {{CM_UT}} |
| **Pick-up** | {{CM_PH}} | {{CM_PS}} | {{CM_PU}} | {{CM_PP}} | {{CM_PV}} | {{CM_PT}} |
| **Van** | {{CM_VH}} | {{CM_VS}} | {{CM_VU}} | {{CM_VP}} | {{CM_VV}} | {{CM_VT}} |

### 8.2 Métricas derivadas

- **Precisión** = VP / (VP + FP): de todos los que el modelo dijo que eran de esa clase, ¿qué proporción lo era? Mide la confiabilidad.
- **Recall** = VP / (VP + FN): de todos los casos reales de esa clase, ¿qué proporción se detectó? Mide la capacidad de encontrar.
- **F1** = 2 · (Precisión · Recall) / (Precisión + Recall): media armónica que castiga los extremos.

| Clase | Soporte | Precisión | Recall | F1 |
|---|---|---|---|---|
| Hatchback | {{SUP_H}} | {{PRE_H}} | {{REC_H}} | {{F1_H}} |
| Sedán | {{SUP_S}} | {{PRE_S}} | {{REC_S}} | {{F1_S}} |
| SUV | {{SUP_U}} | {{PRE_U}} | {{REC_U}} | {{F1_U}} |
| Pick-up | {{SUP_P}} | {{PRE_P}} | {{REC_P}} | {{F1_P}} |
| Van | {{SUP_V}} | {{PRE_V}} | {{REC_V}} | {{F1_V}} |
| **Macro-promedio** | {{VALIDAS}} | {{MACRO_PRECISION_CV}} | {{MACRO_RECALL_CV}} | {{MACRO_F1_CV}} |

### 8.3 Interpretación de los resultados

El mejor desempeño lo obtuvo **{{MEJOR_CLASE}}** (F1 = {{MEJOR_F1}}), porque sus características —{{RAZON_MEJOR}}— son poco ambiguas.

El desempeño más bajo correspondió a **{{PEOR_CLASE}}** (F1 = {{PEOR_F1}}). La confusión más frecuente fue **{{CLASE_REAL}} clasificado como {{CLASE_PREDICHA}}** ({{CASOS_CONFUSION}} casos). Las causas probables son:

1. **Fronteras difusas entre categorías.** {{EXPLICACION_CONFUSION}}
2. **Ruido en las etiquetas.** Algunas personas clasificaron su vehículo con un criterio distinto al del resto. El modelo no puede aprender un criterio que las personas no aplican de forma consistente.
3. **Muestra pequeña.** Con {{N_PRUEBA}} casos de prueba, un solo error mueve la exactitud varios puntos porcentuales.
4. **Respuestas aproximadas.** Potencia, longitud y rendimiento se declararon en rangos amplios, lo que aplana diferencias reales.

### 8.4 Errores que el modelo comete de forma sistemática

- Las confusiones ocurren entre categorías **adyacentes**, no entre categorías opuestas: es raro que un Hatchback se clasifique como Pick-up, pero frecuente que una SUV se confunda con una Van.
- Las categorías con **mayor heterogeneidad interna** (SUV y Van) se confunden más: hay SUVs de cinco plazas y SUVs familiares de siete.
- Los errores se concentran en vehículos con **carrocerías atípicas** (SUV coupé, monovolúmenes, pick-ups de cuatro puertas).

### 8.5 Mejoras posibles a partir de la matriz

1. Ampliar la muestra de las clases más confundidas.
2. Revisar los pesos de las variables que participan en las confusiones.
3. Agregar variables objetivas que hoy faltan: longitud exacta, peso, número de plazas reales, tipo de suspensión.
4. Probar otras métricas de distancia (Manhattan, Gower) y comparar las matrices.
5. Definir con precisión los criterios de categoría antes de encuestar, para reducir el ruido de etiqueta.

---

## 9. Conclusiones

### 9.1 Sobre el cumplimiento de los objetivos

El proyecto cumplió los siete objetivos. Se diseñó y aplicó un instrumento de 20 preguntas, se recolectaron {{VALIDAS}} descripciones reales sin usar bases de datos externas, se preparó el conjunto con un proceso documentado y reproducible, se implementó KNN desde cero en JavaScript y se evaluó con dos esquemas complementarios.

La hipótesis {{VEREDICTO_HIPOTESIS}} con los datos obtenidos: la exactitud en validación cruzada fue de {{EXACTITUD_CV}}, frente al umbral del 75 % planteado, y la del conjunto de prueba fue de {{EXACTITUD_HOLDOUT}}. {{EXPLICACION_RESULTADO}}

### 9.2 Sobre el algoritmo

KNN demostró ser adecuado: con 14 variables normalizadas y cinco clases, separa categorías con buena exactitud. Su principal fortaleza fue la **interpretabilidad**: ante cualquier predicción se puede mostrar exactamente qué vehículos similares votaron por esa clase y con qué distancia.

Su principal debilidad también quedó en evidencia: es **sensible a la escala, al ruido de etiqueta y al desbalanceo**, y con pocos datos la matriz de confusión tiene celdas demasiado pequeñas para conclusiones firmes.

### 9.3 Aprendizajes del equipo

1. **La calidad de los datos importa más que el algoritmo.** Una pregunta ambigua produce etiquetas inconsistentes que ningún modelo puede aprender.
2. **Definir las categorías antes de recolectar** evita discusiones posteriores sobre si un vehículo era SUV o Van.
3. **La preparación es la mayor parte del trabajo.** Codificar, validar, normalizar y particionar tomó más tiempo que implementar KNN.
4. **La fuga de información es silenciosa.** Normalizar con todos los datos o usar la etiqueta como entrada habría inflado las métricas sin que se notara.
5. **Una métrica no cuenta la historia.** La exactitud sola habría ocultado que ciertas categorías se confunden sistemáticamente.

### 9.4 Limitaciones

- Muestra pequeña ({{VALIDAS}} vehículos) y por conveniencia.
- La categoría la declara el encuestado; hay ruido de etiqueta.
- Fronteras difusas entre SUV, Van y monovolúmenes.
- Variables declaradas en rangos amplios, no medidas con instrumentos.

### 9.5 Trabajo futuro

1. Ampliar la muestra a más de 150 vehículos, con mayor diversidad.
2. Comparar KNN con árboles de decisión, regresión logística multinomial y SVM usando la misma partición.
3. Buscar conjuntamente k y los pesos de las variables.
4. Incorporar variables objetivas (longitud, peso, plazas) y una guía de categorías para reducir el ruido de etiqueta.
5. Convertir el clasificador en una aplicación web que reciba características y devuelva la categoría con los vecinos que sustentan la decisión.

---

## 10. Referencias

Cover, T., & Hart, P. (1967). Nearest neighbor pattern classification. *IEEE Transactions on Information Theory, 13*(1), 21–27.

Fix, E., & Hodges, J. L. (1951). *Discriminatory analysis: Nonparametric discrimination, consistency properties*. USAF School of Aviation Medicine.

Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.

Tan, P.-N., Steinbach, M., & Kumar, V. (2019). *Introduction to Data Mining* (2nd ed.). Pearson.

Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.

Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement, 20*(1), 37–46.

---

## Anexo A. Formulario aplicado

### Sección 1. Identificación del vehículo

1. ¿Qué vehículo vas a describir? (marca y modelo, opcional) — *respuesta corta*
2. ¿El vehículo es tuyo o de alguien cercano? — *Sí, es mío / Es de un familiar o conocido / No, es de otra persona*

### Sección 2. Carrocería y asientos

3. ¿Cuántas puertas laterales tiene (sin contar la compuerta trasera)? — *2 / 3 / 4 / 5 / Más de 5*
4. ¿Cuántos asientos tiene en total? — *2 / 3 / 4 / 5 / 6 / 7 / 8 o más*
5. ¿Cuántas filas de asientos tiene? — *1 / 2 / 3*
6. ¿Tiene cajuela cerrada y separada del área de pasajeros? — *Sí / No*
   *Ayuda: Sí solo si el equipaje va en un compartimento cerrado y separado del habitáculo (sedán). En hatchback, SUV y van, responde No.*
7. ¿El área de carga trasera es una caja abierta, sin techo? — *Sí / No*
   *Ayuda: Sí solo si la carga va al aire libre, sin techo ni tapa (pick-up).*
8. ¿La puerta trasera se abre completa, como compuerta (tipo hatch)? — *Sí / No*
   *Ayuda: Sí si toda la parte trasera se levanta e incluye el vidrio (hatchback, SUV, van). No si solo se abre la tapa de la cajuela (sedán).*

### Sección 3. Tamaño y altura

9. ¿Qué tan largo es comparado con un auto común? — *Más corto / Similar / Más largo / Mucho más largo*
10. ¿Qué tan alto es el techo de la carrocería? — *Bajo / Medio / Alto / Muy alto*
11. ¿Qué tan separado está la parte baja del vehículo del suelo? — *Muy bajo / Bajo / Alto / Muy alto*
12. ¿Cuánta carga cabe en la parte trasera? — *Poca / Media / Mucha / Caja abierta*

### Sección 4. Capacidad y motor

13. ¿Qué tan capaz es de circular en terracería o caminos en mal estado? — *escala 1 a 5*
14. ¿Tiene tracción en las cuatro ruedas (4x4 o AWD)? — *Sí / No*
15. Potencia aproximada del motor — *Menos de 100 hp / 100 a 150 hp / 150 a 200 hp / Más de 200 hp*
16. Rendimiento aproximado de combustible — *Menos de 10 km/l / 10 a 14 / 14 a 18 / Más de 18 km/l*

### Sección 5. Uso del vehículo

17. ¿Cuál es el uso principal del vehículo? — *Ciudad / Familia / Trabajo o carga / Viajes en carretera / Transporte de pasajeros*
18. ¿Se usan más de 5 asientos con frecuencia? — *Sí / No*

### Sección 6. Clasificación final

19. ¿Cómo se clasifica ese vehículo? — *Hatchback / Sedán / SUV / Pick-up / Van o Minivan / No estoy seguro*
20. ¿Por qué lo clasificas así? (opcional) — *respuesta abierta*

---

## Anexo B. Dónde encontrar cada dato en la hoja de cálculo

Todos los valores marcados con llaves dobles provienen de la pestaña `11_Valores`, que se genera automáticamente al ejecutar el análisis.

| Marcador | Origen |
|---|---|
| {{TOTAL_RESPUESTAS}}, {{VALIDAS}}, {{DESCARTADAS}}, {{DUPLICADOS}} | `08_Resumen_Datos`, bloque 1 |
| {{N_HATCHBACK}} … {{PCT_VAN}} | `08_Resumen_Datos`, bloque 2 |
| {{N_ENTRENAMIENTO}}, {{N_PRUEBA}} | `07_Metricas`, composición de los conjuntos |
| {{K}}, {{LOO_K1}} … {{LOO_K11}} | `07_Metricas`, selección de k |
| {{EXACTITUD_HOLDOUT}} … {{KAPPA_HOLDOUT}} | `05_Matriz_Confusion`, métricas globales |
| {{EXACTITUD_CV}} … {{KAPPA_CV}} | `06_Validacion_Cruzada`, métricas globales |
| Celdas `CM_xx` de la matriz | `06_Validacion_Cruzada`, matriz acumulada |
| Celdas `SUP_`, `PRE_`, `REC_` y `F1_` | `06_Validacion_Cruzada`, métricas por clase |

---

## Anexo C. Repositorio del proyecto

| Elemento | Ubicación |
|---|---|
| Formulario | {{URL_FORMULARIO}} |
| Hoja de cálculo | {{URL_HOJA}} |
| Código fuente | Editor de Apps Script del libro (archivos `00_Config.gs` a `06_Valores.gs`) |
| Demostración interactiva | `web/knn_demo.html` |
| Conjunto de datos (CSV) | `datos/dataset_EJEMPLO_sintetico.csv` (formato de referencia) |
