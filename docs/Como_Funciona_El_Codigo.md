# Cómo funciona el código

Guía de lectura del proyecto: qué hace cada archivo, cómo se llaman las funciones y dónde está la parte importante.

> **Para quien va a leer el código:** empieza por `02_KNN.gs`. Es el núcleo matemático y no depende de Google Sheets. Todo lo demás es plomería alrededor.

---

## 1. Panorama

El proyecto son **9 archivos** dentro de un mismo proyecto de Apps Script. En Apps Script todos comparten el mismo espacio global: una función definida en un archivo puede usarse desde cualquier otro.

```
00_Config.gs      → parámetros y avisos
00_LEEME.gs       → documentación (no tiene código)
01_Datos.gs       → preguntas, codificación, variables  (esquema.js)
01b_Hojas.gs      → lectura/escritura en Sheets
02_KNN.gs         → el algoritmo                        (knn_core.js)
03_Analisis.gs    → el pipeline que une todo
04_Instalador.gs  → crea el formulario y las pestañas
05_Menu.gs        → menú, demo y pestaña de código
06_Valores.gs     → relleno del documento
```

### Capas

```
┌─────────────────────────────────────────────┐
│  04_Instalador   05_Menu   06_Valores       │  interfaz con el usuario
├─────────────────────────────────────────────┤
│  03_Analisis                                │  orquesta el proceso
├──────────────────────┬──────────────────────┤
│  02_KNN (matemática) │  01b_Hojas (Sheets)  │  motores independientes
├──────────────────────┴──────────────────────┤
│  01_Datos (esquema)      00_Config          │  definiciones
└─────────────────────────────────────────────┘
```

`02_KNN.gs` **no sabe que existe Google Sheets**: recibe arreglos y devuelve números. Gracias a eso se puede probar con Node.js y reutilizar en la demo web.

---

## 2. El recorrido completo de "Ejecutar análisis"

Cuando eliges esa opción del menú, se ejecuta `ejecutarAnalisis()` en `03_Analisis.gs`, que hace esto en orden:

```
ejecutarAnalisis()
│
├─ 1. leerRespuestas()            lee la pestaña del formulario
├─ 2. construirDataset()          texto → números, valida, quita duplicados
├─ 3. escribirDataset(01_Dataset)
├─ 4. dividirEstratificado()      70/30 con semilla fija
├─ 5. escribirDataset(02, 03)
├─ 6. elegirMejorK()              leave-one-out solo con entrenamiento
├─ 7. evaluarConjuntoPrueba()     entrena y predice el 30 %
├─ 8. evaluarValidacionCruzada()  5 particiones sobre todo
├─ 9. escribir 04 a 11
└─ 10. abre la pestaña 10_Reporte
```

Cada paso escribe su resultado en una pestaña. Si algo falla, el error indica la función exacta.

---

## 3. Los archivos, uno por uno

### `00_Config.gs` — los parámetros

Un solo objeto con todo lo configurable:

```javascript
var CONFIG = {
  SEMILLA: 42,
  PROPORCION_PRUEBA: 0.30,
  K_FIJO: 0,                        // 0 = elegir automáticamente
  CANDIDATOS_K: [1, 3, 5, 7, 9, 11],
  FOLDS: 5,
  MIN_RESPUESTAS: 20,
  ELIMINAR_DUPLICADOS: true,
  HOJAS: { DATASET: '01_Dataset', ... }
};
```

También define `SECCIONES_FORM` (las 6 páginas del formulario) y la función `avisar()`, que muestra un mensaje sin romperse si el script se ejecuta desde el editor.

---

### `01_Datos.gs` — el esquema

Es la **fuente de verdad** del instrumento. Contiene:

| Elemento | Qué es |
|---|---|
| `PREGUNTAS` | Las 20 preguntas con sus opciones y textos de ayuda |
| `CLASES` | Las 5 categorías |
| `REGLAS` | Cómo se convierte cada respuesta de texto a número |
| `FEATURES` | Las 14 variables que entran al modelo, con su peso |
| `mapearRespuesta()` | Convierte una fila cruda en una fila del dataset |
| `normalizarTexto()` | Minúsculas, sin acentos, sin espacios dobles |
| `buscarValor()` | Busca un fragmento y devuelve su número |

