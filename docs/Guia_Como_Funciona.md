# Guía completa: cómo funciona el sistema

Documento de referencia para entender, operar y defender el proyecto. Explica qué hace cada pieza, cómo se conectan y por qué se tomaron las decisiones metodológicas.

> **Idea en una frase:** una persona describe un vehículo real respondiendo 20 preguntas; el sistema convierte esa descripción en 14 números, la compara con las descripciones ya recogidas y le asigna una categoría: Hatchback, Sedán, SUV, Pick-up o Van.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Flujo completo de los datos](#2-flujo-completo-de-los-datos)
3. [El formulario](#3-el-formulario)
4. [Los archivos de código](#4-los-archivos-de-código)
5. [Las pestañas de la hoja](#5-las-pestañas-de-la-hoja)
6. [Cómo funciona KNN en este proyecto](#6-cómo-funciona-knn-en-este-proyecto)
7. [Decisiones metodológicas (y por qué)](#7-decisiones-metodológicas-y-por-qué)
8. [Operación diaria: qué hacer y en qué orden](#8-operación-diaria-qué-hacer-y-en-qué-orden)
9. [El documento y el relleno automático](#9-el-documento-y-el-relleno-automático)
10. [Cómo cambiar el experimento](#10-cómo-cambiar-el-experimento)
11. [Problemas frecuentes](#11-problemas-frecuentes)
12. [Estado actual del proyecto](#12-estado-actual-del-proyecto)
13. [Glosario](#13-glosario)

---

## 1. Visión general

El proyecto resuelve un problema de **clasificación supervisada**: dada la descripción de un vehículo, predecir su categoría.

```
   Persona                      Google Forms              Google Sheets
 describe un    ──────────▶    20 campos de     ──────▶   Respuestas de
  vehículo                     texto/número               formulario 2
                                                                  │
                                                                  ▼
                                                        ┌──────────────────┐
                                                        │   Apps Script    │
                                                        │  (9 archivos)    │
                                                        └──────────────────┘
                                                                  │
        ┌─────────────────────────────────────────────────────────┤
        ▼                                                         ▼
  Dataset limpio                                        Modelo KNN entrenado
  14 variables                                          + matriz de confusión
        │                                                         │
        └──────────────────────────┬──────────────────────────────┘
                                   ▼
                    10 pestañas de resultados + 1 tabla de valores
                                   │
                                   ▼
                    Google Doc rellenado automáticamente
```

**Lo que NO hace:** no consulta internet, no descarga bases de datos, no identifica marca/modelo ni predice precios. Todos los datos provienen de personas.

---

## 2. Flujo completo de los datos

### Paso 1 — Recolección

Cada respuesta del formulario cae automáticamente en la pestaña `Respuestas de formulario 2`, con una columna por pregunta (21 columnas: marca temporal + 20 preguntas).

### Paso 2 — Limpieza y codificación

El script lee esa pestaña y, por cada fila:

| Acción | Detalle |
|---|---|
| Localiza columnas | Por el **texto del encabezado**, no por posición |
| Convierte texto a número | "Alto" → 3, "Caja abierta…" → 4, "Sí" → 1 |
| Valida | Si falta un valor o no se reconoce, el registro se descarta y se reporta |
| Descarta "No estoy seguro" | Sin etiqueta fiable no se puede entrenar |
| Elimina duplicados | Huella completa de variables + clase |

### Paso 3 — Normalización

Cada variable se lleva al rango [0, 1] con min-max, usando **solo las estadísticas del conjunto de entrenamiento**. Esto evita que "asientos" (2–8) aplaste a una variable binaria (0–1).

### Paso 4 — Partición

70 % entrenamiento / 30 % prueba, **estratificada** (se baraja cada clase por separado) y con **semilla fija 42**, para que el experimento sea reproducible.

### Paso 5 — Entrenamiento y selección de k

KNN no calcula parámetros: "entrenar" es guardar los vectores normalizados. El valor de k se elige con **leave-one-out sobre el entrenamiento**, probando 1, 3, 5, 7, 9 y 11. El conjunto de prueba no participa.

### Paso 6 — Evaluación

Dos estimaciones complementarias:

| Evaluación | Qué mide | Cuándo usarla |
|---|---|---|
| Holdout 70/30 | Rendimiento con datos nunca vistos | Cifra oficial de "prueba" |
| Validación cruzada 5-fold | Cada registro se prueba una vez | Estimación estable con pocos datos |

### Paso 7 — Reporte

Se generan la matriz de confusión, las métricas por clase, la tabla de valores y ocho párrafos listos para el documento.

---

## 3. El formulario

**Enlace:** https://docs.google.com/forms/d/e/1FAIpQLScAoT4O97VXhvqYv7NQd77WyRsuRY9aEx-cAKpnWn0wORgs2g/viewform

### Estructura (6 secciones, 20 preguntas)

| Sección | Preguntas | Qué recoge |
|---|---|---|
| Identificación | 1–2 | Marca/modelo (opcional) y si el vehículo es propio |
| Carrocería y asientos | 3–8 | Puertas, asientos, filas, cajuela, caja, compuerta |
| Tamaño y altura | 9–12 | Longitud, altura del techo, altura al suelo, carga |
| Capacidad y motor | 13–16 | Terreno, tracción, potencia, rendimiento |
| Uso | 17–18 | Uso principal y frecuencia de 7 asientos |
| Clasificación | 19–20 | **Categoría (etiqueta)** y comentario |

### Reglas de diseño

- **Describe un vehículo, no una preferencia.** Se pregunta cómo es, no cuál le gustaría.
- **Etiqueta al final.** Evita condicionar las respuestas anteriores.
- **Texto de ayuda en las preguntas ambiguas** (3 a 12 y 19). Es clave: la pregunta 6 se malinterpretó en la primera aplicación.
- **"No estoy seguro"** permite descartar sin inventar etiquetas.

> **Importante:** no cambies los **títulos** de las preguntas. Son los encabezados de la hoja y el script los usa para encontrar las columnas. Puedes cambiar el texto de ayuda sin problema.

---

## 4. Los archivos de código

Todo vive en un proyecto de Apps Script vinculado a la hoja (Extensiones → Apps Script). Son 9 archivos y comparten un mismo espacio global.

| Archivo | Para qué sirve | Cuándo tocarlo |
|---|---|---|
| `00_Config.gs` | Parámetros: semilla, proporción de prueba, k fijo, folds, mínimo de respuestas, nombres de pestañas, colores | Para experimentar con el diseño |
| `00_LEEME.gs` | Documentación interna del proyecto | Solo lectura |
| `01_Datos.gs` | Las 20 preguntas, la codificación texto→número, las 14 variables y el generador de datos sintéticos | Si cambias preguntas u opciones |
| `01b_Hojas.gs` | Lectura de respuestas, limpieza, escritura de tablas y formato | Si cambias la estructura de la hoja |
| `02_KNN.gs` | **Núcleo del algoritmo**: normalización, distancia, votación, matriz de confusión, métricas, particiones y validación cruzada | Casi nunca; está aislado a propósito |
| `03_Analisis.gs` | Orquesta todo: lee, divide, entrena, evalúa y escribe las pestañas | Si cambias el flujo |
| `04_Instalador.gs` | Crea el formulario y las pestañas; sincroniza textos de ayuda | Al instalar |
| `05_Menu.gs` | Menú, modo demostración, pestaña de código | Para agregar acciones |
| `06_Valores.gs` | Genera `11_Valores` y rellena el documento | Para el documento |

### Por qué el núcleo está separado

`02_KNN.gs` no sabe que existe Google Sheets: recibe arreglos y devuelve números. Eso permite probarlo aparte (con Node.js) y reutilizarlo en la demo web.

---

## 5. Las pestañas de la hoja

| Pestaña | Contenido | Se genera al... |
|---|---|---|
| `Respuestas de formulario 2` | Respuestas crudas del formulario | Cada envío |
| `00_Guia` | Instrucciones, enlaces y estado | Instalar |
| `01_Dataset` | Los vehículos limpios y codificados (21 columnas) | Ejecutar análisis |
| `02_Entrenamiento` | 70 % de los registros | Ejecutar análisis |
| `03_Prueba` | 30 % reservado | Ejecutar análisis |
| `04_Predicciones` | Predicción caso por caso + vecinos | Ejecutar análisis |
| `05_Matriz_Confusion` | Matriz 5×5 del holdout + métricas | Ejecutar análisis |
| `06_Validacion_Cruzada` | Matriz acumulada, folds y métricas | Ejecutar análisis |
| `07_Metricas` | Comparación de evaluaciones, selección de k, composición | Ejecutar análisis |
| `08_Resumen_Datos` | Calidad, distribución y varianza por variable | Ejecutar análisis |
| `09_Codigo` | Código documentado (resumen didáctico) | Instalar |
| `10_Reporte` | 8 párrafos con las cifras reales | Ejecutar análisis |
| `11_Valores` | Marcador → valor, para completar el documento | Ejecutar análisis |
| `ZZ_Obsoleta_no_usar` | Respuestas de la versión anterior del cuestionario | — (heredada) |

### Cómo leer cada una

**`01_Dataset`** — Una fila por vehículo. Columnas:
`ID | Clase | 14 variables del modelo | 5 variables de control`

Las variables de control (marcadas `[control]`) se guardan para el análisis descriptivo pero **no entran al modelo**.

**`04_Predicciones`** — Permite auditar cualquier resultado:
`ID | Clase real | Clase predicha | ¿Acertó? | Distancia promedio | Vecinos con su distancia`

**`05` y `06`** — La matriz tiene filas = clase real, columnas = clase predicha. La diagonal es el acierto. En `05` son los casos de prueba; en `06` son todos (validación cruzada).

**`07_Metricas`** — Contiene la tabla que justifica la elección de k. Si el profesor pregunta "¿por qué ese k?", la respuesta está ahí.

**`10_Reporte`** — Texto listo para pegar. Es la versión resumida del documento.

**`11_Valores`** — Cada `{{MARCADOR}}` con su valor. Es lo que usa el relleno del documento.

---

## 6. Cómo funciona KNN en este proyecto

### 6.1 Qué es

KNN (K vecinos más cercanos) es un algoritmo **perezoso**: no aprende parámetros, solo guarda ejemplos. Para clasificar un vehículo nuevo:

1. Lo normaliza con la escala del entrenamiento.
2. Calcula su distancia a **todos** los vehículos conocidos.
3. Toma los **k** más cercanos.
4. Cada vecino vota por su clase, con peso `1 / distancia`.
5. Gana la clase con más votos; si hay empate exacto, decide el vecino más cercano.

### 6.2 La distancia

Distancia euclidiana **ponderada**:

```
d(a, b) = √( Σ  wᵢ · (aᵢ − bᵢ)² )
```

- Cada variable está normalizada a [0, 1].
- `wᵢ` es el peso de la variable (definido en `FEATURES`). Se subieron las que mejor separan (asientos, caja abierta) y se bajaron las que casi todos comparten (rendimiento).
- Si todos los pesos fueran 1, sería la euclidiana clásica.

### 6.3 Las 14 variables

| # | Variable | Escala | Peso |
|---|---|---|---|
| 1 | Asientos | 2–8 | 1.2 |
| 2 | Filas de asientos | 1–3 | 1.0 |
| 3 | Longitud | 1–4 | 0.8 |
| 4 | Altura del techo | 1–4 | 1.0 |
| 5 | Altura al suelo | 1–4 | 0.8 |
| 6 | Capacidad de carga | 1–4 | 1.0 |
| 7 | Cajuela separada | 0/1 | 0.9 |
| 8 | Caja abierta | 0/1 | 1.0 |
| 9 | Compuerta trasera | 0/1 | 0.6 |
| 10 | Tracción 4x4 | 0/1 | 0.7 |
| 11 | Potencia | 1–4 | 0.6 |
| 12 | Rendimiento | 1–4 | 0.5 |
| 13 | Uso: trabajo/carga | 0/1 | 0.8 |
| 14 | Uso: pasajeros | 0/1 | 0.7 |

### 6.4 Las métricas

| Métrica | Qué significa |
|---|---|
| **Exactitud** | Aciertos / total |
| **Precisión** | De los que dije que eran X, ¿cuántos eran X? |
| **Recall** | De los X reales, ¿cuántos encontré? |
| **F1** | Media armónica de precisión y recall |
| **Macro-F1** | Promedio simple del F1 de las clases (trata igual a clases con pocos casos) |
| **Kappa de Cohen** | Acuerdo descontando el azar. > 0.6 es sustancial |

### 6.5 Por qué dos evaluaciones

Con pocos registros, el 30 % de prueba son 7–9 casos: un solo error mueve 11 puntos. Por eso se reporta también la validación cruzada de 5 particiones, donde cada registro se prueba exactamente una vez. **La cifra estable es la de validación cruzada**; la de prueba es la oficial del holdout.

---

## 7. Decisiones metodológicas (y por qué)

Estas son las preguntas que puede hacer el profesor. Cada una tiene su justificación en el documento.

### ¿No es trampa preguntar la categoría?

No. La categoría es la **variable objetivo**: la respuesta que queremos aprender a predecir. El modelo nunca la recibe como entrada; solo ve las 14 características. Así se evita la fuga de información, que es el error más común en estos proyectos.

### ¿Por qué no corregir el "maletero" por la etiqueta?

Sería fuga de información: si pongo `cajuela = No` en todos los hatchbacks porque son hatchbacks, el modelo aprende la respuesta de forma directa. La corrección se hizo porque **cada encuestado confirmó** que no había entendido, no porque el equipo lo dedujera.

### ¿Por qué normalizar solo con entrenamiento?

Si los mínimos y máximos se calcularan con todos los datos, el modelo "vería" el futuro y las métricas serían artificialmente buenas. Es la regla de oro contra el *data leakage*.

### ¿Por qué partición estratificada?

Con 5 clases y pocas respuestas, un corte aleatorio puede dejar una clase fuera del conjunto de prueba. La estratificación baraja cada clase por separado.

### ¿Por qué k se elige con leave-one-out?

Porque usar el conjunto de prueba para elegir k sesga la evaluación final. LOO solo mira el entrenamiento.

### ¿Por qué el resultado es modesto?

Dos causas documentadas:

1. **Muestra pequeña** (decenas de vehículos para 14 variables).
2. **Ambigüedad de la pregunta 6** en la primera aplicación, que hizo indistinguibles Hatchback y Sedán hasta que se corrigió.

Además, SUV y Van comparten tamaño, altura y plazas: hay SUVs de 7 asientos que son funcionalmente una minivan. Es una frontera difusa real, no un fallo del algoritmo.

---

## 8. Operación diaria: qué hacer y en qué orden

### Menú "KNN Vehículos"

| Opción | Qué hace |
|---|---|
| **1. Instalar** | Crea el formulario y las pestañas (idempotente) |
| **2. Ejecutar análisis** | Pipeline completo: genera 01 a 11 |
| **3. Ver enlace del formulario** | Muestra el enlace para compartir |
| **4. Completar documento con mis datos** | Rellena el Google Doc |
| Ver guía / Ver código | Navegación |
| Datos de demostración | Activa/desactiva datos sintéticos (para ensayar) |
| Borrar resultados del análisis | Limpia 01–11 sin tocar respuestas |
| Acerca de | Resumen del proyecto |

### Secuencia recomendada

```
1. Compartir el formulario
2. Recolectar respuestas
3. [Cerrar el formulario cuando ya no quieras más]
4. Ejecutar análisis
5. Revisar 10_Reporte y 07_Metricas
6. Pegar el HTML en Google Docs
7. Menú → 4. Completar documento
8. Escribir los datos del equipo
```

### Cuándo volver a ejecutar el análisis

Cada vez que entren respuestas nuevas. **Ojo:** si ya rellenaste el documento, los marcadores se consumieron y el documento no se actualiza solo. Habría que volver a pegar la plantilla y rellenar de nuevo. Por eso conviene **cerrar el formulario antes de generar la entrega final**.

### Modo demostración

Sirve para ensayar sin datos reales. Crea una pestaña `ZZ_Respuestas_Demo` aparte, marca todo en rojo y nunca toca las respuestas reales. **No debe estar activo en la entrega.**

---

## 9. El documento y el relleno automático

### Qué archivo se pega

`docs/Documento_Proyecto.html` — **no** el `.md`. El HTML está renderizado y conserva títulos, tablas y negritas al pegarlo en Google Docs.

### Cómo se rellena

1. Menú **4. Completar documento con mis datos**.
2. Pega la URL del Doc.
3. El script recorre `11_Valores` y sustituye cada `{{MARCADOR}}`.
4. Quedan resaltados en amarillo **9 datos** que solo puedes escribir tú:

| Marcador | Dato |
|---|---|
| `{{NOMBRE_PROFESOR}}` | Nombre del profesor |
| `{{NOMBRE_INTEGRANTE_1..3}}` | Integrantes |
| `{{INSTITUCIÓN}}` | Institución |
| `{{FECHA_ENTREGA}}` | Fecha de entrega |
| `{{FECHA_INICIO}}` / `{{FECHA_FIN}}` | Periodo de recolección |
| `{{TIEMPO_PROMEDIO}}` | Tiempo promedio de respuesta |

### El veredicto se calcula solo

La conclusión del documento no está escrita a mano: el script compara la exactitud con el umbral del 75 % y escribe **"se confirma"** o **"no se confirma"**, con la explicación correspondiente. Así el documento nunca afirma algo que los números contradicen.

### Después de rellenar

- Borra el recuadro de instrucciones del inicio.
- Busca `{{`: no debe quedar ninguno (salvo que decidas dejar alguno a propósito).

---

## 10. Cómo cambiar el experimento

### Parámetros (`00_Config.gs`)

| Parámetro | Valor actual | Efecto |
|---|---|---|
| `SEMILLA` | 42 | Cambia la partición (y quizá las métricas) |
| `PROPORCION_PRUEBA` | 0.30 | 70/30 entrenamiento/prueba |
| `K_FIJO` | 0 | 0 = elegir k automáticamente |
| `CANDIDATOS_K` | [1,3,5,7,9,11] | Valores que prueba LOO |
| `FOLDS` | 5 | Particiones de la validación cruzada |
| `MIN_RESPUESTAS` | 20 | Mínimo para ejecutar |
| `ELIMINAR_DUPLICADOS` | true | Descarta envíos idénticos |

### Preguntas y variables (`01_Datos.gs`)

- `PREGUNTAS`: texto, opciones y ayuda de cada pregunta.
- `REGLAS`: cómo se convierte cada respuesta a número.
- `FEATURES`: qué variables entran al modelo y con qué peso.
- `CLASES`: las categorías.

> Si cambias un **título**, la hoja de respuestas cambia de encabezado y el script puede dejar de encontrar la columna. Cambia solo el texto de ayuda.

### Al cambiar el código

1. Edita el archivo local en `apps-script/`.
2. Pega el contenido en el editor de Apps Script.
3. Ejecuta **2. Ejecutar análisis** para verificar.

---

## 11. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "No se encontró la hoja de respuestas" | Formulario no vinculado | Forms → Respuestas → vincular a Hojas de cálculo |
| "Solo hay N descripciones válidas y se requieren 20" | Pocas respuestas | Difundir más o bajar `MIN_RESPUESTAS` |
| "No hay respuestas para las clases: X" | Nadie describió esa categoría | Conseguir ejemplos de esa clase |
| Aparece "MODO DEMOSTRACIÓN ACTIVO" | Estás con datos sintéticos | Menú → Datos de demostración → Desactivar |
| Quedan `{{marcadores}}` en el Doc | Se saltó el paso 4 o el Doc era una versión vieja | Volver a pegar el HTML y rellenar |
| Los porcentajes salen como `0.6818` | Sheets guardó el % como número | Ya corregido: la columna se guarda como texto |
| Las filas de la matriz no coinciden con el documento | Orden alfabético vs orden del proyecto | Ya corregido: se reordena según `CLASES` |
| "No se puede borrar una hoja con un formulario vinculado" | La hoja pertenece a un formulario en la papelera | Dejarla como `ZZ_Obsoleta_no_usar` |
| El análisis tarda mucho | LOO entrena una vez por registro y por k | Normal con pocos datos (< 1 min) |
| Cambian las cifras cada día | Entran respuestas nuevas | Cerrar el formulario antes de la entrega |

---

## 12. Estado actual del proyecto

> Cifras al cierre de esta guía. Los valores vivos están siempre en `11_Valores`.

| Dato | Valor |
|---|---|
| Respuestas recibidas | 28 |
| Válidas | 27 |
| Clases | Hatchback, Sedán, SUV, Pick-up, Van |
| k elegido | 3 |
| Exactitud holdout (9 casos) | 88.89 % |
| Exactitud validación cruzada (27 casos) | **59.26 %** |
| Veredicto de la hipótesis (> 75 %) | no se confirma |

### Interpretación honesta

El holdout alto (8 de 9) no debe presentarse como resultado principal: con 9 casos, un error mueve 11 puntos. La estimación estable es **59.26 %**, superior al azar (20 % con cinco clases) pero por debajo del umbral planteado.

La clase con más dificultad es **SUV**, que se confunde con Van y Sedán por similitud real de tamaño y plazas.

### Limitaciones declaradas

- Muestra pequeña y por conveniencia.
- Ambigüedad inicial de las preguntas de carrocería (corregida con texto de ayuda).
- Ruido de etiqueta: algunos encuestados clasificaron con criterios distintos.
- Variables declaradas en rangos amplios, no medidas con instrumentos.

---

## 13. Glosario

| Término | Significado |
|---|---|
| **Clase / etiqueta** | Categoría que se quiere predecir (Hatchback, Sedán…) |
| **Feature / variable** | Característica numérica que usa el modelo |
| **Normalización** | Llevar cada variable a [0,1] para que pesen igual |
| **Fuga de información** | Usar datos del futuro o la etiqueta como entrada; infla las métricas |
| **Holdout** | Reservar una parte de los datos para evaluar |
| **Validación cruzada** | Rotar el conjunto de prueba para que todos los casos se evalúen |
| **Estratificado** | Mantener la proporción de clases en cada partición |
| **LOO** | Leave-one-out: dejar un caso fuera y predecir con el resto |
| **Matriz de confusión** | Tabla real vs predicho; la diagonal son los aciertos |
| **Precisión** | De lo que predije como X, cuánto era X |
| **Recall** | De los X reales, cuántos detecté |
| **F1** | Equilibrio entre precisión y recall |
| **Kappa** | Acuerdo corregido por azar (0 = azar, 1 = perfecto) |
| **Clase perezosa** | Algoritmo que no entrena parámetros (KNN) |

---

## Anexo: enlaces

| Recurso | Enlace |
|---|---|
| Formulario | https://docs.google.com/forms/d/e/1FAIpQLScAoT4O97VXhvqYv7NQd77WyRsuRY9aEx-cAKpnWn0wORgs2g/viewform |
| Hoja de cálculo | https://docs.google.com/spreadsheets/d/1-m8E7GWASibPzR4PX_wUdKEk3iez2zgq3Pz6w7K5gq4/edit |
| Documento (Doc) | https://docs.google.com/document/d/1gWkSaKhOSkIBOM1O5Ekv8kjCSyAM4EVZPsrIfmB8zwY/edit |
| Proyecto de Apps Script | https://script.google.com/u/0/home/projects/140lLdFS-u1Ecyd9HpBltmOhBLULZsrPAhAhzTXhZCEobsvgdkT86jveq/edit |
| Demo offline | `web/knn_demo.html` |

---

*Guía del proyecto KNN — Clasificación de vehículos. Los números cambian con cada respuesta nueva; este documento explica el sistema, no sustituye a la hoja.*