La conversión se hace **por fragmento**, no por igualdad exacta:

```javascript
var REGLAS = {
  altura_techo: [
    { fragmentos: ['muy alto'], valor: 4 },   // se evalúa primero
    { fragmentos: ['alto'],     valor: 3 },   // "muy alto" ya no llega aquí
    { fragmentos: ['medio'],    valor: 2 },
    { fragmentos: ['bajo'],     valor: 1 }
  ]
};
```

El orden importa: `"muy alto"` contiene `"alto"`, así que la regla específica va antes.

`mapearRespuesta()` devuelve `{ error: 'motivo' }` cuando algo no cuadra. **No adivina**: el registro se descarta y se reporta.

---

### `01b_Hojas.gs` — el puente con Sheets

Aquí vive todo lo que toca la hoja.

| Función | Qué hace |
|---|---|
| `obtenerHojaRespuestas()` | Encuentra la pestaña del formulario por sus encabezados |
| `leerRespuestas()` | Devuelve un arreglo de objetos `{ id, edad, clase, ... }` |
| `construirDataset()` | Mapea, valida y elimina duplicados |
| `escribirDataset()` | Escribe una tabla con formato |
| `escribirTabla()` | Utilidad general: limpia, escribe encabezados, ajusta anchos |
| `distribucionClases()` / `estadisticasFeatures()` | Para el análisis descriptivo |

Detalle importante: las columnas se localizan **por el texto del encabezado**, no por posición. Si el formulario cambia de orden, el script sigue funcionando.

```javascript
var buscado = normalizarTexto(pregunta.titulo);
for (var c = 0; c < encabezados.length; c++) {
  if (normalizarTexto(encabezados[c]) === buscado) { encontrado = c; break; }
}
```

---

### `02_KNN.gs` — el núcleo

Es la parte que se explica en la presentación. Contiene diez bloques.

#### 1. Generador con semilla

`crearPRNG(semilla)` implementa *mulberry32*. Sirve para que la partición sea reproducible: con la misma semilla, los mismos conjuntos.

```javascript
function crearPRNG(semilla) {
  var a = semilla >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

#### 2. Normalización

`calcularEspecificacion(datos, features)` obtiene el mínimo y el máximo **solo del entrenamiento**. `normalizarFila()` aplica la fórmula:

```javascript
function normalizarValor(valor, spec) {
  var rango = spec.max - spec.min;
  if (rango === 0) return 0;          // variable constante: no aporta
  return (Number(valor) - spec.min) / rango;
}
```

#### 3. Distancia

```javascript
function distanciaEuclidiana(a, b, spec) {
  var suma = 0;
  for (var i = 0; i < a.length; i++) {
    var diferencia = a[i] - b[i];
    suma += spec[i].peso * diferencia * diferencia;
  }
  return Math.sqrt(suma);
}
```

#### 4. Entrenamiento

En KNN entrenar es guardar:

```javascript
function entrenarModelo(datosEntrenamiento, features) {
  var spec = calcularEspecificacion(datosEntrenamiento, features);
  var X = [], y = [], ids = [];
  for (var i = 0; i < datosEntrenamiento.length; i++) {
    X.push(normalizarFila(datosEntrenamiento[i], spec));
    y.push(datosEntrenamiento[i].clase);
    ids.push(datosEntrenamiento[i].id);
  }
  var clases = [];
  for (var j = 0; j < y.length; j++) {
    if (clases.indexOf(y[j]) === -1) clases.push(y[j]);
  }
  clases.sort();
  return { spec: spec, X: X, y: y, ids: ids, clases: clases };
}
```

#### 5. Predicción

El corazón del algoritmo. *(Versión resumida para lectura: el código real añade el desempate por cercanía y el recorte de k cuando hay menos vecinos.)*

```javascript
function predecirKNN(modelo, perfil, k) {
  var vector = normalizarFila(perfil, modelo.spec);

  // 1. distancia a todos
  var vecinos = modelo.X.map(function (x, i) {
    return { clase: modelo.y[i], distancia: distanciaEuclidiana(vector, x, modelo.spec) };
  });

  // 2. ordenar y tomar los k primeros
  vecinos.sort(function (a, b) { return a.distancia - b.distancia; });
  var elegidos = vecinos.slice(0, Math.min(k, vecinos.length));

  // 3. votar con peso 1/distancia
  var votos = {};
  elegidos.forEach(function (v) {
    votos[v.clase] = (votos[v.clase] || 0) + 1 / (v.distancia + 1e-9);
  });

  // 4. ganar
  var mejor = null, maximo = -Infinity;
  for (var clase in votos) {
    if (votos[clase] > maximo) { maximo = votos[clase]; mejor = clase; }
  }
  return { clase: mejor, vecinos: elegidos, votos: votos };
}
```

#### 6. Matriz de confusión

```javascript
function calcularMatrizConfusion(reales, predichos, clases) {
  var matriz = ...;                        // 5 × 5 en ceros
  for (var m = 0; m < reales.length; m++) {
    var fila = clases.indexOf(reales[m]);
    var col  = clases.indexOf(predichos[m]);
    if (fila !== -1 && col !== -1) matriz[fila][col]++;
  }
  return matriz;
}
```

#### 7. Métricas

`calcularMetricas()` recorre la matriz y devuelve exactitud, precisión, recall, F1 por clase, macro-F1 y kappa de Cohen.

#### 8. Particiones

| Función | Qué hace |
|---|---|
| `dividirEstratificado()` | Baraja cada clase y toma su 30 % para prueba |
| `dividirKFoldEstratificado()` | Reparte en 5 folds manteniendo la proporción de clases |

#### 9. Selección de k

```javascript
function elegirMejorK(datosEntrenamiento, features, candidatos) {
  // para cada k: leave-one-out dentro del entrenamiento
  // devuelve { tabla, mejorK }
}
```

#### 10. Evaluaciones de alto nivel

`evaluarConjuntoPrueba()` y `evaluarValidacionCruzada()` devuelven un objeto listo para graficar:

```javascript
{
  modelo, detalles, reales, predichos,
  matriz, clases, metricas
}
```

---

### `03_Analisis.gs` — el pipeline

Aquí no hay matemática: solo se encadenan las funciones y se escribe el resultado.

| Función | Escribe en |
|---|---|
| `ejecutarAnalisis()` | Orquesta todo |
| `escribirPredicciones()` | `04_Predicciones` |
| `dibujarMatrizConfusion()` | Dibuja una matriz con totales y colores |
| `escribirHojaMatriz()` | `05_Matriz_Confusion` |
| `escribirHojaValidacionCruzada()` | `06_Validacion_Cruzada` |
| `escribirHojaMetricas()` | `07_Metricas` |
| `escribirHojaResumen()` | `08_Resumen_Datos` |
| `escribirHojaReporte()` | `10_Reporte` |
| `construirParrafosReporte()` | Redacta los 8 párrafos con cifras reales |
| `ordenarResultadoPorClases()` | Pone las clases en el orden del proyecto |

---

### `04_Instalador.gs` — crear todo

| Función | Qué hace |
|---|---|
| `instalarTodo()` | Punto de entrada: formulario + pestañas + guía |
| `crearOReutilizarFormulario()` | Reutiliza el formulario guardado en las propiedades del script |
| `agregarPreguntas()` | Crea los ítems según `PREGUNTAS` |
| `sincronizarAyudas()` | Actualiza los textos de ayuda sin tocar los títulos |
| `crearPestanasBase()` | Crea las pestañas vacías |

Es **idempotente**: ejecutarlo dos veces no duplica nada.

---

### `05_Menu.gs` — la interfaz

| Función | Qué hace |
|---|---|
| `onOpen()` | Construye el menú al abrir la hoja |
| `activarModoDemo()` / `desactivarModoDemo()` | Datos sintéticos aislados en su propia pestaña |
| `borrarResultados()` | Limpia 01–11 sin tocar las respuestas |
| `escribirHojaCodigo()` | Publica el código resumido en `09_Codigo` |

---

### `06_Valores.gs` — el documento

| Función | Qué hace |
|---|---|
| `escribirHojaValores()` | Genera la tabla `marcador → valor` |
| `formatearValorMarcador()` | Convierte `0.6818` en `68.18%` si hace falta |
| `completarDocumento(id)` | Rellena un Doc por su ID (sin interfaz) |
| `reemplazarMarcadoresEnDocumento()` | Versión con menú y prompt |
| `explicarConfusion()` | Redacta por qué se confunden dos clases, comparando promedios |

El relleno usa `replaceText`, que interpreta el patrón como expresión regular. Por eso los marcadores se escapan:

```javascript
function escaparParaRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## 4. Las estructuras de datos

Todo el código gira alrededor de cuatro objetos:

### `fila`

Un vehículo ya codificado:

```javascript
{ id: 'R015', clase: 'Van', asientos: 7, filas: 3, ..., uso_pasajeros: 1 }
```

### `spec`

La escala de cada variable, calculada con el entrenamiento:

```javascript
[{ id: 'asientos', etiqueta: 'Número de asientos', peso: 1.2, min: 2, max: 8 }, ...]
```

### `modelo`

Lo que devuelve entrenar:

```javascript
{ spec: [...], X: [[...], [...]], y: ['Van', 'SUV', ...], ids: [...], clases: [...] }
```

### `resultado`

Lo que devuelve evaluar:

```javascript
{ modelo, detalles, reales, predichos, matriz, clases, metricas }
```

---

## 5. Por qué el código está separado así

| Decisión | Motivo |
|---|---|
| Núcleo sin dependencias de Sheets | Se puede probar con Node (3 suites de pruebas) y reutilizar en la demo web |
| Una pestaña por resultado | Se puede auditar cada paso |
| Funciones pequeñas y nombradas en español | Se explican solas en la presentación |
| Semilla fija | El experimento es reproducible |
| `avisar()` en vez de `getUi().alert()` | El script no falla si se ejecuta desde el editor |
| Modo demo en pestaña aparte | Nunca contamina las respuestas reales |

---

## 6. Cómo leerlo (ruta recomendada)

1. **`00_Config.gs`** — 2 minutos. Entiendes los parámetros.
2. **`02_KNN.gs`** — 20 minutos. Empieza por `distanciaEuclidiana`, sigue con `predecirKNN`, luego `calcularMatrizConfusion`.
3. **`03_Analisis.gs`** — 10 minutos. Solo `ejecutarAnalisis()`; el resto son escrituras.
4. **`01_Datos.gs`** — cuando quieras entender de dónde salen los números.
5. **`01b_Hojas.gs`** — cuando quieras ver cómo se lee la hoja.

---

## 7. Cómo modificarlo sin romperlo

| Quiero... | Dónde |
|---|---|
| Cambiar la proporción de prueba | `CONFIG.PROPORCION_PRUEBA` |
| Fijar k manualmente | `CONFIG.K_FIJO = 3` |
| Probar otras k | `CONFIG.CANDIDATOS_K` |
| Cambiar pesos de variables | `FEATURES` en `01_Datos.gs` |
| Agregar una pregunta | `PREGUNTAS` + `REGLAS` + `FEATURES` |
| Cambiar el texto de ayuda | `descripcion` en `PREGUNTAS` |

**Nunca cambies el `titulo` de una pregunta** si ya tienes respuestas: es el encabezado de la columna y el script dejaría de encontrarla.

Después de cualquier cambio: `node src/build.mjs` (si tocaste `src/`) y volver a pegar en Apps Script.

---

## 8. Resumen para la presentación

> "El código está separado en dos motores: uno que solo calcula (distancias, votos, métricas) y otro que solo lee y escribe en la hoja. El análisis los une: lee las respuestas, las convierte en números, separa entrenamiento y prueba, elige k con leave-one-out, evalúa dos veces y escribe cada resultado en su pestaña. Como el motor de cálculo no depende de Google, se puede probar por separado, y por eso sé que los números de la hoja son correctos."

---

*Documento de apoyo. La explicación del algoritmo sin tecnicismos está en `Explicacion_Sencilla.md`.*
