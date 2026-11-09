# Código completo de Google Apps Script

Proyecto **KNN — Clasificación de vehículos a partir de sus características**.

Este documento reúne los nueve archivos del proyecto tal como están en el editor de Apps Script. Para reproducirlo: abre la hoja de cálculo → **Extensiones → Apps Script** → crea un archivo con el mismo nombre y pega el contenido del bloque correspondiente.

> Total: 9 archivos. Generado automáticamente desde `apps-script/`.

## Índice

| Archivo | Contenido | Líneas |
|---|---|---|
| [`00_Config.gs`](#00configgs) | Parámetros del experimento y función de avisos. | 138 |
| [`00_LEEME.gs`](#00leemegs) | Documentación interna del proyecto (no contiene funciones). | 25 |
| [`01_Datos.gs`](#01datosgs) | Las 20 preguntas, la codificación texto→número y las 14 variables. | 437 |
| [`01b_Hojas.gs`](#01bhojasgs) | Lectura de respuestas y escritura/formato en Google Sheets. | 384 |
| [`02_KNN.gs`](#02knngs) | Núcleo del algoritmo: distancia, votación, matriz de confusión, métricas y particiones. | 601 |
| [`03_Analisis.gs`](#03analisisgs) | Pipeline completo que genera las pestañas de resultados. | 681 |
| [`04_Instalador.gs`](#04instaladorgs) | Creación del formulario y de la estructura del libro. | 318 |
| [`05_Menu.gs`](#05menugs) | Menú de la hoja, modo demostración y pestaña de código. | 317 |
| [`06_Valores.gs`](#06valoresgs) | Tabla de valores y relleno automático del documento. | 400 |

---

## 00_Config.gs

Parámetros del experimento y función de avisos.

*138 líneas.*

````javascript
/* ============================================================================
 *  00_Config.gs  —  Configuración central del proyecto
 * ----------------------------------------------------------------------------
 *  PROYECTO: Clasificación de tipos de vehículo con KNN
 *  ENTORNO : Google Apps Script vinculado a una Hoja de cálculo
 *
 *  ¿CÓMO SE USA? (resumen; el detalle está en README.md)
 *   1. Crea una Hoja de cálculo nueva en blanco.
 *   2. Menú Extensiones > Apps Script.
 *   3. Pega estos archivos (00 a 05) en el editor.
 *   4. Ejecuta la función `instalarTodo`.
 *   5. Autoriza los permisos y comparte el enlace del formulario.
 *   6. Cuando tengas respuestas, ejecuta `ejecutarAnalisis`.
 *
 *  Este archivo NO contiene lógica: solo parámetros. Cambiar valores aquí
 *  (semilla, proporción de prueba, k, folds) es suficiente para experimentar.
 * ==========================================================================*/

var CONFIG = {
  /* --- Identidad del proyecto --- */
  TITULO_FORM: 'Encuesta: describe un vehículo y descubre su categoría',
  DESCRIPCION_FORM:
    'Esta encuesta forma parte de un proyecto escolar de Inteligencia Artificial. ' +
    'Elige UN vehículo que conozcas bien (el tuyo, el de tu familia o uno que hayas visto) ' +
    'y describe sus características: carrocería, tamaño, asientos, carga y motor. ' +
    'Con esas respuestas, un modelo KNN intentará clasificarlo en cinco categorías: ' +
    'Hatchback, Sedán, SUV, Pick-up o Van. Son 20 preguntas y toma menos de 4 minutos. ' +
    'No se piden datos personales sensibles.',
  MENSAJE_CONFIRMACION:
    '¡Gracias! Tu descripción ya forma parte del conjunto de datos del proyecto.',

  /* --- Reproducibilidad --- */
  // Semilla fija: la partición entrenamiento/prueba siempre sale igual.
  // Si cambias la semilla, cambian los conjuntos (y quizá las métricas).
  SEMILLA: 42,

  // Proporción de datos reservada para prueba (0.30 = 30 %).
  PROPORCION_PRUEBA: 0.30,

  // 0 = elegir k automáticamente con leave-one-out.
  // Si pones 3, 5, etc., se respeta ese valor (útil para comparar en clase).
  K_FIJO: 0,

  // Valores de k que se prueban en la selección automática.
  CANDIDATOS_K: [1, 3, 5, 7, 9, 11],

  // Número de particiones de la validación cruzada estratificada.
  FOLDS: 5,

  /* --- Calidad de datos --- */
  ELIMINAR_DUPLICADOS: true,   // descarta respuestas idénticas (doble envío)
  MIN_RESPUESTAS: 20,          // debajo de esto el análisis avisa y se detiene

  /* --- Nombres de las hojas (pestañas) del libro --- */
  HOJAS: {
    GUIA: '00_Guia',
    DATASET: '01_Dataset',
    ENTRENAMIENTO: '02_Entrenamiento',
    PRUEBA: '03_Prueba',
    PREDICCIONES: '04_Predicciones',
    MATRIZ: '05_Matriz_Confusion',
    CRUZADA: '06_Validacion_Cruzada',
    METRICAS: '07_Metricas',
    RESUMEN: '08_Resumen_Datos',
    CODIGO: '09_Codigo',
    REPORTE: '10_Reporte',
    VALORES: '11_Valores',
    DEMO: 'ZZ_Respuestas_Demo'   // solo para el modo demostración
  },

  /* --- Paleta de colores (formato de las hojas) --- */
  COLOR: {
    ENCABEZADO: '#1F3864',   // azul oscuro
    TEXTO_ENCABEZADO: '#FFFFFF',
    SUBTITULO: '#D9E2F3',    // azul claro
    ACIERTO: '#C6EFCE',      // verde claro
    ERROR: '#FFC7CE',        // rojo claro
    NEUTRO: '#F2F2F2'
  }
};

/* ----------------------------------------------------------------------------
 *  SECCIONES DEL FORMULARIO
 * ----------------------------------------------------------------------------
 *  Cada sección agrupa un rango de preguntas de PREGUNTAS (ver 01_Datos.gs).
 *  Los índices son inclusivos y se refieren a la posición en el arreglo.
 *  Separar el formulario en páginas mejora la tasa de respuesta.
 * --------------------------------------------------------------------------*/
var SECCIONES_FORM = [
  {
    titulo: 'Identificación del vehículo',
    descripcion: 'Elige un solo vehículo real que conozcas. No importa si es tuyo.',
    desde: 0, hasta: 1
  },
  {
    titulo: 'Carrocería y asientos',
    descripcion: 'Observa el vehículo: número de puertas, asientos y forma del área de carga.',
    desde: 2, hasta: 7
  },
  {
    titulo: 'Tamaño y altura',
    descripcion: 'Compara el vehículo con un automóvil común.',
    desde: 8, hasta: 11
  },
  {
    titulo: 'Capacidad y motor',
    descripcion: 'Si no conoces el dato exacto, elige la opción más aproximada.',
    desde: 12, hasta: 15
  },
  {
    titulo: 'Uso del vehículo',
    descripcion: 'Para qué se usa principalmente.',
    desde: 16, hasta: 17
  },
  {
    titulo: 'Clasificación final',
    descripcion: 'Esta es la variable que el modelo de Inteligencia Artificial intentará predecir.',
    desde: 18, hasta: 19
  }
];

/* ----------------------------------------------------------------------------
 *  AVISOS AL USUARIO
 * ----------------------------------------------------------------------------
 *  `SpreadsheetApp.getUi()` solo existe cuando el script se ejecuta desde la
 *  interfaz de la hoja (menú). Si se ejecuta desde el editor de Apps Script,
 *  lanza un error. Esta función intenta mostrar el aviso y, si no puede, lo
 *  escribe en el registro de ejecución. Así el instalador nunca "falla" por un
 *  simple mensaje.
 * --------------------------------------------------------------------------*/
function avisar(mensaje) {
  try {
    SpreadsheetApp.getUi().alert(mensaje);
  } catch (e) {
    console.log('[AVISO] ' + mensaje);
  }
}
````

## 00_LEEME.gs

Documentación interna del proyecto (no contiene funciones).

*25 líneas.*

````javascript
/* ============================================================================
 *  00_LEEME  —  Guía rápida del proyecto
 * ----------------------------------------------------------------------------
 *  PROYECTO: Clasificación de tipos de vehículo con KNN (Inteligencia Artificial)
 *
 *  ORDEN DE LOS ARCHIVOS
 *    00_Config.gs       Parámetros del experimento (semilla, k, proporciones)
 *    00_LEEME           Este archivo
 *    01_Datos.gs        Preguntas del formulario y codificación de respuestas
 *    01b_Hojas.gs       Lectura y escritura en Google Sheets
 *    02_KNN.gs          Núcleo del algoritmo (documentado línea por línea)
 *    03_Analisis.gs     Pipeline: divide, entrena, evalúa y genera las pestañas
 *    04_Instalador.gs   Crea el formulario y la estructura del libro
 *    05_Menu.gs         Menú de la hoja, modo demostración y documentación
 *    06_Valores.gs      Valores para completar el documento y relleno automático
 *
 *  USO
 *    1. Menú "KNN Vehículos" > "1. Instalar"
 *    2. Difundir el formulario y recolectar respuestas
 *    3. Menú "KNN Vehículos" > "2. Ejecutar análisis"
 *    4. Abrir la pestaña 10_Reporte y 11_Valores
 *
 *  Este archivo solo contiene documentación: no define funciones.
 * ==========================================================================*/
````

## 01_Datos.gs

Las 20 preguntas, la codificación texto→número y las 14 variables.

*437 líneas.*

````javascript
/* ============================================================================
 *  01_Datos.gs — Preguntas del formulario, codificación y variables
 * ----------------------------------------------------------------------------
 *  Copia de src/esquema.js (misma versión que se prueba con Node.js).
 *  Contiene: PREGUNTAS, CLASES, ESCALA, REGLAS de codificación, FEATURES,
 *  mapearRespuesta() y el generador de datos sintéticos para demostración.
 * ==========================================================================*/
/* ============================================================================
 *  esquema.js — Definición del formulario, codificación y features
 * ----------------------------------------------------------------------------
 *  Este archivo es la FUENTE DE VERDAD del proyecto. Se usa, sin cambios, en:
 *
 *    - Google Apps Script  -> 01_Datos.gs   (crea el formulario y limpia datos)
 *    - Demo en el navegador -> web/knn_demo.html
 *    - Pruebas locales      -> src/test.mjs
 *
 *  ENFOQUE DEL PROYECTO
 *  --------------------
 *  Cada persona describe UN VEHÍCULO REAL (el suyo, el de su familia o uno que
 *  conozca bien) respondiendo características observables: carrocería, tamaño,
 *  número de asientos, altura, capacidad de carga, tracción, potencia, uso.
 *  Con esas características, el modelo KNN infiere a qué categoría pertenece:
 *  Hatchback, Sedán, SUV, Pick-up o Van.
 *
 *  La última pregunta pide confirmar la categoría. Esa respuesta es la
 *  VARIABLE OBJETIVO (la etiqueta) y NO se usa como característica de entrada.
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 * A) PREGUNTAS DEL FORMULARIO
 * ----------------------------------------------------------------------------
 * Cada entrada: { id, titulo, tipo, opciones[], obligatoria }
 *   tipo: 'texto' | 'opcion' | 'escala' | 'parrafo'
 * `titulo` se usa como encabezado de columna en la hoja de respuestas, por eso
 * debe coincidir EXACTAMENTE con lo que se cree en el formulario.
 *
 * IMPORTANTE: las preguntas describen el VEHÍCULO, no a la persona. Se pide
 * información que cualquiera puede observar mirando el automóvil.
 * --------------------------------------------------------------------------*/
var PREGUNTAS = [
  /* --- Sección 1: identificación --- */
  { id: 'nombre', titulo: '1. ¿Qué vehículo vas a describir? (marca y modelo, opcional)', tipo: 'texto', opciones: [], obligatoria: false,
    descripcion: 'Escribe la marca y el modelo si los conoces. No es obligatorio.' },
  { id: 'propio', titulo: '2. ¿El vehículo es tuyo o de alguien cercano?', tipo: 'opcion', opciones: ['Sí, es mío', 'Es de un familiar o conocido', 'No, es de otra persona'], obligatoria: true,
    descripcion: 'Solo para control de calidad. No guardamos datos del propietario.' },

  /* --- Sección 2: carrocería y asientos --- */
  { id: 'puertas', titulo: '3. ¿Cuántas puertas laterales tiene (sin contar la compuerta trasera)?', tipo: 'opcion', opciones: ['2', '3', '4', '5', 'Más de 5'], obligatoria: true,
    descripcion: 'Cuenta solo las puertas de los costados. NO cuentes la compuerta trasera ni la tapa de la cajuela.' },
  { id: 'asientos', titulo: '4. ¿Cuántos asientos tiene en total?', tipo: 'opcion', opciones: ['2', '3', '4', '5', '6', '7', '8 o más'], obligatoria: true,
    descripcion: 'Cuenta todas las plazas, incluida la del conductor. No cuentes espacios sin cinturón de seguridad.' },
  { id: 'filas', titulo: '5. ¿Cuántas filas de asientos tiene?', tipo: 'opcion', opciones: ['1', '2', '3'], obligatoria: true,
    descripcion: 'Fila 1: conductor y copiloto. Fila 2: asientos traseros. Fila 3: solo en van y algunas SUV familiares.' },
  { id: 'cajuela_separada', titulo: '6. ¿Tiene cajuela cerrada y separada del área de pasajeros?', tipo: 'opcion', opciones: ['Sí', 'No'], obligatoria: true,
    descripcion: 'Responde Sí solo si el equipaje va en un compartimento cerrado y SEPARADO del habitáculo, como en un sedán. Si el equipaje va en el mismo espacio que los pasajeros (hatchback, SUV, van), responde No.' },
  { id: 'caja_abierta', titulo: '7. ¿El área de carga trasera es una caja abierta, sin techo?', tipo: 'opcion', opciones: ['Sí', 'No'], obligatoria: true,
    descripcion: 'Responde Sí solo si la carga va al aire libre, sin techo ni tapa encima: es el caso de las pick-up.' },
  { id: 'compuerta', titulo: '8. ¿La puerta trasera se abre completa, como compuerta (tipo hatch)?', tipo: 'opcion', opciones: ['Sí', 'No'], obligatoria: true,
    descripcion: 'Responde Sí si toda la parte trasera se levanta como una compuerta e incluye el vidrio (hatchback, SUV, van). Responde No si solo se abre una tapa de cajuela (sedán).' },

  /* --- Sección 3: tamaño y altura --- */
  { id: 'longitud', titulo: '9. ¿Qué tan largo es comparado con un auto común?', tipo: 'opcion', opciones: ['Más corto que un auto común', 'Similar a un auto común', 'Más largo que un auto común', 'Mucho más largo que un auto común'], obligatoria: true,
    descripcion: 'Compara con un sedán común de cuatro puertas.' },
  { id: 'altura_techo', titulo: '10. ¿Qué tan alto es el techo de la carrocería?', tipo: 'opcion', opciones: ['Bajo', 'Medio', 'Alto', 'Muy alto'], obligatoria: true,
    descripcion: 'Bajo: como un sedán. Medio: como un auto familiar. Alto: como una SUV. Muy alto: como una van o furgoneta.' },
  { id: 'despeje', titulo: '11. ¿Qué tan separado está la parte baja del vehículo del suelo?', tipo: 'opcion', opciones: ['Muy bajo', 'Bajo', 'Alto', 'Muy alto'], obligatoria: true,
    descripcion: 'Es el espacio libre entre el suelo y la parte más baja del vehículo. Muy bajo: auto deportivo. Muy alto: camioneta 4x4.' },
  { id: 'carga', titulo: '12. ¿Cuánta carga cabe en la parte trasera?', tipo: 'opcion', opciones: ['Poca (unas maletas)', 'Media (maletas y bultos)', 'Mucha (muebles o equipo)', 'Caja abierta para carga voluminosa'], obligatoria: true,
    descripcion: 'Considera el espacio con los asientos traseros en su posición normal, sin abatirlos.' },

  /* --- Sección 4: capacidad y motor --- */
  { id: 'offroad', titulo: '13. ¿Qué tan capaz es de circular en terracería o caminos en mal estado?', tipo: 'escala', opciones: ['1', '2', '3', '4', '5'], obligatoria: true,
    descripcion: '1 = no puede salir del pavimento; 5 = diseñado para todo terreno.' },
  { id: 'traccion', titulo: '14. ¿Tiene tracción en las cuatro ruedas (4x4 o AWD)?', tipo: 'opcion', opciones: ['Sí', 'No'], obligatoria: true,
    descripcion: 'Responde Sí si el vehículo tiene tracción en las cuatro ruedas. Si no estás seguro, responde No.' },
  { id: 'potencia', titulo: '15. Potencia aproximada del motor', tipo: 'opcion', opciones: ['Menos de 100 hp', '100 a 150 hp', '150 a 200 hp', 'Más de 200 hp'], obligatoria: true,
    descripcion: 'Si no conoces el dato, elige el rango más aproximado según el tipo de vehículo.' },
  { id: 'rendimiento', titulo: '16. Rendimiento aproximado de combustible', tipo: 'opcion', opciones: ['Menos de 10 km/l', '10 a 14 km/l', '14 a 18 km/l', 'Más de 18 km/l'], obligatoria: true,
    descripcion: 'Si no conoces el dato, elige el rango más aproximado. Un auto compacto suele rendir más de 14 km/l.' },

  /* --- Sección 5: uso --- */
  { id: 'uso_principal', titulo: '17. ¿Cuál es el uso principal del vehículo?', tipo: 'opcion', opciones: ['Ciudad / traslados diarios', 'Familia / pasajeros', 'Trabajo / carga', 'Viajes en carretera', 'Transporte de pasajeros (taxi, app o traslados)'], obligatoria: true,
    descripcion: 'Elige solo uno: el uso más frecuente, no todos los que le dan.' },
  { id: 'siete_asientos', titulo: '18. ¿Se usan más de 5 asientos con frecuencia?', tipo: 'opcion', opciones: ['Sí', 'No'], obligatoria: true,
    descripcion: 'Responde Sí si normalmente viajan más de cinco personas.' },

  /* --- Sección 6: etiqueta (variable objetivo) --- */
  { id: 'clase', titulo: '19. ¿Cómo se clasifica ese vehículo?', tipo: 'opcion', opciones: ['Hatchback (compacto de 5 puertas, ideal para ciudad)', 'Sedán (4 puertas, cajuela separada)', 'SUV (camioneta cerrada, más alta y amplia)', 'Pick-up (caja de carga abierta)', 'Van o Minivan (7 o más asientos, familiar)', 'No estoy seguro'], obligatoria: true,
    descripcion: 'Elige la categoría que mejor describa el vehículo. Hatchback: compuerta trasera y sin cajuela separada. Sedán: cajuela cerrada y separada. SUV: cerrada, alta y amplia. Pick-up: caja de carga abierta. Van: 7 o más asientos. Si dudas, marca "No estoy seguro".' },
  { id: 'comentario', titulo: '20. ¿Por qué lo clasificas así? (opcional)', tipo: 'parrafo', opciones: [], obligatoria: false,
    descripcion: 'Si quieres, explica brevemente tu elección. Nos ayuda a detectar errores de clasificación.' }
];

/* Las 5 clases. El orden se usa en la matriz de confusión. */
var CLASES = ['Hatchback', 'Sedán', 'SUV', 'Pick-up', 'Van'];

/* Escala usada en la pregunta de capacidad fuera del pavimento */
var ESCALA = {
  1: 'Nada capaz',
  2: 'Poco capaz',
  3: 'Moderadamente capaz',
  4: 'Muy capaz',
  5: 'Totalmente capaz'
};

/* ----------------------------------------------------------------------------
 * B) CODIFICACIÓN DE RESPUESTAS
 * ----------------------------------------------------------------------------
 * El formulario devuelve TEXTO ("Bajo", "Mucho más largo", "7 o más"...).
 * KNN necesita NÚMEROS. Aquí definimos la equivalencia.
 *
 * Se compara por "fragmento" (subcadena sin acentos ni mayúsculas) y en orden:
 * las reglas más específicas van primero. Por ejemplo, en altura se evalúa
 * "muy bajo" ANTES que "bajo", porque "muy bajo" contiene la palabra "bajo".
 * --------------------------------------------------------------------------*/
function normalizarTexto(texto) {
  return String(texto === undefined || texto === null ? '' : texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .replace(/\s+/g, ' ')
    .trim();
}

/* Busca el primer fragmento contenido en el texto y devuelve su valor.
 * Devuelve null si ninguna regla coincide (respuesta no reconocida). */
function buscarValor(texto, reglas) {
  var t = normalizarTexto(texto);
  if (t === '') return null;
  for (var i = 0; i < reglas.length; i++) {
    for (var j = 0; j < reglas[i].fragmentos.length; j++) {
      if (t.indexOf(normalizarTexto(reglas[i].fragmentos[j])) !== -1) {
        return reglas[i].valor;
      }
    }
  }
  return null;
}

var REGLAS = {
  asientos: [
    { fragmentos: ['8 o'], valor: 8 },
    { fragmentos: ['8'], valor: 8 },
    { fragmentos: ['7'], valor: 7 },
    { fragmentos: ['6'], valor: 6 },
    { fragmentos: ['5'], valor: 5 },
    { fragmentos: ['4'], valor: 4 },
    { fragmentos: ['3'], valor: 3 },
    { fragmentos: ['2'], valor: 2 }
  ],
  filas: [
    { fragmentos: ['3'], valor: 3 },
    { fragmentos: ['2'], valor: 2 },
    { fragmentos: ['1'], valor: 1 }
  ],
  puertas: [
    { fragmentos: ['mas de 5'], valor: 6 },
    { fragmentos: ['5'], valor: 5 },
    { fragmentos: ['4'], valor: 4 },
    { fragmentos: ['3'], valor: 3 },
    { fragmentos: ['2'], valor: 2 }
  ],
  longitud: [
    { fragmentos: ['mucho mas largo'], valor: 4 },
    { fragmentos: ['mas largo'], valor: 3 },
    { fragmentos: ['similar'], valor: 2 },
    { fragmentos: ['mas corto'], valor: 1 }
  ],
  altura_techo: [
    { fragmentos: ['muy alto'], valor: 4 },
    { fragmentos: ['alto'], valor: 3 },
    { fragmentos: ['medio'], valor: 2 },
    { fragmentos: ['bajo'], valor: 1 }
  ],
  despeje: [
    { fragmentos: ['muy bajo'], valor: 1 },
    { fragmentos: ['muy alto'], valor: 4 },
    { fragmentos: ['alto'], valor: 3 },
    { fragmentos: ['bajo'], valor: 2 }
  ],
  carga: [
    { fragmentos: ['caja abierta'], valor: 4 },
    { fragmentos: ['mucha'], valor: 3 },
    { fragmentos: ['media'], valor: 2 },
    { fragmentos: ['poca'], valor: 1 }
  ],
  potencia: [
    { fragmentos: ['mas de 200'], valor: 4 },
    { fragmentos: ['150 a 200'], valor: 3 },
    { fragmentos: ['100 a 150'], valor: 2 },
    { fragmentos: ['menos de 100'], valor: 1 }
  ],
  rendimiento: [
    { fragmentos: ['mas de 18'], valor: 4 },
    { fragmentos: ['14 a 18'], valor: 3 },
    { fragmentos: ['10 a 14'], valor: 2 },
    { fragmentos: ['menos de 10'], valor: 1 }
  ],
  si_no: [
    { fragmentos: ['si'], valor: 1 },
    { fragmentos: ['no'], valor: 0 }
  ]
};

/* ----------------------------------------------------------------------------
 * C) FEATURES DEL MODELO (variables independientes)
 * ----------------------------------------------------------------------------
 * Se recolectan 20 datos, pero solo 14 entran al KNN. Las demás respuestas
 * (marca, si es propio, número de puertas, capacidad fuera del pavimento,
 * uso, siete asientos) se conservan para el análisis descriptivo y la
 * discusión, o se descartaron por ser redundantes con otras variables.
 *
 * PESOS: 1.0 = peso normal. Se subieron las variables que mejor separan las
 * clases (asientos y filas distinguen Van; caja abierta distingue Pick-up) y
 * se bajaron las que casi todos los vehículos comparten (rendimiento).
 * --------------------------------------------------------------------------*/
var FEATURES = [
  { id: 'asientos', etiqueta: 'Número de asientos', peso: 1.2 },
  { id: 'filas', etiqueta: 'Filas de asientos', peso: 1.0 },
  { id: 'longitud', etiqueta: 'Longitud (1=corto ... 4=muy largo)', peso: 0.8 },
  { id: 'altura_techo', etiqueta: 'Altura del techo (1=bajo ... 4=muy alto)', peso: 1.0 },
  { id: 'despeje', etiqueta: 'Altura al suelo (1=muy bajo ... 4=muy alto)', peso: 0.8 },
  { id: 'carga', etiqueta: 'Capacidad de carga (1=poca ... 4=caja abierta)', peso: 1.0 },
  { id: 'cajuela_separada', etiqueta: 'Cajuela cerrada y separada', peso: 0.9 },
  { id: 'caja_abierta', etiqueta: 'Caja de carga abierta', peso: 1.0 },
  { id: 'compuerta', etiqueta: 'Compuerta trasera completa', peso: 0.6 },
  { id: 'traccion', etiqueta: 'Tracción 4x4 / AWD', peso: 0.7 },
  { id: 'potencia', etiqueta: 'Potencia (1=<100 hp ... 4=>200 hp)', peso: 0.6 },
  { id: 'rendimiento', etiqueta: 'Rendimiento (1=<10 km/l ... 4=>18 km/l)', peso: 0.5 },
  { id: 'uso_trabajo', etiqueta: 'Uso principal: trabajo o carga', peso: 0.8 },
  { id: 'uso_pasajeros', etiqueta: 'Uso principal: transporte de pasajeros', peso: 0.7 }
];

/* ----------------------------------------------------------------------------
 * D) MAPEO DE UNA RESPUESTA CRUDA -> FILA DEL DATASET
 * ----------------------------------------------------------------------------
 * Entrada : objeto con las respuestas tal como las entrega Google Forms
 * Salida  : { id, clase, + 14 features }  o  { error: 'motivo' }
 *
 * Reglas de limpieza aplicadas aquí:
 *   - Se exige que todas las preguntas obligatorias tengan valor.
 *   - "No estoy seguro" en la clasificación NO se adivina: el registro se
 *     descarta y se reporta, porque no se puede entrenar sin etiqueta fiable.
 *   - Las respuestas no reconocidas tampoco se adivinan: se reportan.
 * --------------------------------------------------------------------------*/
function mapearRespuesta(respuesta, indice) {
  var fila = {
    id: respuesta.id || ('V' + String(indice + 1).padStart(3, '0'))
  };

  // --- variables de control (no entran al modelo) ---
  fila.nombre = respuesta.nombre || '';
  fila.propio = respuesta.propio || '';
  fila.puertas = buscarValor(respuesta.puertas, REGLAS.puertas);
  fila.offroad = buscarValor(respuesta.offroad, [
    { fragmentos: ['5'], valor: 5 },
    { fragmentos: ['4'], valor: 4 },
    { fragmentos: ['3'], valor: 3 },
    { fragmentos: ['2'], valor: 2 },
    { fragmentos: ['1'], valor: 1 }
  ]);
  fila.uso_principal_txt = respuesta.uso_principal || '';
  fila.siete_asientos_txt = respuesta.siete_asientos || '';
  fila.comentario = respuesta.comentario || '';

  // --- clase (variable dependiente / etiqueta) ---
  var clase = normalizarTexto(respuesta.clase);
  if (clase.indexOf('no estoy seguro') !== -1 || clase === '') {
    return { error: 'Clasificación no declarada ("No estoy seguro")' };
  }
  if (clase.indexOf('hatchback') !== -1) fila.clase = 'Hatchback';
  else if (clase.indexOf('sedan') !== -1) fila.clase = 'Sedán';
  else if (clase.indexOf('suv') !== -1) fila.clase = 'SUV';
  else if (clase.indexOf('pick') !== -1) fila.clase = 'Pick-up';
  else if (clase.indexOf('van') !== -1 || clase.indexOf('minivan') !== -1) fila.clase = 'Van';
  else return { error: 'Clase no reconocida: "' + respuesta.clase + '"' };

  // --- features numéricas ---
  fila.asientos = buscarValor(respuesta.asientos, REGLAS.asientos);
  fila.filas = buscarValor(respuesta.filas, REGLAS.filas);
  fila.longitud = buscarValor(respuesta.longitud, REGLAS.longitud);
  fila.altura_techo = buscarValor(respuesta.altura_techo, REGLAS.altura_techo);
  fila.despeje = buscarValor(respuesta.despeje, REGLAS.despeje);
  fila.carga = buscarValor(respuesta.carga, REGLAS.carga);
  fila.cajuela_separada = buscarValor(respuesta.cajuela_separada, REGLAS.si_no);
  fila.caja_abierta = buscarValor(respuesta.caja_abierta, REGLAS.si_no);
  fila.compuerta = buscarValor(respuesta.compuerta, REGLAS.si_no);
  fila.traccion = buscarValor(respuesta.traccion, REGLAS.si_no);
  fila.potencia = buscarValor(respuesta.potencia, REGLAS.potencia);
  fila.rendimiento = buscarValor(respuesta.rendimiento, REGLAS.rendimiento);

  var uso = normalizarTexto(respuesta.uso_principal);
  fila.uso_trabajo = (uso.indexOf('trabajo') !== -1 || uso.indexOf('carga') !== -1) ? 1 : 0;
  fila.uso_pasajeros = (uso.indexOf('pasajeros') !== -1 || uso.indexOf('taxi') !== -1) ? 1 : 0;

  // --- validación: ninguna feature puede quedar vacía ---
  var faltantes = [];
  for (var i = 0; i < FEATURES.length; i++) {
    var valor = fila[FEATURES[i].id];
    if (valor === null || valor === undefined || !isFinite(valor)) {
      faltantes.push(FEATURES[i].id);
    }
  }
  if (faltantes.length) {
    return { error: 'Valores no reconocidos en: ' + faltantes.join(', ') };
  }

  return fila;
}

/* ----------------------------------------------------------------------------
 * E) GENERADOR DE DATOS SINTÉTICOS (solo para pruebas y demostración)
 * ----------------------------------------------------------------------------
 * IMPORTANTE: estos datos NO son el entregable. Sirven para comprobar que el
 * código funciona antes de tener respuestas reales y para la demo en vivo.
 *
 * Cada clase tiene un "perfil latente" de características físicas y luego se
 * agrega ruido, imitando la variabilidad real entre vehículos de la misma
 * categoría (hay SUVs urbanas y SUVs familiares, por ejemplo).
 * --------------------------------------------------------------------------*/
function _enteroAleatorio(rng, minimo, maximo) {
  return minimo + Math.floor(rng() * (maximo - minimo + 1));
}

function _elegir(rng, opciones) {
  return opciones[Math.floor(rng() * opciones.length)];
}

function generarRespuestasSinteticas(n, semilla, ruidoEtiqueta) {
  var rng = crearPRNG(semilla === undefined ? 2026 : semilla);
  var ruido = ruidoEtiqueta === undefined ? 0.06 : ruidoEtiqueta;

  // Perfiles por clase: rango [min, max] de cada característica
  var PERFILES = {
    'Hatchback': {
      asientos: [4, 5], filas: [2, 2], longitud: [1, 2], altura_techo: [1, 2],
      despeje: [1, 2], carga: [1, 2], potencia: [1, 2], rendimiento: [3, 4],
      cajuela: 0, caja: 0, compuerta: 0.85, traccion: 0.02,
      uso: ['Ciudad / traslados diarios', 'Familia / pasajeros']
    },
    'Sedán': {
      asientos: [5, 5], filas: [2, 2], longitud: [2, 3], altura_techo: [1, 2],
      despeje: [1, 2], carga: [2, 2], potencia: [2, 3], rendimiento: [3, 4],
      cajuela: 1, caja: 0, compuerta: 0.05, traccion: 0.03,
      uso: ['Ciudad / traslados diarios', 'Viajes en carretera']
    },
    'SUV': {
      asientos: [5, 7], filas: [2, 3], longitud: [2, 3], altura_techo: [3, 4],
      despeje: [3, 4], carga: [2, 3], potencia: [2, 3], rendimiento: [2, 3],
      cajuela: 0, caja: 0, compuerta: 0.95, traccion: 0.35,
      uso: ['Familia / pasajeros', 'Viajes en carretera']
    },
    'Pick-up': {
      asientos: [2, 5], filas: [1, 2], longitud: [3, 4], altura_techo: [3, 4],
      despeje: [3, 4], carga: [4, 4], potencia: [3, 4], rendimiento: [1, 2],
      cajuela: 0, caja: 1, compuerta: 0.0, traccion: 0.75,
      uso: ['Trabajo / carga']
    },
    'Van': {
      asientos: [6, 8], filas: [2, 3], longitud: [3, 4], altura_techo: [3, 4],
      despeje: [2, 3], carga: [2, 3], potencia: [2, 3], rendimiento: [2, 3],
      cajuela: 0, caja: 0, compuerta: 0.95, traccion: 0.05,
      uso: ['Transporte de pasajeros (taxi, app o traslados)', 'Familia / pasajeros']
    }
  };

  var textosClase = {
    'Hatchback': 'Hatchback (compacto de 5 puertas, ideal para ciudad)',
    'Sedán': 'Sedán (4 puertas, cajuela separada)',
    'SUV': 'SUV (camioneta cerrada, más alta y amplia)',
    'Pick-up': 'Pick-up (caja de carga abierta)',
    'Van': 'Van o Minivan (7 o más asientos, familiar)'
  };

  var textosLongitud = ['Más corto que un auto común', 'Similar a un auto común', 'Más largo que un auto común', 'Mucho más largo que un auto común'];
  var textosAltura = ['Bajo', 'Medio', 'Alto', 'Muy alto'];
  var textosDespeje = ['Muy bajo', 'Bajo', 'Alto', 'Muy alto'];
  var textosCarga = ['Poca (unas maletas)', 'Media (maletas y bultos)', 'Mucha (muebles o equipo)', 'Caja abierta para carga voluminosa'];
  var textosPotencia = ['Menos de 100 hp', '100 a 150 hp', '150 a 200 hp', 'Más de 200 hp'];
  var textosRendimiento = ['Menos de 10 km/l', '10 a 14 km/l', '14 a 18 km/l', 'Más de 18 km/l'];

  var clases = Object.keys(PERFILES);
  var filas = [];

  for (var i = 0; i < n; i++) {
    // Clase "verdadera" del vehículo, repartida en ronda para balancear.
    var claseVerdadera = clases[i % clases.length];
    var perfil = PERFILES[claseVerdadera];

    // La etiqueta es lo que la persona RESPONDE. Con probabilidad `ruido` no
    // coincide con el perfil real, igual que en una encuesta de verdad.
    var claseEtiqueta = claseVerdadera;
    if (rng() < ruido) {
      var alternativas = clases.filter(function (c) { return c !== claseVerdadera; });
      claseEtiqueta = _elegir(rng, alternativas);
    }

    function valor(campo) {
      return _enteroAleatorio(rng, perfil[campo][0], perfil[campo][1]);
    }

    var asientos = valor('asientos');
    var filasAsientos;
    if (asientos >= 7) filasAsientos = 3;
    else if (asientos <= 2) filasAsientos = 1;
    else filasAsientos = perfil.filas[0] === perfil.filas[1] ? perfil.filas[0] : _elegir(rng, [2, 3]);
    var puertas = claseVerdadera === 'Pick-up' && rng() < 0.5 ? 2 :
      (asientos >= 7 ? 5 : _elegir(rng, [4, 5]));

    filas.push({
      id: 'V' + String(i + 1).padStart(3, '0'),
      nombre: claseVerdadera + ' de ejemplo ' + String(i + 1),
      propio: _elegir(rng, ['Sí, es mío', 'Es de un familiar o conocido', 'No, es de otra persona']),
      puertas: String(puertas),
      asientos: String(Math.min(asientos, 8)),
      filas: String(filasAsientos),
      cajuela_separada: perfil.cajuela ? 'Sí' : 'No',
      caja_abierta: perfil.caja ? 'Sí' : 'No',
      compuerta: rng() < perfil.compuerta ? 'Sí' : 'No',
      longitud: textosLongitud[valor('longitud') - 1],
      altura_techo: textosAltura[valor('altura_techo') - 1],
      despeje: textosDespeje[valor('despeje') - 1],
      carga: textosCarga[valor('carga') - 1],
      offroad: String(_enteroAleatorio(rng, 1, 5)),
      traccion: rng() < perfil.traccion ? 'Sí' : 'No',
      potencia: textosPotencia[valor('potencia') - 1],
      rendimiento: textosRendimiento[valor('rendimiento') - 1],
      uso_principal: _elegir(rng, perfil.uso),
      siete_asientos: asientos >= 7 ? 'Sí' : 'No',
      clase: textosClase[claseEtiqueta],
      comentario: 'Vehículo sintético de prueba.'
    });
  }

  return filas;
}
````

## 01b_Hojas.gs

Lectura de respuestas y escritura/formato en Google Sheets.

*384 líneas.*

````javascript
/* ============================================================================
 *  01b_Hojas.gs  —  Acceso a Google Sheets: lectura y escritura
 * ----------------------------------------------------------------------------
 *  Aquí vive TODO lo que toca la Hoja de cálculo. El algoritmo (02_KNN.gs) no
 *  sabe que existe Google Sheets; esta capa hace de puente.
 *
 *  Funciones principales:
 *    leerRespuestas()      -> lee la pestaña del formulario y devuelve objetos
 *    construirDataset()    -> convierte texto en números y valida
 *    escribirDataset()     -> guarda el dataset limpio en 01_Dataset
 *    utilidades de formato -> encabezados, colores, anchos, bordes
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 *  UTILIDADES DE LIBRO Y HOJAS
 * --------------------------------------------------------------------------*/

/** Devuelve la hoja con ese nombre; si no existe, la crea. */
function obtenerOCrearHoja(nombre) {
  var libro = SpreadsheetApp.getActive();
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
  }
  return hoja;
}

/** Borra todo el contenido y el formato de una hoja (la deja en blanco). */
function limpiarHoja(hoja) {
  hoja.clear();
  // clear() no elimina reglas de formato condicional ni anchos: se limpian aparte
  hoja.setConditionalFormatRules([]);
  return hoja;
}

/**
 * Escribe una tabla con encabezado y la formatea.
 *
 * @param {Sheet}  hoja
 * @param {Array}  encabezados  Texto de cada columna
 * @param {Array}  filas        Matriz de valores (mismo número de columnas)
 * @param {Object} opciones     { titulo, congelar, anchoPrimeraColumna, numero }
 * @return {Object} { filaEncabezado, primeraFilaDatos, ultimaFila, numColumnas }
 */
function escribirTabla(hoja, encabezados, filas, opciones) {
  opciones = opciones || {};
  limpiarHoja(hoja);

  var numColumnas = encabezados.length;
  var filaActual = 1;

  // Título opcional (fila 1) con fondo de color.
  // No se combina la celda: combinar e inmovilizar columnas es incompatible en
  // Google Sheets ("No puedes inmovilizar columnas que solo contengan parte de
  // una celda combinada"). El texto se desborda sobre el fondo, que es lo que
  // se ve igual.
  if (opciones.titulo) {
    hoja.getRange(1, 1, 1, numColumnas)
      .setBackground(CONFIG.COLOR.ENCABEZADO);
    hoja.getRange(1, 1)
      .setValue(opciones.titulo)
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground(CONFIG.COLOR.ENCABEZADO)
      .setFontColor(CONFIG.COLOR.TEXTO_ENCABEZADO)
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle');
    hoja.setRowHeight(1, 28);
    filaActual = 2;
  }

  // Encabezados
  var filaEncabezado = filaActual;
  var rangoEncabezado = hoja.getRange(filaEncabezado, 1, 1, numColumnas);
  rangoEncabezado.setValues([encabezados])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setFontColor('#000000')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  hoja.setRowHeight(filaEncabezado, 34);
  filaActual++;

  // Datos
  var primeraFilaDatos = filaActual;
  if (filas && filas.length) {
    // Columnas que deben guardarse como TEXTO (por ejemplo, "68.18%").
    // Sin esto, Sheets convierte "68.18%" en el número 0.6818 y luego el
    // documento recibe el decimal en lugar del porcentaje.
    if (opciones.columnasTexto) {
      for (var ct = 0; ct < opciones.columnasTexto.length; ct++) {
        hoja.getRange(primeraFilaDatos, opciones.columnasTexto[ct], filas.length, 1)
          .setNumberFormat('@');
      }
    }
    hoja.getRange(primeraFilaDatos, 1, filas.length, numColumnas).setValues(filas);
  }
  var ultimaFila = primeraFilaDatos + Math.max(0, (filas ? filas.length : 0)) - 1;

  // Formato general
  hoja.setFrozenRows(filaEncabezado);
  if (opciones.congelarColumnas) hoja.setFrozenColumns(opciones.congelarColumnas);
  hoja.getRange(filaEncabezado, 1, Math.max(1, ultimaFila - filaEncabezado + 1), numColumnas)
    .setVerticalAlignment('middle');
  hoja.autoResizeColumns(1, numColumnas);

  // Evita columnas gigantes cuando hay mucho texto en la última
  for (var c = 1; c <= numColumnas; c++) {
    var ancho = hoja.getColumnWidth(c);
    if (ancho > 320) hoja.setColumnWidth(c, 320);
    if (ancho < 70) hoja.setColumnWidth(c, 70);
  }

  return {
    filaEncabezado: filaEncabezado,
    primeraFilaDatos: primeraFilaDatos,
    ultimaFila: ultimaFila,
    numColumnas: numColumnas
  };
}

/** Pinta un encabezado de sección (subtítulo) dentro de una hoja. */
function escribirSubtitulo(hoja, fila, texto, numColumnas) {
  hoja.getRange(fila, 1, 1, numColumnas).merge()
    .setValue(texto)
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setFontColor('#1F3864');
  hoja.getRange(fila, 1, 1, numColumnas).setBorder(null, null, true, null, null, null,
    '#8EA9DB', SpreadsheetApp.BorderStyle.SOLID);
}

/** Aplica formato de porcentaje a un rango. */
function formatoPorcentaje(hoja, fila, columna, filas, columnas) {
  hoja.getRange(fila, columna, filas || 1, columnas || 1).setNumberFormat('0.00%');
}

/* ----------------------------------------------------------------------------
 *  LOCALIZAR LA HOJA DE RESPUESTAS DEL FORMULARIO
 * ----------------------------------------------------------------------------
 *  No se asume un nombre fijo ("Respuestas de formulario 1") porque Google
 *  cambia el nombre según el idioma de la cuenta. En su lugar se busca la hoja
 *  que contenga la pregunta de la clase en su primera fila.
 * --------------------------------------------------------------------------*/
function obtenerHojaRespuestas() {
  var libro = SpreadsheetApp.getActive();
  var hojas = libro.getSheets();
  var nombresReservados = Object.keys(CONFIG.HOJAS).map(function (k) { return CONFIG.HOJAS[k]; });

  // Se usa el título de la pregunta de la clase como "huella" de la hoja de
  // respuestas correcta. Así el código sigue funcionando aunque el formulario
  // cambie de preguntas.
  var huellaClase = '';
  for (var p = 0; p < PREGUNTAS.length; p++) {
    if (PREGUNTAS[p].id === 'clase') huellaClase = normalizarTexto(PREGUNTAS[p].titulo);
  }

  for (var i = 0; i < hojas.length; i++) {
    var hoja = hojas[i];
    var nombre = hoja.getName();
    if (nombresReservados.indexOf(nombre) !== -1) continue;

    var ultimaColumna = Math.max(1, hoja.getLastColumn());
    if (hoja.getLastRow() === 0) continue;

    var encabezados = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0];
    var textoFila = normalizarTexto(encabezados.join(' | '));

    if (huellaClase && textoFila.indexOf(huellaClase) !== -1) return hoja;
  }

  // Último recurso: una hoja cuyo NOMBRE indique que es la de respuestas.
  for (var j = 0; j < hojas.length; j++) {
    var n = normalizarTexto(hojas[j].getName());
    if (nombresReservados.map(normalizarTexto).indexOf(n) !== -1) continue;
    if (n.indexOf('respuestas de formulario') !== -1 || n.indexOf('form responses') !== -1) {
      return hojas[j];
    }
  }

  return null;
}

/* ----------------------------------------------------------------------------
 *  LECTURA DE RESPUESTAS
 * ----------------------------------------------------------------------------
 *  Devuelve { filas: [ {id, personas, clase, ...} ], faltantes: [...], total }
 *  La correspondencia columna -> pregunta se hace por el TEXTO del encabezado,
 *  no por posición: así el script sigue funcionando si el formulario agrega o
 *  reordena preguntas.
 * --------------------------------------------------------------------------*/
function leerRespuestas() {
  var props = PropertiesService.getScriptProperties();
  var modoDemo = props.getProperty('MODO_DEMO') === 'true';

  var hoja = modoDemo
    ? SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJAS.DEMO)
    : obtenerHojaRespuestas();

  if (modoDemo && !hoja) {
    throw new Error('El modo demostración está activo pero no existe la pestaña "' +
      CONFIG.HOJAS.DEMO + '". Desactívalo desde el menú.');
  }

  if (!hoja) {
    throw new Error(
      'No se encontró la hoja de respuestas del formulario. ' +
      'Verifica que el formulario esté vinculado a esta hoja de cálculo ' +
      '(Formulario > Respuestas > Vincular a Hojas de cálculo).'
    );
  }

  var ultimaFila = hoja.getLastRow();
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaFila < 2) {
    return { filas: [], faltantes: [], total: 0, hoja: hoja.getName(), modoDemo: modoDemo };
  }

  var valores = hoja.getRange(1, 1, ultimaFila, ultimaColumna).getValues();
  var encabezados = valores[0];

  // --- índice: id de pregunta -> número de columna ---
  var indices = {};
  var faltantes = [];

  for (var p = 0; p < PREGUNTAS.length; p++) {
    var pregunta = PREGUNTAS[p];
    var buscado = normalizarTexto(pregunta.titulo);
    var encontrado = -1;

    for (var c = 0; c < encabezados.length; c++) {
      var tituloColumna = normalizarTexto(encabezados[c]);
      if (tituloColumna === buscado) { encontrado = c; break; }
    }

    // Segundo intento: comparar sin el número inicial ("1. ", "2. "...)
    if (encontrado === -1) {
      var sinNumero = buscado.replace(/^\d+\s*/, '');
      for (var c2 = 0; c2 < encabezados.length; c2++) {
        var t2 = normalizarTexto(encabezados[c2]).replace(/^\d+\s*/, '');
        if (t2 === sinNumero) { encontrado = c2; break; }
      }
    }

    if (encontrado !== -1) indices[pregunta.id] = encontrado;
    else faltantes.push(pregunta.titulo);
  }

  // --- construir objetos ---
  var filas = [];
  for (var f = 1; f < valores.length; f++) {
    var fila = valores[f];
    var vacia = fila.every(function (v) { return v === '' || v === null; });
    if (vacia) continue;

    var registro = { id: 'R' + String(f).padStart(3, '0') };

    for (var q = 0; q < PREGUNTAS.length; q++) {
      var id = PREGUNTAS[q].id;
      if (indices[id] === undefined) {
        registro[id] = '';
      } else {
        var valor = fila[indices[id]];
        registro[id] = (valor === null || valor === undefined) ? '' : valor;
      }
    }
    filas.push(registro);
  }

  return {
    filas: filas,
    faltantes: faltantes,
    total: filas.length,
    hoja: hoja.getName(),
    modoDemo: modoDemo
  };
}

/* ----------------------------------------------------------------------------
 *  CONSTRUCCIÓN DEL DATASET LIMPIO
 * ----------------------------------------------------------------------------
 *  Pasos de preparación (esto es lo que se documenta en el informe):
 *   1. Validar que cada respuesta tenga todas las variables necesarias.
 *   2. Convertir texto -> número según la codificación de 01_Datos.gs.
 *   3. Eliminar duplicados exactos (doble envío del mismo formulario).
 *   4. Descartar (no inventar) los registros con valores no reconocidos.
 * --------------------------------------------------------------------------*/
function construirDataset(respuestas) {
  var validas = [];
  var errores = [];

  for (var i = 0; i < respuestas.length; i++) {
    var resultado = mapearRespuesta(respuestas[i], i);
    if (resultado.error) {
      errores.push({ id: respuestas[i].id, motivo: resultado.error });
    } else {
      validas.push(resultado);
    }
  }

  // --- duplicados ---
  var duplicados = 0;
  if (CONFIG.ELIMINAR_DUPLICADOS) {
    var vistos = {};
    var sinDuplicados = [];
    for (var j = 0; j < validas.length; j++) {
      var huella = FEATURES.map(function (f) { return validas[j][f.id]; }).join('|') + '#' + validas[j].clase;
      if (vistos[huella]) { duplicados++; continue; }
      vistos[huella] = true;
      sinDuplicados.push(validas[j]);
    }
    validas = sinDuplicados;
  }

  return { datos: validas, errores: errores, duplicados: duplicados };
}

/* ----------------------------------------------------------------------------
 *  ESCRITURA DEL DATASET
 * ----------------------------------------------------------------------------
 *  Columnas: ID | Clase | 14 features del modelo | variables de control
 *  Las variables de control se conservan para el análisis descriptivo, pero el
 *  modelo NO las usa (así se evita ruido y sobreajuste).
 * --------------------------------------------------------------------------*/
function columnasDataset() {
  var columnas = [
    { clave: 'id', etiqueta: 'ID' },
    { clave: 'clase', etiqueta: 'Clase (variable objetivo)' }
  ];
  for (var i = 0; i < FEATURES.length; i++) {
    columnas.push({ clave: FEATURES[i].id, etiqueta: FEATURES[i].etiqueta });
  }
  // variables de control (no entran al modelo)
  columnas.push({ clave: 'propio', etiqueta: '[control] Es propio' });
  columnas.push({ clave: 'puertas', etiqueta: '[control] Puertas laterales' });
  columnas.push({ clave: 'offroad', etiqueta: '[control] Capacidad fuera del pavimento (1-5)' });
  columnas.push({ clave: 'uso_principal_txt', etiqueta: '[control] Uso principal' });
  columnas.push({ clave: 'siete_asientos_txt', etiqueta: '[control] ¿7+ asientos?' });
  return columnas;
}

function escribirDataset(hoja, datos, titulo) {
  var columnas = columnasDataset();
  var encabezados = columnas.map(function (c) { return c.etiqueta; });
  var filas = datos.map(function (d) {
    return columnas.map(function (c) {
      var v = d[c.clave];
      return (v === undefined || v === null) ? '' : v;
    });
  });
  return escribirTabla(hoja, encabezados, filas, {
    titulo: titulo || ('DATASET PREPARADO — ' + datos.length + ' registros válidos'),
    congelarColumnas: 2
  });
}

/** Cuenta cuántos registros hay por clase. */
function distribucionClases(datos) {
  var conteo = {};
  for (var i = 0; i < datos.length; i++) {
    conteo[datos[i].clase] = (conteo[datos[i].clase] || 0) + 1;
  }
  return conteo;
}

/** Calcula media y varianza de cada feature (para el análisis de datos). */
function estadisticasFeatures(datos) {
  return FEATURES.map(function (f) {
    var valores = datos.map(function (d) { return Number(d[f.id]); });
    var media = valores.reduce(function (a, b) { return a + b; }, 0) / valores.length;
    var varianza = valores.reduce(function (a, b) { return a + (b - media) * (b - media); }, 0) / valores.length;
    return {
      id: f.id,
      etiqueta: f.etiqueta,
      peso: f.peso,
      media: media,
      varianza: varianza,
      minimo: Math.min.apply(null, valores),
      maximo: Math.max.apply(null, valores)
    };
  });
}
````

## 02_KNN.gs

Núcleo del algoritmo: distancia, votación, matriz de confusión, métricas y particiones.

*601 líneas.*

````javascript
/* ============================================================================
 *  02_KNN.gs — Núcleo del algoritmo KNN
 * ----------------------------------------------------------------------------
 *  Copia de src/knn_core.js (misma versión que se prueba con Node.js).
 *  No depende de Google Sheets: recibe arreglos y devuelve números. Por eso
 *  puede probarse por separado, que es la base de un diseño limpio.
 * ==========================================================================*/
/* ============================================================================
 *  knn_core.js  —  Núcleo del clasificador KNN (K-Nearest Neighbors)
 * ----------------------------------------------------------------------------
 *  Proyecto : Clasificación de tipos de vehículo a partir de encuestas
 *  Materia  : Inteligencia Artificial
 *
 *  ¿QUÉ ES ESTE ARCHIVO?
 *  Es el "motor" matemático del proyecto. NO sabe nada de Google Sheets ni del
 *  formulario: recibe arreglos de objetos de JavaScript y devuelve números.
 *  Gracias a esa separación, el MISMO código se usa en tres lugares:
 *
 *      1. Google Apps Script  -> archivo 02_KNN.gs (copia literal)
 *      2. Página web de demo  -> web/knn_demo.html (copiado dentro de <script>)
 *      3. Pruebas locales     -> src/test.mjs (lo carga con Node.js)
 *
 *  Convenciones usadas en todo el archivo
 *  --------------------------------------
 *  - "fila"    : objeto plano {clave: valor}. Ej.: {personas: 4, presupuesto: 3}
 *  - "spec"    : arreglo de especificaciones de normalización, una por feature:
 *                { id, etiqueta, peso, min, max }
 *  - "modelo"  : resultado de entrenar = { spec, X, y, clases }
 *                 X = matriz de features YA normalizadas
 *                 y = arreglo de etiquetas reales (strings)
 *  - Las distancias SIEMPRE se calculan sobre valores normalizados [0, 1] para
 *    que una variable en pesos (ej. 350000) no aplaste a otra en escala 1-5.
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 * 1) GENERADOR PSEUDOALEATORIO CON SEMILLA
 * ----------------------------------------------------------------------------
 * ¿Por qué no usar Math.random()?  Porque la ciencia debe ser REPRODUCIBLE:
 * si dos personas corren el mismo script con la misma semilla, deben obtener
 * exactamente la misma partición entrenamiento/prueba. Math.random() no se
 * puede repetir; este generador sí.
 *
 * Algoritmo: "mulberry32", un PRNG de 32 bits, rápido y de calidad suficiente
 * para particionar datos. Devuelve números en [0, 1).
 * --------------------------------------------------------------------------*/
function crearPRNG(semilla) {
  var a = semilla >>> 0;                 // fuerza entero sin signo de 32 bits
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;    // avanza el estado interno
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;  // normaliza a [0,1)
  };
}

/* Barajado de Fisher-Yates: recorre el arreglo de atrás hacia adelante e
 * intercambia cada elemento con otro al azar ya "consolidado". Garantiza que
 * todas las permutaciones sean igualmente probables (a diferencia de un
 * `sort(() => Math.random() - 0.5)`, que está sesgado).
 * Devuelve una COPIA: no modifica el arreglo original. */
function barajar(lista, rng) {
  var copia = lista.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temporal = copia[i];
    copia[i] = copia[j];
    copia[j] = temporal;
  }
  return copia;
}

/* ----------------------------------------------------------------------------
 * 2) NORMALIZACIÓN MIN-MAX
 * ----------------------------------------------------------------------------
 * Fórmula:  x' = (x - min) / (max - min)     ->  x' queda en [0, 1]
 *
 * REGLA DE ORO (evita "fuga de información" / data leakage):
 * los valores min y max se calculan SOLO con el conjunto de ENTRENAMIENTO y
 * luego se aplican también al de prueba. Si se calcularan con todos los datos,
 * el modelo "vería" el futuro y las métricas saldrían artificialmente buenas.
 * --------------------------------------------------------------------------*/

/* Calcula min, max y peso de cada feature usando únicamente `datos`. */
function calcularEspecificacion(datos, features) {
  return features.map(function (f) {
    var valores = [];
    for (var i = 0; i < datos.length; i++) {
      var v = Number(datos[i][f.id]);
      if (isFinite(v)) valores.push(v);   // ignora vacíos o texto no numérico
    }
    var min = valores.length ? Math.min.apply(null, valores) : 0;
    var max = valores.length ? Math.max.apply(null, valores) : 1;
    return {
      id: f.id,
      etiqueta: f.etiqueta || f.id,
      peso: (f.peso === undefined || f.peso === null) ? 1 : f.peso,
      min: min,
      max: max
    };
  });
}

/* Normaliza un único valor escalar según su especificación. */
function normalizarValor(valor, spec) {
  var rango = spec.max - spec.min;
  // Si la variable es constante en entrenamiento, su rango es 0: no aporta
  // información para separar clases, así que se vuelve 0 (neutro).
  if (!isFinite(rango) || rango === 0) return 0;
  return (Number(valor) - spec.min) / rango;
}

/* Convierte una fila cruda en un vector numérico normalizado. */
function normalizarFila(fila, spec) {
  var vector = [];
  for (var i = 0; i < spec.length; i++) {
    vector.push(normalizarValor(fila[spec[i].id], spec[i]));
  }
  return vector;
}

/* ----------------------------------------------------------------------------
 * 3) DISTANCIA ENTRE DOS PERFILES
 * ----------------------------------------------------------------------------
 * Distancia euclidiana PONDERADA:
 *
 *      d(a,b) = sqrt( Σ  w_i * (a_i - b_i)^2 )
 *
 * - Cada diferencia se eleva al cuadrado (Penaliza más las diferencias grandes).
 * - w_i es el peso de la feature: permite decir que "espacio de carga" importa
 *   más que "rendimiento" para distinguir una Pick-up de un Hatchback.
 * - Si todos los pesos valen 1, es la euclidiana clásica.
 *
 * Se eligió euclidiana porque todas las variables son numéricas/ordinales ya
 * normalizadas; es la métrica estándar de KNN y la más fácil de explicar.
 * --------------------------------------------------------------------------*/
function distanciaEuclidiana(a, b, spec) {
  var suma = 0;
  for (var i = 0; i < a.length; i++) {
    var diferencia = a[i] - b[i];
    suma += spec[i].peso * diferencia * diferencia;
  }
  return Math.sqrt(suma);
}

/* ----------------------------------------------------------------------------
 * 4) ENTRENAMIENTO
 * ----------------------------------------------------------------------------
 * KNN es un algoritmo "perezoso" (lazy learner): no calcula parámetros.
 * "Entrenar" aquí significa únicamente:
 *   (a) aprender la escala de cada variable (min/max) y
 *   (b) guardar los vectores normalizados con su etiqueta.
 * El costo real se paga en la predicción, cuando se calculan distancias.
 * --------------------------------------------------------------------------*/
function entrenarModelo(datosEntrenamiento, features) {
  var spec = calcularEspecificacion(datosEntrenamiento, features);

  var X = [];   // matriz de features normalizadas
  var y = [];   // etiquetas verdaderas
  var ids = []; // identificadores, para poder auditar vecinos

  for (var i = 0; i < datosEntrenamiento.length; i++) {
    var fila = datosEntrenamiento[i];
    X.push(normalizarFila(fila, spec));
    y.push(fila.clase);
    ids.push(fila.id);
  }

  // Lista ordenada de clases (sirve para fijar el orden de la matriz de confusión)
  var clases = [];
  for (var j = 0; j < y.length; j++) {
    if (clases.indexOf(y[j]) === -1) clases.push(y[j]);
  }
  clases.sort();

  return { spec: spec, X: X, y: y, ids: ids, clases: clases };
}

/* ----------------------------------------------------------------------------
 * 5) PREDICCIÓN
 * ----------------------------------------------------------------------------
 * Pasos:
 *   1. Normalizar el perfil nuevo con la MISMA escala del entrenamiento.
 *   2. Calcular la distancia a TODOS los ejemplos de entrenamiento.
 *   3. Ordenar de menor a mayor distancia y quedarse con los k primeros.
 *   4. Votar: cada vecino aporta un voto a su clase.
 *      Variante "ponderada por distancia": el voto vale 1/(d + epsilon), de modo
 *      que el vecino más cercano pesa más. Esto reduce el empate y suele
 *      mejorar con k grandes.
 *   5. En caso de empate, gana la clase del vecino MÁS CERCANO (criterio de
 *      desempate determinista y defendible).
 * --------------------------------------------------------------------------*/
function predecirKNN(modelo, perfil, k, opciones) {
  opciones = opciones || {};
  var ponderar = opciones.ponderarPorDistancia !== false; // por defecto: sí
  var epsilon = 1e-9;

  var vector = normalizarFila(perfil, modelo.spec);

  // (2) distancias a todos los ejemplos de entrenamiento
  var vecinos = [];
  for (var i = 0; i < modelo.X.length; i++) {
    vecinos.push({
      indice: i,
      id: modelo.ids[i],
      clase: modelo.y[i],
      distancia: distanciaEuclidiana(vector, modelo.X[i], modelo.spec)
    });
  }

  // (3) orden ascendente por distancia
  vecinos.sort(function (a, b) { return a.distancia - b.distancia; });

  // Si k es mayor que el número de ejemplos disponibles, se recorta.
  var kEfectivo = Math.max(1, Math.min(k, vecinos.length));
  var seleccionados = vecinos.slice(0, kEfectivo);

  // (4) votación
  var votos = {};
  for (var v = 0; v < seleccionados.length; v++) {
    var claseVecino = seleccionados[v].clase;
    var aporte = ponderar ? 1 / (seleccionados[v].distancia + epsilon) : 1;
    votos[claseVecino] = (votos[claseVecino] || 0) + aporte;
  }

  // (5) clase ganadora + desempate por cercanía
  var mejorClase = null;
  var mejorVoto = -Infinity;
  var clases = Object.keys(votos);
  for (var c = 0; c < clases.length; c++) {
    if (votos[clases[c]] > mejorVoto) {
      mejorVoto = votos[clases[c]];
      mejorClase = clases[c];
    }
  }
  // desempate: si hay empate exacto, el vecino más cercano manda
  var hayEmpate = clases.filter(function (cl) { return votos[cl] === mejorVoto; });
  if (hayEmpate.length > 1) {
    for (var s = 0; s < seleccionados.length; s++) {
      if (hayEmpate.indexOf(seleccionados[s].clase) !== -1) {
        mejorClase = seleccionados[s].clase;
        break;
      }
    }
  }

  return {
    clase: mejorClase,
    k: kEfectivo,
    votos: votos,
    vecinos: seleccionados,
    distanciaPromedio: seleccionados.reduce(function (acc, n) {
      return acc + n.distancia;
    }, 0) / seleccionados.length
  };
}

/* ----------------------------------------------------------------------------
 * 6) EVALUACIÓN: MATRIZ DE CONFUSIÓN Y MÉTRICAS
 * ----------------------------------------------------------------------------
 * Matriz de confusión (5x5 para este proyecto):
 *   filas    = clase REAL
 *   columnas = clase PREDICHA
 *   diagonal = aciertos
 *   fuera de la diagonal = errores (y ahí se ve QUÉ se confunde con QUÉ)
 *
 * Métricas por clase (enfoque "una clase contra el resto"):
 *   Precisión = VP / (VP + FP)  -> de lo que predije como X, ¿cuánto era X?
 *   Recall    = VP / (VP + FN)  -> de los X reales, ¿cuántos detecté?
 *   F1        = 2PR / (P + R)   -> media armónica, castiga los extremos
 * Globales:
 *   Exactitud (accuracy) = aciertos / total
 *   Macro-F1 = promedio simple del F1 de las clases (trata igual a clases con
 *              pocos ejemplos, importante aquí porque algunas tendrán 5 casos)
 *   Kappa de Cohen = acuerdo corregido por azar (>0.6 se considera bueno)
 * --------------------------------------------------------------------------*/
function calcularMatrizConfusion(reales, predichos, clases) {
  var n = clases.length;
  var matriz = [];
  for (var i = 0; i < n; i++) {
    matriz.push(new Array(n).fill(0));
  }
  for (var m = 0; m < reales.length; m++) {
    var fila = clases.indexOf(reales[m]);
    var col = clases.indexOf(predichos[m]);
    if (fila !== -1 && col !== -1) matriz[fila][col]++;
  }
  return matriz;
}

function calcularMetricas(matriz, clases) {
  var n = clases.length;
  var total = 0, aciertos = 0;
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      total += matriz[i][j];
      if (i === j) aciertos += matriz[i][j];
    }
  }

  var porClase = [];
  var sumaF1 = 0, sumaPrecision = 0, sumaRecall = 0, sumaSoporte = 0;

  for (var c = 0; c < n; c++) {
    var vp = matriz[c][c];
    var fn = 0, fp = 0;
    for (var k = 0; k < n; k++) {
      if (k !== c) { fn += matriz[c][k]; fp += matriz[k][c]; }
    }
    var soporte = vp + fn;
    var precision = (vp + fp) === 0 ? 0 : vp / (vp + fp);
    var recall = soporte === 0 ? 0 : vp / soporte;
    var f1 = (precision + recall) === 0 ? 0 : 2 * precision * recall / (precision + recall);

    porClase.push({
      clase: clases[c],
      vp: vp, fp: fp, fn: fn, soporte: soporte,
      precision: precision, recall: recall, f1: f1
    });

    sumaF1 += f1;
    sumaPrecision += precision;
    sumaRecall += recall;
    sumaSoporte += soporte;
  }

  var exactitud = total === 0 ? 0 : aciertos / total;

  // Kappa de Cohen: mide el acuerdo descontando lo que se acertaría por azar.
  var sumaFilas = [], sumaColumnas = [];
  for (var f = 0; f < n; f++) { sumaFilas.push(0); sumaColumnas.push(0); }
  for (var r = 0; r < n; r++) {
    for (var q = 0; q < n; q++) {
      sumaFilas[r] += matriz[r][q];
      sumaColumnas[q] += matriz[r][q];
    }
  }
  var acuerdoEsperado = 0;
  if (total > 0) {
    for (var t = 0; t < n; t++) {
      acuerdoEsperado += (sumaFilas[t] / total) * (sumaColumnas[t] / total);
    }
  }
  var kappa = (acuerdoEsperado === 1) ? 1 : (exactitud - acuerdoEsperado) / (1 - acuerdoEsperado);

  return {
    total: total,
    aciertos: aciertos,
    errores: total - aciertos,
    exactitud: exactitud,
    error: total === 0 ? 0 : 1 - exactitud,
    porClase: porClase,
    macroPrecision: n === 0 ? 0 : sumaPrecision / n,
    macroRecall: n === 0 ? 0 : sumaRecall / n,
    macroF1: n === 0 ? 0 : sumaF1 / n,
    kappa: kappa
  };
}

/* ----------------------------------------------------------------------------
 * 7) PARTICIÓN ENTRENAMIENTO / PRUEBA (ESTRATIFICADA)
 * ----------------------------------------------------------------------------
 * Una partición simple al azar puede dejar una clase sin ejemplos de prueba
 * (con 5 clases y pocas respuestas, es muy probable). La partición
 * ESTRATIFICADA baraja cada clase por separado y toma su porcentaje, así todas
 * las clases quedan representadas en ambos conjuntos. Es lo correcto cuando las
 * clases están desbalanceadas.
 * --------------------------------------------------------------------------*/
function dividirEstratificado(datos, proporcionPrueba, semilla, claveClase) {
  claveClase = claveClase || 'clase';
  var rng = crearPRNG(semilla);

  // agrupar por clase
  var grupos = {};
  for (var i = 0; i < datos.length; i++) {
    var c = datos[i][claveClase];
    if (!grupos[c]) grupos[c] = [];
    grupos[c].push(datos[i]);
  }

  var entrenamiento = [], prueba = [];
  var clases = Object.keys(grupos).sort();

  for (var g = 0; g < clases.length; g++) {
    var filas = barajar(grupos[clases[g]], rng);

    // n pruebas con redondeo, garantizando al menos 1 si la clase tiene 2+
    var nPrueba = Math.round(filas.length * proporcionPrueba);
    if (filas.length >= 2 && nPrueba === 0) nPrueba = 1;
    if (nPrueba >= filas.length) nPrueba = filas.length - 1; // nunca dejar train vacío

    for (var j = 0; j < filas.length; j++) {
      if (j < nPrueba) prueba.push(filas[j]);
      else entrenamiento.push(filas[j]);
    }
  }

  return { entrenamiento: entrenamiento, prueba: prueba };
}

/* ----------------------------------------------------------------------------
 * 8) VALIDACIÓN CRUZADA ESTRATIFICADA (K-FOLD)
 * ----------------------------------------------------------------------------
 * Con pocas respuestas, un solo 70/30 produce una matriz de confusión con muy
 * pocos casos por celda y conclusiones frágiles. La validación cruzada reparte
 * los datos en "folds": entrena con todos menos uno y prueba con el que queda,
 * rotando hasta que CADA ejemplo fue evaluado exactamente una vez.
 * Resultado: cada respuesta aporta una predicción -> matriz más estable.
 * --------------------------------------------------------------------------*/
function dividirKFoldEstratificado(datos, nFolds, semilla, claveClase) {
  claveClase = claveClase || 'clase';
  nFolds = Math.max(2, nFolds);
  var rng = crearPRNG(semilla);

  var grupos = {};
  for (var i = 0; i < datos.length; i++) {
    var c = datos[i][claveClase];
    if (!grupos[c]) grupos[c] = [];
    grupos[c].push(datos[i]);
  }

  var folds = [];
  for (var f = 0; f < nFolds; f++) folds.push([]);

  var clases = Object.keys(grupos).sort();
  for (var g = 0; g < clases.length; g++) {
    var filas = barajar(grupos[clases[g]], rng);
    // reparto "en ronda": el ejemplo 0 al fold 0, el 1 al fold 1, etc.
    // Así cada fold recibe una porción parecida de cada clase.
    for (var j = 0; j < filas.length; j++) {
      folds[j % nFolds].push(filas[j]);
    }
  }

  var resultado = [];
  for (var k = 0; k < nFolds; k++) {
    var prueba = folds[k];
    var entrenamiento = [];
    for (var m = 0; m < nFolds; m++) {
      if (m !== k) entrenamiento = entrenamiento.concat(folds[m]);
    }
    resultado.push({ fold: k + 1, entrenamiento: entrenamiento, prueba: prueba });
  }
  return resultado;
}

/* ----------------------------------------------------------------------------
 * 9) SELECCIÓN DE k (LEAVE-ONE-OUT SOBRE EL CONJUNTO DE ENTRENAMIENTO)
 * ----------------------------------------------------------------------------
 * ¿Cómo saber qué k usar sin "hacer trampa" mirando el conjunto de prueba?
 * Con leave-one-out: se saca un ejemplo del entrenamiento, se predice usando
 * los demás y se cuenta si acertó. Se repite para cada ejemplo y para cada k
 * candidato. Gana el k con mayor exactitud interna.
 * NUNCA se elige k mirando el conjunto de prueba: eso sería sesgar la
 * evaluación final.
 * --------------------------------------------------------------------------*/
function elegirMejorK(datosEntrenamiento, features, candidatos) {
  var resultados = [];
  candidatos = candidatos || [1, 3, 5, 7, 9, 11];
  var n = datosEntrenamiento.length;

  for (var c = 0; c < candidatos.length; c++) {
    var k = candidatos[c];
    // k no puede ser >= n (no habría con qué comparar)
    if (k >= n) continue;

    var aciertos = 0, evaluados = 0;
    for (var i = 0; i < n; i++) {
      // subconjunto sin el ejemplo i  ->  "leave one out"
      var resto = datosEntrenamiento.slice(0, i).concat(datosEntrenamiento.slice(i + 1));
      var modelo = entrenarModelo(resto, features);
      var p = predecirKNN(modelo, datosEntrenamiento[i], k);
      if (p.clase === datosEntrenamiento[i].clase) aciertos++;
      evaluados++;
    }
    resultados.push({
      k: k,
      exactitud: evaluados ? aciertos / evaluados : 0,
      aciertos: aciertos,
      evaluados: evaluados
    });
  }

  // ordenar por exactitud desc; a igual exactitud, preferir k mayor (más estable)
  resultados.sort(function (a, b) {
    if (b.exactitud !== a.exactitud) return b.exactitud - a.exactitud;
    return b.k - a.k;
  });

  return { tabla: resultados, mejorK: resultados.length ? resultados[0].k : 1 };
}

/* ----------------------------------------------------------------------------
 * 10) PUNTO DE ENTRADA DE ALTO NIVEL
 * ----------------------------------------------------------------------------
 * Entrena con `datosEntrenamiento`, predice `datosPrueba` y devuelve todo lo
 * necesario para graficar/reportar: predicciones fila por fila, matriz y
 * métricas. Es la función que llama el pipeline de Google Sheets.
 * --------------------------------------------------------------------------*/
function evaluarConjuntoPrueba(datosEntrenamiento, datosPrueba, features, k, opciones) {
  var modelo = entrenarModelo(datosEntrenamiento, features);

  var detalles = [], reales = [], predichos = [];

  for (var i = 0; i < datosPrueba.length; i++) {
    var fila = datosPrueba[i];
    var p = predecirKNN(modelo, fila, k, opciones);
    reales.push(fila.clase);
    predichos.push(p.clase);
    detalles.push({
      id: fila.id,
      real: fila.clase,
      predicho: p.clase,
      acierto: p.clase === fila.clase,
      distanciaPromedio: p.distanciaPromedio,
      vecinos: p.vecinos.map(function (v) {
        return v.clase + ' (' + v.distancia.toFixed(3) + ')';
      }).join(' | ')
    });
  }

  var matriz = calcularMatrizConfusion(reales, predichos, modelo.clases);
  var metricas = calcularMetricas(matriz, modelo.clases);

  return {
    modelo: modelo,
    detalles: detalles,
    reales: reales,
    predichos: predichos,
    matriz: matriz,
    clases: modelo.clases,
    metricas: metricas
  };
}

/* Validación cruzada completa: devuelve la matriz acumulada de TODOS los folds
 * (cada ejemplo predicho una vez) y las métricas globales. */
function evaluarValidacionCruzada(datos, features, k, nFolds, semilla) {
  var folds = dividirKFoldEstratificado(datos, nFolds, semilla);
  var todosReales = [], todosPredichos = [];
  var detalleFolds = [];

  for (var i = 0; i < folds.length; i++) {
    var f = folds[i];
    if (f.entrenamiento.length === 0 || f.prueba.length === 0) continue;

    var modelo = entrenarModelo(f.entrenamiento, features);
    var reales = [], predichos = [];

    for (var j = 0; j < f.prueba.length; j++) {
      var p = predecirKNN(modelo, f.prueba[j], k);
      reales.push(f.prueba[j].clase);
      predichos.push(p.clase);
    }

    todosReales = todosReales.concat(reales);
    todosPredichos = todosPredichos.concat(predichos);

    var mFold = calcularMatrizConfusion(reales, predichos, modelo.clases);
    var metFold = calcularMetricas(mFold, modelo.clases);
    detalleFolds.push({
      fold: f.fold,
      nEntrenamiento: f.entrenamiento.length,
      nPrueba: f.prueba.length,
      exactitud: metFold.exactitud
    });
  }

  // clases = unión ordenada de todas las etiquetas observadas
  var clases = [];
  for (var a = 0; a < todosReales.length; a++) {
    if (clases.indexOf(todosReales[a]) === -1) clases.push(todosReales[a]);
    if (clases.indexOf(todosPredichos[a]) === -1) clases.push(todosPredichos[a]);
  }
  clases.sort();

  var matriz = calcularMatrizConfusion(todosReales, todosPredichos, clases);
  return {
    detalleFolds: detalleFolds,
    matriz: matriz,
    clases: clases,
    metricas: calcularMetricas(matriz, clases),
    predicciones: todosReales.map(function (r, idx) {
      return { real: r, predicho: todosPredichos[idx] };
    })
  };
}

/* ----------------------------------------------------------------------------
 * 11) UTILIDADES DE FORMATO
 * --------------------------------------------------------------------------*/
function porcentaje(x, decimales) {
  var d = (decimales === undefined) ? 2 : decimales;
  return (x * 100).toFixed(d) + '%';
}

function redondear(x, decimales) {
  var d = (decimales === undefined) ? 3 : decimales;
  var factor = Math.pow(10, d);
  return Math.round(x * factor) / factor;
}
````

## 03_Analisis.gs

Pipeline completo que genera las pestañas de resultados.

*681 líneas.*

````javascript
/* ============================================================================
 *  03_Analisis.gs  —  Pipeline completo: datos -> modelo -> resultados
 * ----------------------------------------------------------------------------
 *  Esta es la función que se ejecuta para generar TODOS los entregables de la
 *  hoja de cálculo. Orden de ejecución:
 *
 *     1. Leer respuestas del formulario
 *     2. Convertir y limpiar (dataset)
 *     3. Dividir en entrenamiento (70 %) y prueba (30 %), estratificado
 *     4. Elegir k con leave-one-out (sin tocar el conjunto de prueba)
 *     5. Entrenar y predecir el conjunto de prueba
 *     6. Calcular matriz de confusión y métricas
 *     7. Validación cruzada 5-fold (evidencia adicional, más robusta)
 *     8. Escribir las pestañas: 01 a 10
 * ==========================================================================*/

/**
 * Punto de entrada principal. Ejecutar desde el menú "KNN Vehículos".
 */
function ejecutarAnalisis() {
  var inicio = new Date();
  console.log('=== INICIO DEL ANÁLISIS: ' + inicio.toISOString() + ' ===');

  /* --- 1. Lectura ------------------------------------------------------- */
  var lectura = leerRespuestas();
  console.log('Respuestas encontradas: ' + lectura.total);
  if (lectura.faltantes.length) {
    console.log('ADVERTENCIA: preguntas sin columna -> ' + lectura.faltantes.join(' | '));
  }

  /* --- 2. Dataset ------------------------------------------------------- */
  var construccion = construirDataset(lectura.filas);
  var datos = construccion.datos;

  if (datos.length < CONFIG.MIN_RESPUESTAS) {
    throw new Error(
      'Solo hay ' + datos.length + ' descripciones válidas y se requieren al menos ' +
      CONFIG.MIN_RESPUESTAS + '. Sigue difundiendo el formulario y vuelve a ejecutar el análisis.'
    );
  }

  // Si alguna clase quedó sin ejemplos, la matriz no se puede interpretar bien.
  var dist = distribucionClases(datos);
  var clasesFaltantes = CLASES.filter(function (c) { return !dist[c]; });
  if (clasesFaltantes.length) {
    throw new Error('No hay respuestas para las clases: ' + clasesFaltantes.join(', ') +
      '. El modelo necesita ejemplos de las 5 clases.');
  }

  /* --- 3. Escritura del dataset ----------------------------------------- */
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.DATASET), datos);

  /* --- 4. Partición ----------------------------------------------------- */
  var particion = dividirEstratificado(datos, CONFIG.PROPORCION_PRUEBA, CONFIG.SEMILLA, 'clase');
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.ENTRENAMIENTO), particion.entrenamiento,
    'CONJUNTO DE ENTRENAMIENTO — ' + particion.entrenamiento.length + ' registros (' +
    Math.round((1 - CONFIG.PROPORCION_PRUEBA) * 100) + ' %)');
  escribirDataset(obtenerOCrearHoja(CONFIG.HOJAS.PRUEBA), particion.prueba,
    'CONJUNTO DE PRUEBA — ' + particion.prueba.length + ' registros (' +
    Math.round(CONFIG.PROPORCION_PRUEBA * 100) + ' %)');

  /* --- 5. Selección de k ------------------------------------------------ */
  var seleccion = elegirMejorK(particion.entrenamiento, FEATURES, CONFIG.CANDIDATOS_K);
  var k = CONFIG.K_FIJO > 0 ? CONFIG.K_FIJO : seleccion.mejorK;
  console.log('k elegido: ' + k + ' (LOO)');

  /* --- 6. Evaluación en el conjunto de prueba --------------------------- */
  var holdout = evaluarConjuntoPrueba(particion.entrenamiento, particion.prueba, FEATURES, k);
  ordenarResultadoPorClases(holdout);
  console.log('Exactitud holdout: ' + porcentaje(holdout.metricas.exactitud));

  /* --- 7. Validación cruzada -------------------------------------------- */
  var cruzada = evaluarValidacionCruzada(datos, FEATURES, k, CONFIG.FOLDS, CONFIG.SEMILLA);
  ordenarResultadoPorClases(cruzada);
  console.log('Exactitud validación cruzada: ' + porcentaje(cruzada.metricas.exactitud));

  /* --- 8. Escritura de resultados --------------------------------------- */
  escribirPredicciones(holdout, k);
  escribirHojaMatriz(holdout, k);
  escribirHojaValidacionCruzada(cruzada, k);
  escribirHojaMetricas(holdout, cruzada, seleccion, k, particion);
  escribirHojaResumen(lectura, construccion, datos, particion, inicio);
  escribirHojaReporte({
    lectura: lectura,
    construccion: construccion,
    datos: datos,
    particion: particion,
    seleccion: seleccion,
    k: k,
    holdout: holdout,
    cruzada: cruzada,
    inicio: inicio
  });
  escribirHojaValores({
    lectura: lectura,
    construccion: construccion,
    datos: datos,
    particion: particion,
    seleccion: seleccion,
    k: k,
    holdout: holdout,
    cruzada: cruzada,
    inicio: inicio
  });

  // Deja el cursor en la hoja de reporte, que es la que se copia al documento.
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.REPORTE));

  console.log('=== FIN DEL ANÁLISIS ===');
  avisar(
    'Análisis terminado.\n\n' +
    'Descripciones válidas: ' + datos.length + '\n' +
    'k utilizado: ' + k + '\n' +
    'Exactitud (prueba): ' + porcentaje(holdout.metricas.exactitud) + '\n' +
    'Exactitud (validación cruzada): ' + porcentaje(cruzada.metricas.exactitud) + '\n\n' +
    'Revisa la pestaña "' + CONFIG.HOJAS.REPORTE + '".'
  );
}

/* ============================================================================
 *  ORDEN DE LAS CLASES EN LOS RESULTADOS
 * ----------------------------------------------------------------------------
 *  El núcleo ordena las clases alfabéticamente porque no conoce el orden del
 *  proyecto. Aquí se reordenan la matriz y las métricas según CLASES, para que
 *  la hoja, el documento y la presentación usen siempre el mismo orden.
 * ==========================================================================*/
function ordenarResultadoPorClases(resultado) {
  var orden = resultado.clases.slice().sort(function (a, b) {
    return CLASES.indexOf(a) - CLASES.indexOf(b);
  });
  var indices = orden.map(function (c) { return resultado.clases.indexOf(c); });

  var matriz = indices.map(function (i) {
    return indices.map(function (j) { return resultado.matriz[i][j]; });
  });

  var porClase = orden.map(function (c) {
    for (var k = 0; k < resultado.metricas.porClase.length; k++) {
      if (resultado.metricas.porClase[k].clase === c) return resultado.metricas.porClase[k];
    }
    return null;
  }).filter(function (x) { return x !== null; });

  resultado.clases = orden;
  resultado.matriz = matriz;
  resultado.metricas.porClase = porClase;
  return resultado;
}

/* ============================================================================
 *  ESCRITURA DE LA PESTAÑA 04_Predicciones
 * ==========================================================================*/
function escribirPredicciones(holdout, k) {
  var hoja = obtenerOCrearHoja(CONFIG.HOJAS.PREDICCIONES);
  var encabezados = [
    'ID', 'Clase real', 'Clase predicha', '¿Acertó?',
    'Distancia promedio a los k vecinos', 'Vecinos más cercanos (clase y distancia)'
  ];
  var filas = holdout.detalles.map(function (d) {
    return [d.id, d.real, d.predicho, d.acierto ? 'SÍ' : 'NO',
      redondear(d.distanciaPromedio, 4), d.vecinos];
  });

  var pos = escribirTabla(hoja, encabezados, filas, {
    titulo: 'PRUEBAS REALIZADAS — predicciones sobre el conjunto de prueba (k = ' + k + ', n = ' + holdout.metricas.total + ')'
  });

  // Colorea aciertos y errores
  for (var i = 0; i < filas.length; i++) {
    var celda = hoja.getRange(pos.primeraFilaDatos + i, 4);
    celda.setBackground(filas[i][3] === 'SÍ' ? CONFIG.COLOR.ACIERTO : CONFIG.COLOR.ERROR);
  }
  hoja.setColumnWidth(6, 320);
  hoja.getRange(pos.primeraFilaDatos, 6, filas.length, 1).setWrap(true);
}

/* ============================================================================
 *  ESCRITURA DE UNA MATRIZ DE CONFUSIÓN (se usa en 05 y 06)
 * ==========================================================================*/
/**
 * Dibuja la matriz de confusión a partir de `filaInicio`.
 * @return {number} la siguiente fila libre.
 */
function dibujarMatrizConfusion(hoja, filaInicio, matriz, clases, titulo) {
  // Título
  hoja.getRange(filaInicio, 1, 1, clases.length + 2).merge()
    .setValue(titulo)
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.ENCABEZADO)
    .setFontColor(CONFIG.COLOR.TEXTO_ENCABEZADO)
    .setFontSize(11);
  var fila = filaInicio + 1;

  // Encabezado: esquina + clases predichas
  var encabezado = ['REAL ↓  /  PREDICHO →'].concat(clases).concat(['Total real']);
  hoja.getRange(fila, 1, 1, encabezado.length).setValues([encabezado])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.SUBTITULO)
    .setHorizontalAlignment('center');
  hoja.getRange(fila, 1).setHorizontalAlignment('left');
  hoja.getRange(fila, 1, 1, 1).setWrap(true);

  var filaHeader = fila;
  fila++;

  // Filas de la matriz
  for (var i = 0; i < clases.length; i++) {
    var totalFila = matriz[i].reduce(function (a, b) { return a + b; }, 0);
    var valores = [clases[i]].concat(matriz[i]).concat([totalFila]);
    hoja.getRange(fila + i, 1, 1, valores.length).setValues([valores]);
    hoja.getRange(fila + i, 1).setFontWeight('bold');
    hoja.getRange(fila + i, 2, 1, clases.length).setHorizontalAlignment('center');
  }

  // Columna de totales por columna
  var filaTotales = fila + clases.length;
  var totales = ['Total predicho'];
  var granTotal = 0;
  for (var c = 0; c < clases.length; c++) {
    var suma = 0;
    for (var r = 0; r < clases.length; r++) suma += matriz[r][c];
    totales.push(suma);
    granTotal += suma;
  }
  totales.push(granTotal);
  hoja.getRange(filaTotales, 1, 1, totales.length).setValues([totales])
    .setFontWeight('bold')
    .setBackground(CONFIG.COLOR.NEUTRO);
  hoja.getRange(filaTotales, 2, 1, clases.length).setHorizontalAlignment('center');

  // Resaltar la diagonal (aciertos) y dar color a los errores
  for (var d = 0; d < clases.length; d++) {
    hoja.getRange(fila + d, 2 + d).setBackground(CONFIG.COLOR.ACIERTO).setFontWeight('bold');
  }

  // Escala de color: más oscuro = más casos. Ayuda a leer la matriz de un vistazo.
  var rangoMatriz = hoja.getRange(fila, 2, clases.length, clases.length);
  var regla = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue('#FFFFFF', SpreadsheetApp.InterpolationType.NUMBER, '0')
    .setGradientMaxpointWithValue('#8EA9DB', SpreadsheetApp.InterpolationType.NUMBER, String(granTotal))
    .setRanges([rangoMatriz])
    .build();
  hoja.setConditionalFormatRules([regla]);

  // Bordes
  hoja.getRange(filaHeader, 1, clases.length + 2, clases.length + 2)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  // Nota explicativa
  fila = filaTotales + 2;
  hoja.getRange(fila, 1).setValue(
    'Lectura: cada fila es la clase REAL y cada columna la clase PREDICHA. ' +
    'La diagonal (verde) son los aciertos; el resto son errores. ' +
    'Ejemplo: un valor en la fila "Sedán" y columna "Hatchback" significa que un Sedán real fue clasificado como Hatchback.'
  ).setFontStyle('italic').setFontSize(9);
  hoja.getRange(fila, 1, 1, clases.length + 2).merge().setWrap(true);
  hoja.setRowHeight(fila, 44);

  return fila + 2;
}

/* ============================================================================
 *  PESTAÑA 05_Matriz_Confusion  (conjunto de prueba)
 * ==========================================================================*/
function escribirHojaMatriz(holdout, k) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.MATRIZ));

  var fila = 1;
  hoja.getRange(fila, 1).setValue('MATRIZ DE CONFUSIÓN — CONJUNTO DE PRUEBA (k = ' + k + ')')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  fila = dibujarMatrizConfusion(hoja, fila, holdout.matriz, holdout.clases,
    'Matriz de confusión (n = ' + holdout.metricas.total + ' casos de prueba)');

  // Métricas globales
  escribirSubtitulo(hoja, fila, 'MÉTRICAS GLOBALES', 7); fila++;
  var m = holdout.metricas;
  var filasMetricas = [
    ['Casos evaluados', m.total],
    ['Aciertos', m.aciertos],
    ['Errores', m.errores],
    ['Exactitud (accuracy)', porcentaje(m.exactitud)],
    ['Error de clasificación', porcentaje(m.error)],
    ['Macro-precisión', porcentaje(m.macroPrecision)],
    ['Macro-recall', porcentaje(m.macroRecall)],
    ['Macro-F1', porcentaje(m.macroF1)],
    ['Kappa de Cohen', redondear(m.kappa, 3)]
  ];
  hoja.getRange(fila, 1, filasMetricas.length, 2).setValues(filasMetricas);
  hoja.getRange(fila, 2, filasMetricas.length, 1).setHorizontalAlignment('right');
  fila += filasMetricas.length + 2;

  // Métricas por clase
  escribirSubtitulo(hoja, fila, 'MÉTRICAS POR CLASE (una clase contra el resto)', 7); fila++;
  var encabezados = ['Clase', 'Soporte (reales)', 'VP', 'FP', 'FN', 'Precisión', 'Recall', 'F1'];
  hoja.getRange(fila, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasClase = m.porClase.map(function (c) {
    return [c.clase, c.soporte, c.vp, c.fp, c.fn,
      porcentaje(c.precision), porcentaje(c.recall), porcentaje(c.f1)];
  });
  hoja.getRange(fila, 1, filasClase.length, encabezados.length).setValues(filasClase);
  hoja.getRange(fila, 2, filasClase.length, 5).setHorizontalAlignment('center');

  hoja.autoResizeColumns(1, 8);
}

/* ============================================================================
 *  PESTAÑA 06_Validacion_Cruzada
 * ==========================================================================*/
function escribirHojaValidacionCruzada(cruzada, k) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.CRUZADA));

  hoja.getRange(1, 1)
    .setValue('VALIDACIÓN CRUZADA ESTRATIFICADA (' + CONFIG.FOLDS + ' particiones, k = ' + k + ')')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);

  hoja.getRange(2, 1, 1, 8).merge().setValue(
    'Cada registro se usa exactamente una vez como prueba. Es la evidencia más robusta ' +
    'cuando el dataset es pequeño, porque aprovecha todos los datos para evaluar.'
  ).setFontStyle('italic').setFontSize(9).setWrap(true);
  hoja.setRowHeight(2, 30);

  var fila = 4;

  // Detalle por fold
  escribirSubtitulo(hoja, fila, 'EXACTITUD POR PARTICIÓN (FOLD)', 8); fila++;
  var enc = ['Fold', 'Casos de entrenamiento', 'Casos de prueba', 'Exactitud'];
  hoja.getRange(fila, 1, 1, enc.length).setValues([enc])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasFold = cruzada.detalleFolds.map(function (f) {
    return [f.fold, f.nEntrenamiento, f.nPrueba, porcentaje(f.exactitud)];
  });
  hoja.getRange(fila, 1, filasFold.length, 4).setValues(filasFold);
  hoja.getRange(fila, 1, filasFold.length, 4).setHorizontalAlignment('center');

  // Promedio de folds
  var promedio = cruzada.detalleFolds.reduce(function (a, f) { return a + f.exactitud; }, 0) /
    Math.max(1, cruzada.detalleFolds.length);
  hoja.getRange(fila + filasFold.length, 1, 1, 4)
    .setValues([['Promedio', '', '', porcentaje(promedio)]])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.NEUTRO)
    .setHorizontalAlignment('center');

  fila = fila + filasFold.length + 3;

  // Matriz acumulada
  fila = dibujarMatrizConfusion(hoja, fila, cruzada.matriz, cruzada.clases,
    'Matriz de confusión acumulada (n = ' + cruzada.metricas.total + ' predicciones)');

  // Métricas
  escribirSubtitulo(hoja, fila, 'MÉTRICAS GLOBALES (validación cruzada)', 8); fila++;
  var m = cruzada.metricas;
  var filasMetricas = [
    ['Predicciones acumuladas', m.total],
    ['Aciertos', m.aciertos],
    ['Exactitud (accuracy)', porcentaje(m.exactitud)],
    ['Macro-precisión', porcentaje(m.macroPrecision)],
    ['Macro-recall', porcentaje(m.macroRecall)],
    ['Macro-F1', porcentaje(m.macroF1)],
    ['Kappa de Cohen', redondear(m.kappa, 3)]
  ];
  hoja.getRange(fila, 1, filasMetricas.length, 2).setValues(filasMetricas);
  hoja.getRange(fila, 2, filasMetricas.length, 1).setHorizontalAlignment('right');
  fila += filasMetricas.length + 2;

  escribirSubtitulo(hoja, fila, 'MÉTRICAS POR CLASE', 8); fila++;
  var enc2 = ['Clase', 'Soporte', 'Precisión', 'Recall', 'F1'];
  hoja.getRange(fila, 1, 1, enc2.length).setValues([enc2])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasClase = m.porClase.map(function (c) {
    return [c.clase, c.soporte, porcentaje(c.precision), porcentaje(c.recall), porcentaje(c.f1)];
  });
  hoja.getRange(fila, 1, filasClase.length, 5).setValues(filasClase);
  hoja.getRange(fila, 2, filasClase.length, 4).setHorizontalAlignment('center');

  hoja.autoResizeColumns(1, 10);
}

/* ============================================================================
 *  PESTAÑA 07_Metricas  (comparación y selección de k)
 * ==========================================================================*/
function escribirHojaMetricas(holdout, cruzada, seleccion, k, particion) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.METRICAS));

  hoja.getRange(1, 1).setValue('MÉTRICAS Y SELECCIÓN DEL MODELO')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  var fila = 3;

  // Resumen comparativo
  escribirSubtitulo(hoja, fila, 'COMPARACIÓN DE LAS DOS EVALUACIONES', 7); fila++;
  var enc = ['Evaluación', 'Casos', 'Exactitud', 'Macro-F1', 'Kappa', 'Observación'];
  hoja.getRange(fila, 1, 1, enc.length).setValues([enc])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filas = [
    ['Holdout 70/30', holdout.metricas.total, porcentaje(holdout.metricas.exactitud),
      porcentaje(holdout.metricas.macroF1), redondear(holdout.metricas.kappa, 3),
      'Conjunto reservado; no se usó para elegir k.'],
    ['Validación cruzada ' + CONFIG.FOLDS + '-fold', cruzada.metricas.total,
      porcentaje(cruzada.metricas.exactitud), porcentaje(cruzada.metricas.macroF1),
      redondear(cruzada.metricas.kappa, 3),
      'Más estable con pocos datos; se reporta como resultado principal.']
  ];
  hoja.getRange(fila, 1, filas.length, enc.length).setValues(filas);
  hoja.getRange(fila, 3, filas.length, 3).setHorizontalAlignment('center');
  hoja.getRange(fila, 6, filas.length, 1).setWrap(true);
  fila += filas.length + 2;

  // Selección de k
  escribirSubtitulo(hoja, fila, 'SELECCIÓN DE k (LEAVE-ONE-OUT SOBRE ENTRENAMIENTO)', 7); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['k', 'Exactitud interna', 'Aciertos', 'Evaluados']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var filasK = seleccion.tabla.map(function (t) {
    return [t.k, porcentaje(t.exactitud), t.aciertos, t.evaluados];
  });
  hoja.getRange(fila, 1, filasK.length, 4).setValues(filasK);
  hoja.getRange(fila, 1, filasK.length, 4).setHorizontalAlignment('center');

  // Marcar el k ganador
  for (var i = 0; i < seleccion.tabla.length; i++) {
    if (seleccion.tabla[i].k === k) {
      hoja.getRange(fila + i, 1, 1, 4).setBackground(CONFIG.COLOR.ACIERTO).setFontWeight('bold');
    }
  }
  fila += filasK.length + 2;

  hoja.getRange(fila, 1).setValue(
    'k utilizado finalmente: ' + k + '  (' +
    (CONFIG.K_FIJO > 0 ? 'fijado manualmente en CONFIG.K_FIJO' : 'elegido automáticamente') + ')'
  ).setFontWeight('bold');
  fila += 2;

  // Distribución de la partición
  escribirSubtitulo(hoja, fila, 'COMPOSICIÓN DE LOS CONJUNTOS', 7); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['Conjunto', 'Registros', 'Porcentaje', 'Proporción configurada']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var total = particion.entrenamiento.length + particion.prueba.length;
  hoja.getRange(fila, 1, 2, 4).setValues([
    ['Entrenamiento', particion.entrenamiento.length,
      porcentaje(particion.entrenamiento.length / total),
      porcentaje(1 - CONFIG.PROPORCION_PRUEBA)],
    ['Prueba', particion.prueba.length,
      porcentaje(particion.prueba.length / total),
      porcentaje(CONFIG.PROPORCION_PRUEBA)]
  ]);
  hoja.getRange(fila, 1, 2, 4).setHorizontalAlignment('center');
  fila++;

  hoja.autoResizeColumns(1, 7);
  hoja.getRange(1, 1, fila, 7).setVerticalAlignment('middle');
}

/* ============================================================================
 *  PESTAÑA 08_Resumen_Datos  (calidad y análisis descriptivo)
 * ==========================================================================*/
function escribirHojaResumen(lectura, construccion, datos, particion, inicio) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.RESUMEN));

  hoja.getRange(1, 1).setValue('RESUMEN Y CALIDAD DE LOS DATOS')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  var fila = 3;

  /* --- bloque 1: recolección --- */
  escribirSubtitulo(hoja, fila, '1. RECOLECCIÓN', 6); fila++;
  var recoleccion = [
    ['Hoja de respuestas leída', lectura.hoja],
    ['Vehículos descritos', lectura.total],
    ['Descripciones válidas', datos.length],
    ['Descartadas por valores no reconocidos o sin clase', construccion.errores.length],
    ['Duplicados eliminados', construccion.duplicados],
    ['Preguntas sin columna en la hoja', lectura.faltantes.length ? lectura.faltantes.join(' | ') : 'Ninguna'],
    ['Fecha y hora del análisis', Utilities.formatDate(inicio, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')]
  ];
  hoja.getRange(fila, 1, recoleccion.length, 2).setValues(recoleccion);
  hoja.getRange(fila, 1, recoleccion.length, 1).setFontWeight('bold');
  fila += recoleccion.length + 2;

  /* --- bloque 2: distribución de clases --- */
  escribirSubtitulo(hoja, fila, '2. DISTRIBUCIÓN DE CLASES', 6); fila++;
  hoja.getRange(fila, 1, 1, 4).setValues([['Clase', 'Registros', 'Porcentaje', 'En entrenamiento / prueba']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var dist = distribucionClases(datos);
  var distTrain = distribucionClases(particion.entrenamiento);
  var distTest = distribucionClases(particion.prueba);
  var filasDist = CLASES.map(function (c) {
    var n = dist[c] || 0;
    return [c, n, porcentaje(n / datos.length),
      (distTrain[c] || 0) + ' / ' + (distTest[c] || 0)];
  });
  hoja.getRange(fila, 1, filasDist.length, 4).setValues(filasDist);
  hoja.getRange(fila, 2, filasDist.length, 3).setHorizontalAlignment('center');
  fila += filasDist.length + 2;

  /* --- bloque 3: estadísticas de features --- */
  escribirSubtitulo(hoja, fila, '3. ESTADÍSTICAS DE LAS VARIABLES DEL MODELO', 6); fila++;
  hoja.getRange(fila, 1, 1, 7)
    .setValues([['Variable', 'Peso en la distancia', 'Mínimo', 'Máximo', 'Media', 'Varianza', 'Aporta información']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  var stats = estadisticasFeatures(datos);
  var filasStats = stats.map(function (s) {
    return [s.etiqueta, s.peso, s.minimo, s.maximo, redondear(s.media, 2),
      redondear(s.varianza, 3), s.varianza === 0 ? 'NO (constante)' : 'Sí'];
  });
  hoja.getRange(fila, 1, filasStats.length, 7).setValues(filasStats);
  hoja.getRange(fila, 2, filasStats.length, 6).setHorizontalAlignment('center');
  fila += filasStats.length + 2;

  hoja.getRange(fila, 1).setValue(
    'Una varianza de 0 significa que todos los encuestados respondieron lo mismo: ' +
    'esa variable no ayuda a distinguir clases y podría eliminarse sin perder información.'
  ).setFontStyle('italic').setFontSize(9);
  hoja.getRange(fila, 1, 1, 7).merge().setWrap(true);

  hoja.autoResizeColumns(1, 7);
}

/* ============================================================================
 *  PESTAÑA 10_Reporte  (texto listo para pegar en el documento)
 * ==========================================================================*/
function escribirHojaReporte(r) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.REPORTE));

  hoja.getRange(1, 1).setValue('REPORTE AUTOMÁTICO — copia estos párrafos al documento')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  hoja.getRange(2, 1, 1, 6).merge().setValue(
    'Este texto se genera con TUS datos reales cada vez que ejecutas "Ejecutar análisis". ' +
    'Revisa y ajusta la redacción antes de entregar; las cifras ya son correctas.'
  ).setFontStyle('italic').setFontSize(9).setWrap(true);
  hoja.setRowHeight(2, 30);

  var parrafos = construirParrafosReporte(r);

  var fila = 4;
  for (var i = 0; i < parrafos.length; i++) {
    // Título de sección
    hoja.getRange(fila, 1).setValue(parrafos[i].titulo)
      .setFontWeight('bold').setFontSize(11).setFontColor(CONFIG.COLOR.ENCABEZADO);
    fila++;

    // Texto envuelto en una celda combinada
    var rango = hoja.getRange(fila, 1, 1, 6).merge();
    rango.setValue(parrafos[i].texto).setWrap(true).setVerticalAlignment('top');
    // Altura estimada: ~15 px por línea de 100 caracteres
    var lineas = Math.ceil(parrafos[i].texto.length / 95);
    hoja.setRowHeight(fila, Math.max(40, lineas * 16));
    fila += 2;
  }

  hoja.setColumnWidth(1, 620);
  for (var c = 2; c <= 6; c++) hoja.setColumnWidth(c, 20);
}

/**
 * Redacta el reporte a partir de los objetos de resultado.
 * Cada párrafo es { titulo, texto }.
 */
function construirParrafosReporte(r) {
  var mH = r.holdout.metricas;
  var mC = r.cruzada.metricas;

  // Clase con mejor y peor F1
  var ordenadas = mC.porClase.slice().sort(function (a, b) { return b.f1 - a.f1; });
  var mejor = ordenadas[0];
  var peor = ordenadas[ordenadas.length - 1];

  // Par de clases más confundido (fuera de la diagonal)
  var peorPar = { real: '-', predicho: '-', casos: 0 };
  for (var i = 0; i < r.cruzada.clases.length; i++) {
    for (var j = 0; j < r.cruzada.clases.length; j++) {
      if (i !== j && r.cruzada.matriz[i][j] > peorPar.casos) {
        peorPar = {
          real: r.cruzada.clases[i],
          predicho: r.cruzada.clases[j],
          casos: r.cruzada.matriz[i][j]
        };
      }
    }
  }

  var dist = distribucionClases(r.datos);
  var listaDist = CLASES.map(function (c) {
    return c + ' (' + (dist[c] || 0) + ')';
  }).join(', ');

  var p = [];

  p.push({
    titulo: '1. RECOLECCIÓN DE DATOS',
    texto: 'Se aplicó una encuesta de 20 preguntas a través de Google Forms. Cada participante ' +
      'describió un vehículo real que conoce (propio o de alguien cercano). Se obtuvieron ' +
      r.lectura.total + ' descripciones, de las cuales ' + r.datos.length + ' resultaron válidas. ' +
      'Se descartaron ' + r.construccion.errores.length + ' registros con valores no reconocidos o ' +
      'sin clasificación declarada y ' + r.construccion.duplicados + ' duplicados exactos. ' +
      'La encuesta no solicitó datos personales sensibles y se explicó su uso académico antes de responder.'
  });

  p.push({
    titulo: '2. PREPARACIÓN DE LOS DATOS',
    texto: 'Cada respuesta de texto se convirtió a un valor numérico mediante una tabla de ' +
      'codificación: las opciones ordenadas (tamaño, altura, capacidad de carga, potencia y ' +
      'rendimiento) se transformaron en escalas de 1 a 4, las preguntas de sí/no en 1 y 0, y el ' +
      'uso principal en dos variables binarias (trabajo/carga y transporte de pasajeros). ' +
      'El dataset final quedó formado por ' + r.datos.length + ' vehículos descritos y 14 variables ' +
      'predictoras. Todas las variables se normalizaron con el método min-max tomando como ' +
      'referencia únicamente el conjunto de entrenamiento, para evitar fuga de información. ' +
      'La distribución de clases fue: ' + listaDist + '.'
  });

  p.push({
    titulo: '3. PARTICIÓN DE LOS DATOS',
    texto: 'Se aplicó una partición estratificada 70/30 con semilla fija ' + CONFIG.SEMILLA +
      ', de modo que el experimento es reproducible: ' + r.particion.entrenamiento.length +
      ' registros para entrenamiento y ' + r.particion.prueba.length + ' para prueba. ' +
      'La estratificación garantiza que las cinco clases estén representadas en ambos conjuntos.'
  });

  p.push({
    titulo: '4. SELECCIÓN DE k',
    texto: 'El valor de k se eligió con validación leave-one-out aplicada exclusivamente al ' +
      'conjunto de entrenamiento, probando k = ' + CONFIG.CANDIDATOS_K.join(', ') + '. ' +
      'El mejor resultado interno se obtuvo con k = ' + r.seleccion.tabla[0].k + ' (' +
      porcentaje(r.seleccion.tabla[0].exactitud) + ' de exactitud interna) y se utilizó k = ' + r.k + '. ' +
      'El conjunto de prueba no se utilizó para esta decisión.'
  });

  p.push({
    titulo: '5. RESULTADOS EN EL CONJUNTO DE PRUEBA',
    texto: 'Con k = ' + r.k + ', el modelo acertó ' + mH.aciertos + ' de ' + mH.total +
      ' casos (' + porcentaje(mH.exactitud) + ' de exactitud). El macro-F1 fue ' +
      porcentaje(mH.macroF1) + ' y el coeficiente kappa de Cohen ' + redondear(mH.kappa, 3) +
      '. Al tratarse de un conjunto pequeño, estas cifras tienen alta variabilidad.'
  });

  p.push({
    titulo: '6. RESULTADOS DE LA VALIDACIÓN CRUZADA',
    texto: 'Para obtener una estimación más estable se aplicó validación cruzada estratificada de ' +
      CONFIG.FOLDS + ' particiones con el mismo k. Cada uno de los ' + mC.total +
      ' registros fue clasificado una vez, con una exactitud global de ' + porcentaje(mC.exactitud) +
      ', macro-F1 de ' + porcentaje(mC.macroF1) + ' y kappa de ' + redondear(mC.kappa, 3) + '.'
  });

  p.push({
    titulo: '7. ANÁLISIS DE LA MATRIZ DE CONFUSIÓN',
    texto: 'La clase con mejor desempeño fue ' + mejor.clase + ' (F1 = ' + porcentaje(mejor.f1) +
      '), mientras que ' + peor.clase + ' obtuvo el F1 más bajo (' + porcentaje(peor.f1) + '). ' +
      (peorPar.casos > 0
        ? 'La confusión más frecuente fue ' + peorPar.real + ' clasificado como ' + peorPar.predicho +
        ' (' + peorPar.casos + ' casos), lo que se explica porque ambos tipos de vehículo ' +
        'comparten valores similares en las variables de tamaño y uso.'
        : 'No se observaron confusiones fuera de la diagonal principal.')
  });

  p.push({
    titulo: '8. CONCLUSIÓN',
    texto: 'El clasificador KNN obtuvo una exactitud de ' + porcentaje(mC.exactitud) +
      ' en validación cruzada, con un kappa de Cohen de ' + redondear(mC.kappa, 3) + '. ' +
      (mC.exactitud >= 0.75
        ? 'El resultado supera el umbral del 75 % planteado y confirma que las características físicas ' +
          'observables de un automóvil contienen información suficiente para identificar su categoría. '
        : 'El resultado NO alcanza el umbral del 75 % planteado en la hipótesis, por lo que esta no se ' +
          'confirma con la muestra actual. La mayor dificultad se concentró en ' + peor.clase +
          ' (F1 = ' + porcentaje(peor.f1) + '), que se confunde con ' + peorPar.predicho +
          ' porque ambas categorías comparten tamaño, altura y número de asientos. ') +
      'Las principales limitaciones son el tamaño reducido de la muestra (' + r.datos.length +
      ' vehículos descritos) y la ambigüedad de algunas preguntas en la primera aplicación. ' +
      'Como trabajo futuro se propone ampliar la muestra a más de 100 vehículos, incluir variables ' +
      'objetivas como longitud y peso exactos, y comparar KNN con otros algoritmos de clasificación.'
  });

  return p;
}
````

## 04_Instalador.gs

Creación del formulario y de la estructura del libro.

*318 líneas.*

````javascript
/* ============================================================================
 *  04_Instalador.gs  —  Crea el formulario y la estructura de la hoja
 * ----------------------------------------------------------------------------
 *  Función principal: `instalarTodo()`
 *
 *  Qué crea:
 *    1. El Google Form con las 22 preguntas, dividido en 5 secciones.
 *    2. La vinculación del formulario con ESTA hoja de cálculo, para que las
 *       respuestas lleguen solas a una pestaña nueva.
 *    3. Las pestañas de resultados vacías, con su encabezado.
 *    4. Una pestaña "00_Guia" con instrucciones y el enlace del formulario.
 *
 *  Es idempotente: si lo ejecutas dos veces, reutiliza el formulario ya creado
 *  (guarda su ID en las propiedades del script) y no duplica preguntas.
 * ==========================================================================*/

function instalarTodo() {
  var libro = SpreadsheetApp.getActive();
  libro.rename('KNN Vehículos — Clasificación con encuestas');

  var form = crearOReutilizarFormulario(libro);
  Utilities.sleep(1500);            // da tiempo a Google a crear la pestaña
  crearPestanasBase();
  escribirHojaCodigo();             // publica el código en 09_Codigo
  escribirGuia(form);

  var mensaje =
    'Instalación terminada.\n\n' +
    'Formulario creado y vinculado a esta hoja.\n\n' +
    'Enlace para responder:\n' + form.getPublishedUrl() + '\n\n' +
    'Comparte ese enlace con tus compañeros. Cuando tengas al menos ' +
    CONFIG.MIN_RESPUESTAS + ' descripciones de vehículos, ejecuta "Ejecutar análisis" en el menú.';

  console.log(mensaje);
  avisar(mensaje);

  // Elimina la hoja vacía que Google crea al abrir un libro nuevo.
  eliminarHojasVaciasPredeterminadas();

  return form.getPublishedUrl();
}

/**
 * Borra las hojas vacías llamadas "Hoja 1", "Sheet1", etc. que Google crea por
 * defecto. Solo elimina hojas sin contenido, nunca las del proyecto.
 */
function eliminarHojasVaciasPredeterminadas() {
  var libro = SpreadsheetApp.getActive();
  var nombres = ['Hoja 1', 'Hoja1', 'Sheet1', 'Hoja 2', 'Sheet2'];
  var reservadas = Object.keys(CONFIG.HOJAS).map(function (k) { return CONFIG.HOJAS[k]; });

  for (var i = 0; i < nombres.length; i++) {
    var hoja = libro.getSheetByName(nombres[i]);
    if (!hoja) continue;
    if (reservadas.indexOf(nombres[i]) !== -1) continue;
    if (libro.getSheets().length <= 1) continue;
    if (hoja.getLastRow() === 0 && hoja.getLastColumn() === 0) {
      libro.deleteSheet(hoja);
      console.log('Hoja vacía eliminada: ' + nombres[i]);
    }
  }
}

/* ----------------------------------------------------------------------------
 *  FORMULARIO
 * --------------------------------------------------------------------------*/
function crearOReutilizarFormulario(libro) {
  var props = PropertiesService.getScriptProperties();
  var idGuardado = props.getProperty('ID_FORMULARIO');
  var form = null;

  if (idGuardado) {
    try {
      form = FormApp.openById(idGuardado);
    } catch (e) {
      console.log('El formulario guardado ya no existe; se creará uno nuevo.');
      form = null;
    }
  }

  if (!form) {
    form = FormApp.create(CONFIG.TITULO_FORM);
    props.setProperty('ID_FORMULARIO', form.getId());
  }

  form.setTitle(CONFIG.TITULO_FORM);
  form.setDescription(CONFIG.DESCRIPCION_FORM);
  form.setConfirmationMessage(CONFIG.MENSAJE_CONFIRMACION);
  form.setProgressBar(true);
  form.setCollectEmail(false);              // anonimato
  form.setLimitOneResponsePerUser(false);   // permite varias respuestas por dispositivo (familia)
  form.setShuffleQuestions(false);          // el orden de las preguntas es intencional

  // Solo se agregan las preguntas si el formulario está vacío (idempotencia)
  // Si quedó a medias por un error anterior, se reconstruye, pero NUNCA si ya
  // existen respuestas (borrar ítems desconectaría las respuestas recibidas).
  var items = form.getItems();
  var itemsEsperados = PREGUNTAS.length + (SECCIONES_FORM.length - 1);

  if (items.length !== itemsEsperados) {
    var hayRespuestas = false;
    try { hayRespuestas = form.getResponses().length > 0; } catch (e) { hayRespuestas = false; }

    if (!hayRespuestas) {
      for (var i = 0; i < items.length; i++) form.deleteItem(items[i]);
      agregarPreguntas(form);
    } else {
      console.log('Aviso: el formulario ya tiene respuestas; no se reconstruye.');
    }
  }

  // Vincular a esta hoja de cálculo, si aún no está vinculado
  try {
    var destino = form.getDestinationId();
    if (!destino) {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, libro.getId());
    } else if (destino !== libro.getId()) {
      console.log('Aviso: el formulario ya estaba vinculado a otra hoja (' + destino + ').');
    }
  } catch (e) {
    // getDestinationId() lanza error si nunca se vinculó; se vincula aquí.
    form.setDestination(FormApp.DestinationType.SPREADSHEET, libro.getId());
  }

  // Aplica los textos de ayuda sin tocar títulos ni opciones
  sincronizarAyudas(form);

  return form;
}

/**
 * Recorre PREGUNTAS y crea cada ítem en el formulario, insertando un salto de
 * página al inicio de cada sección (excepto la primera).
 */
function agregarPreguntas(form) {
  for (var i = 0; i < PREGUNTAS.length; i++) {
    var p = PREGUNTAS[i];

    // ¿Esta pregunta abre una sección nueva?
    for (var s = 0; s < SECCIONES_FORM.length; s++) {
      var seccion = SECCIONES_FORM[s];
      if (seccion.desde === i && s > 0) {
        var pagina = form.addPageBreakItem();
        pagina.setTitle(seccion.titulo);
        if (seccion.descripcion) pagina.setHelpText(seccion.descripcion);
      }
    }

    var item;
    if (p.tipo === 'parrafo') {
      item = form.addParagraphTextItem();
      item.setTitle(p.titulo);
      item.setRequired(false);
    } else if (p.tipo === 'texto') {
      item = form.addTextItem();
      item.setTitle(p.titulo);
      item.setRequired(false);
    } else if (p.tipo === 'escala') {
      item = form.addScaleItem();
      item.setTitle(p.titulo);
      item.setBounds(1, 5);
      item.setLabels('Nada importante', 'Extremadamente importante');
      item.setRequired(true);
    } else {
      item = form.addMultipleChoiceItem();
      item.setTitle(p.titulo);
      item.setChoiceValues(p.opciones);
      item.setRequired(true);
      item.showOtherOption(false);
    }

    // Texto de ayuda: aclara las preguntas que se prestan a confusión sin
    // cambiar el título (que es el encabezado de la hoja de respuestas).
    if (p.descripcion) item.setHelpText(p.descripcion);
  }
}

/**
 * Actualiza el texto de ayuda de las preguntas ya existentes en el formulario.
 * No borra ítems ni cambia títulos, así que NO invalida las respuestas ya
 * recogidas: los encabezados de la hoja siguen siendo los mismos.
 */
function sincronizarAyudas(form) {
  var items = form.getItems();
  var aplicadas = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.getType() === FormApp.ItemType.PAGE_BREAK) continue;

    var tituloItem = normalizarTexto(item.getTitle());
    for (var p = 0; p < PREGUNTAS.length; p++) {
      if (normalizarTexto(PREGUNTAS[p].titulo) === tituloItem) {
        if (PREGUNTAS[p].descripcion) {
          item.setHelpText(PREGUNTAS[p].descripcion);
          aplicadas++;
        }
        break;
      }
    }
  }

  console.log('Textos de ayuda aplicados: ' + aplicadas);
  return aplicadas;
}

/* ----------------------------------------------------------------------------
 *  PESTAÑAS
 * --------------------------------------------------------------------------*/
function crearPestanasBase() {
  var estructura = [
    { nombre: CONFIG.HOJAS.GUIA, nota: 'Instrucciones de uso del proyecto.' },
    { nombre: CONFIG.HOJAS.DATASET, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.ENTRENAMIENTO, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.PRUEBA, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.PREDICCIONES, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.MATRIZ, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.CRUZADA, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.METRICAS, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.RESUMEN, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.CODIGO, nota: 'Documentación del código.' },
    { nombre: CONFIG.HOJAS.REPORTE, nota: 'Se llena al ejecutar el análisis.' },
    { nombre: CONFIG.HOJAS.VALORES, nota: 'Se llena al ejecutar el análisis.' }
  ];

  for (var i = 0; i < estructura.length; i++) {
    var hoja = obtenerOCrearHoja(estructura[i].nombre);
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1).setValue(estructura[i].nota).setFontColor('#808080');
      hoja.getRange(1, 1).setFontStyle('italic');
    }
  }
}

/* ----------------------------------------------------------------------------
 *  GUÍA (pestaña 00_Guia)
 * --------------------------------------------------------------------------*/
function escribirGuia(form) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.GUIA));
  var fila = 1;

  hoja.getRange(fila, 1).setValue('PROYECTO KNN — CLASIFICACIÓN DE VEHÍCULOS')
    .setFontWeight('bold').setFontSize(16).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  var enlace = form ? form.getPublishedUrl() : '(formulario no disponible)';
  var edicion = form ? form.getEditUrl() : '';

  var pasos = [
    ['1. Difundir el formulario', 'Comparte el enlace con compañeros, familiares y conocidos. NO uses datos de internet: las respuestas deben ser de personas reales.'],
    ['2. Revisar respuestas', 'Cada envío aparece automáticamente en la pestaña de respuestas del formulario.'],
    ['3. Ejecutar el análisis', 'Menú "KNN Vehículos" > "Ejecutar análisis". Se generan las pestañas 01 a 10.'],
    ['4. Revisar resultados', 'La pestaña 10_Reporte contiene párrafos listos para pegar en el documento.'],
    ['5. Documentar evidencia', 'Toma capturas de pantalla del formulario, de la hoja y de la matriz de confusión.'],
    ['6. Presentar', 'Usa la página web de demostración (web/knn_demo.html) para mostrar el modelo en vivo.']
  ];

  hoja.getRange(fila, 1, 1, 2).setValues([['Paso', 'Qué hacer']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;
  hoja.getRange(fila, 1, pasos.length, 2).setValues(pasos);
  hoja.getRange(fila, 1, pasos.length, 2).setVerticalAlignment('top').setWrap(true);
  for (var i = 0; i < pasos.length; i++) hoja.setRowHeight(fila + i, 44);
  fila += pasos.length + 2;

  hoja.getRange(fila, 1).setValue('ENLACES').setFontWeight('bold').setFontSize(12)
    .setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila++;
  hoja.getRange(fila, 1).setValue('Responder la encuesta:').setFontWeight('bold');
  hoja.getRange(fila, 2).setFormula('=HYPERLINK("' + enlace + '";"Abrir formulario")');
  fila++;
  if (edicion) {
    hoja.getRange(fila, 1).setValue('Editar el formulario:').setFontWeight('bold');
    hoja.getRange(fila, 2).setFormula('=HYPERLINK("' + edicion + '";"Abrir editor del formulario")');
    fila++;
  }
  fila += 1;

  var estado = [
    ['Última instalación', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')],
    ['Respuestas mínimas requeridas', CONFIG.MIN_RESPUESTAS],
    ['Semilla de la partición', CONFIG.SEMILLA],
    ['Proporción de prueba', Math.round(CONFIG.PROPORCION_PRUEBA * 100) + ' %'],
    ['Modo demostración', PropertiesService.getScriptProperties().getProperty('MODO_DEMO') === 'true'
      ? 'ACTIVO — los datos NO son reales' : 'Desactivado (datos reales)']
  ];
  hoja.getRange(fila, 1).setValue('ESTADO ACTUAL').setFontWeight('bold').setFontSize(12)
    .setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila++;
  hoja.getRange(fila, 1, estado.length, 2).setValues(estado);
  hoja.getRange(fila, 1, estado.length, 1).setFontWeight('bold');

  hoja.setColumnWidth(1, 300);
  hoja.setColumnWidth(2, 520);

  if (PropertiesService.getScriptProperties().getProperty('MODO_DEMO') === 'true') {
    hoja.getRange(fila + estado.length, 1, 1, 2).merge().setValue(
      '⚠ MODO DEMOSTRACIÓN ACTIVO: el análisis está leyendo datos SINTÉTICOS de la pestaña "' +
      CONFIG.HOJAS.DEMO + '". Estos datos no sirven para la entrega. Desactívalo desde el menú.'
    ).setBackground(CONFIG.COLOR.ERROR).setFontWeight('bold').setWrap(true);
    hoja.setRowHeight(fila + estado.length, 44);
  }
}

/* Muestra en pantalla el enlace del formulario. */
function mostrarEnlaceFormulario() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  if (!id) {
    SpreadsheetApp.getUi().alert('Todavía no hay formulario. Ejecuta primero "Instalar".');
    return;
  }
  var form = FormApp.openById(id);
  avisar(
    'Enlace para responder:\n\n' + form.getPublishedUrl() +
    '\n\nEditar:\n' + form.getEditUrl()
  );
}
````

## 05_Menu.gs

Menú de la hoja, modo demostración y pestaña de código.

*317 líneas.*

````javascript
/* ============================================================================
 *  05_Menu.gs  —  Menú, modo demostración y documentación del código
 * ----------------------------------------------------------------------------
 *  Este archivo mejora la experiencia de uso: agrega un menú propio a la hoja,
 *  permite probar el sistema con datos sintéticos y publica el código en la
 *  pestaña 09_Codigo (requisito del entregable).
 * ==========================================================================*/

/* ----------------------------------------------------------------------------
 *  MENÚ
 * --------------------------------------------------------------------------*/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('KNN Vehículos')
    .addItem('1. Instalar (formulario + hojas)', 'instalarTodo')
    .addSeparator()
    .addItem('2. Ejecutar análisis', 'ejecutarAnalisis')
    .addItem('3. Ver enlace del formulario', 'mostrarEnlaceFormulario')
    .addItem('4. Completar documento con mis datos', 'reemplazarMarcadoresEnDocumento')
    .addSeparator()
    .addItem('Ver guía', 'irAGuia')
    .addItem('Ver código documentado', 'irACodigo')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Datos de demostración')
      .addItem('Activar (datos sintéticos)', 'activarModoDemo')
      .addItem('Desactivar y borrar', 'desactivarModoDemo'))
    .addSeparator()
    .addItem('Borrar resultados del análisis', 'borrarResultados')
    .addItem('Acerca de este proyecto', 'acercaDe')
    .addToUi();
}

function irAGuia() {
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.GUIA));
}

function irACodigo() {
  escribirHojaCodigo();
  SpreadsheetApp.getActive().setActiveSheet(obtenerOCrearHoja(CONFIG.HOJAS.CODIGO));
}

function acercaDe() {
  avisar(
    'PROYECTO KNN — CLASIFICACIÓN DE VEHÍCULOS\n\n' +
    'Algoritmo: K vecinos más cercanos (KNN) con distancia euclidiana ponderada.\n' +
    'Clases: ' + CLASES.join(', ') + '.\n' +
    'Variables: ' + FEATURES.length + ' (normalizadas min-max).\n' +
    'Entrada: descripción de un vehículo real (carrocería, tamaño, carga, motor y uso).\n' +
    'Evaluación: holdout 70/30 + validación cruzada estratificada de ' + CONFIG.FOLDS + ' particiones.\n\n' +
    'Todo el código está comentado en el editor de Apps Script y resumido en la pestaña 09_Codigo.'
  );
}

/* ----------------------------------------------------------------------------
 *  MODO DEMOSTRACIÓN
 * ----------------------------------------------------------------------------
 *  Sirve para ensayar la presentación antes de tener respuestas reales, o para
 *  verificar que el sistema funciona tras instalarlo.
 *
 *  IMPORTANTE: los datos son SINTÉTICOS. Viven en una pestaña aparte
 *  (ZZ_Respuestas_Demo) y NUNCA se mezclan con las respuestas reales. Mientras
 *  el modo esté activo, todos los resultados quedan marcados como demostración.
 * --------------------------------------------------------------------------*/
function activarModoDemo() {
  var ui = SpreadsheetApp.getUi();
  var respuesta = ui.alert(
    'Modo demostración',
    'Se crearán 60 descripciones SINTÉTICAS de vehículos para probar el sistema.\n\n' +
    'Estos datos NO sirven para la entrega: son inventados por el script para ' +
    'verificar que todo funciona.\n\n' +
    'Se guardan en una pestaña aparte y no tocan las respuestas reales.\n\n' +
    '¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (respuesta !== ui.Button.YES) return;

  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.DEMO));
  var sinteticas = generarRespuestasSinteticas(60, CONFIG.SEMILLA, 0.06);

  var encabezados = ['Marca temporal'];
  for (var p = 0; p < PREGUNTAS.length; p++) encabezados.push(PREGUNTAS[p].titulo);

  var filas = sinteticas.map(function (r) {
    var fila = [new Date()];
    for (var q = 0; q < PREGUNTAS.length; q++) {
      var valor = r[PREGUNTAS[q].id];
      fila.push(valor === undefined || valor === null ? '' : valor);
    }
    return fila;
  });

  // Encabezados en la fila 1 (obligatorio para que leerRespuestas los encuentre)
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground('#FFC7CE').setWrap(true);
  if (filas.length) hoja.getRange(2, 1, filas.length, encabezados.length).setValues(filas);
  hoja.setFrozenRows(1);
  hoja.setTabColor('#CC0000');
  hoja.autoResizeColumns(1, Math.min(encabezados.length, 22));

  PropertiesService.getScriptProperties().setProperty('MODO_DEMO', 'true');

  var idForm = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  try {
    escribirGuia(idForm ? FormApp.openById(idForm) : null);
  } catch (e) { /* si no hay formulario, la guía se reescribe sin enlace */ }

  avisar('Modo demostración activado.\n\nEjecuta ahora "2. Ejecutar análisis".\n\n' +
    'Recuerda desactivarlo antes de generar la entrega final.');
}

function desactivarModoDemo() {
  var ui = SpreadsheetApp.getUi();
  var libro = SpreadsheetApp.getActive();
  var hoja = libro.getSheetByName(CONFIG.HOJAS.DEMO);

  if (hoja) {
    var respuesta = ui.alert('Desactivar demostración',
      'Se eliminará la pestaña "' + CONFIG.HOJAS.DEMO + '" con los datos sintéticos.\n' +
      'Los resultados del análisis seguirán en sus pestañas hasta que vuelvas a ejecutarlo.\n\n¿Continuar?',
      ui.ButtonSet.YES_NO);
    if (respuesta !== ui.Button.YES) return;
    libro.deleteSheet(hoja);
  }

  PropertiesService.getScriptProperties().deleteProperty('MODO_DEMO');

  var idForm = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  try {
    escribirGuia(idForm ? FormApp.openById(idForm) : null);
  } catch (e) { }

  avisar('Modo demostración desactivado. El análisis volverá a leer las respuestas reales.');
}

/* ----------------------------------------------------------------------------
 *  LIMPIEZA DE RESULTADOS
 * --------------------------------------------------------------------------*/
function borrarResultados() {
  var ui = SpreadsheetApp.getUi();
  var respuesta = ui.alert('Borrar resultados',
    'Se vaciarán las pestañas 01 a 10 (los datos de respuestas NO se tocan).\n\n¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (respuesta !== ui.Button.YES) return;

  var nombres = [
    CONFIG.HOJAS.DATASET, CONFIG.HOJAS.ENTRENAMIENTO, CONFIG.HOJAS.PRUEBA,
    CONFIG.HOJAS.PREDICCIONES, CONFIG.HOJAS.MATRIZ, CONFIG.HOJAS.CRUZADA,
    CONFIG.HOJAS.METRICAS, CONFIG.HOJAS.RESUMEN, CONFIG.HOJAS.REPORTE,
    CONFIG.HOJAS.VALORES
  ];
  for (var i = 0; i < nombres.length; i++) {
    var hoja = SpreadsheetApp.getActive().getSheetByName(nombres[i]);
    if (hoja) limpiarHoja(hoja);
  }
  avisar('Resultados borrados. Las respuestas originales siguen intactas.');
}

/* ----------------------------------------------------------------------------
 *  PESTAÑA 09_Codigo
 * ----------------------------------------------------------------------------
 *  Requisito del entregable: "Código JavaScript altamente documentado" dentro
 *  de la hoja de cálculo. Se publica un índice de archivos y el núcleo del
 *  algoritmo, que es la parte que se explica en la presentación.
 * --------------------------------------------------------------------------*/
function escribirHojaCodigo() {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.CODIGO));
  var fila = 1;

  hoja.getRange(fila, 1).setValue('CÓDIGO JAVASCRIPT DEL PROYECTO (documentado)')
    .setFontWeight('bold').setFontSize(14).setFontColor(CONFIG.COLOR.ENCABEZADO);
  fila += 2;

  hoja.getRange(fila, 1, 1, 3)
    .setValues([['Archivo', 'Contenido', 'Líneas aprox.']])
    .setFontWeight('bold').setBackground(CONFIG.COLOR.SUBTITULO);
  fila++;

  var indice = [
    ['00_Config.gs', 'Parámetros del experimento: semilla, proporción de prueba, k, folds, colores y nombres de hojas.', 90],
    ['01_Datos.gs', 'Preguntas del formulario, codificación de respuestas (texto a número) y definición de las 14 variables.', 350],
    ['01b_Hojas.gs', 'Lectura de respuestas desde Google Sheets, limpieza, duplicados y escritura del dataset.', 330],
    ['02_KNN.gs', 'Núcleo del algoritmo: normalización, distancia, votación, matriz de confusión, métricas y particiones.', 600],
    ['03_Analisis.gs', 'Pipeline completo: divide, entrena, evalúa y genera las pestañas de resultados y el reporte.', 520],
    ['04_Instalador.gs', 'Creación automática del formulario y de la estructura de la hoja.', 190],
    ['05_Menu.gs', 'Menú, modo demostración y esta documentación.', 400],
    ['06_Valores.gs', 'Tabla de valores para completar el documento y explicación de la confusión principal.', 200]
  ];
  hoja.getRange(fila, 1, indice.length, 3).setValues(indice).setWrap(true).setVerticalAlignment('top');
  fila += indice.length + 2;

  hoja.getRange(fila, 1).setValue(
    'El código completo está en el editor (Extensiones > Apps Script). ' +
    'A continuación se reproduce el núcleo del algoritmo, que es la parte que se explica en la presentación.'
  ).setFontStyle('italic');
  hoja.getRange(fila, 1, 1, 3).merge();
  fila += 2;

  var bloques = [
    {
      titulo: '1) DISTANCIA EUCLIDIANA PONDERADA',
      codigo:
        '/* Distancia entre dos perfiles ya normalizados.\n' +
        ' * d(a,b) = raiz( suma( w_i * (a_i - b_i)^2 ) )\n' +
        ' * El peso w_i permite que unas variables influyan mas que otras. */\n' +
        'function distanciaEuclidiana(a, b, spec) {\n' +
        '  var suma = 0;\n' +
        '  for (var i = 0; i < a.length; i++) {\n' +
        '    var diferencia = a[i] - b[i];\n' +
        '    suma += spec[i].peso * diferencia * diferencia;\n' +
        '  }\n' +
        '  return Math.sqrt(suma);\n' +
        '}'
    },
    {
      titulo: '2) PREDICCIÓN KNN (votación de los k vecinos)',
      codigo:
        'function predecirKNN(modelo, perfil, k) {\n' +
        '  var vector = normalizarFila(perfil, modelo.spec);\n' +
        '\n' +
        '  // Paso 1: distancia a TODOS los ejemplos de entrenamiento\n' +
        '  var vecinos = [];\n' +
        '  for (var i = 0; i < modelo.X.length; i++) {\n' +
        '    vecinos.push({\n' +
        '      clase: modelo.y[i],\n' +
        '      distancia: distanciaEuclidiana(vector, modelo.X[i], modelo.spec)\n' +
        '    });\n' +
        '  }\n' +
        '\n' +
        '  // Paso 2: ordenar de menor a mayor y tomar los k primeros\n' +
        '  vecinos.sort(function (a, b) { return a.distancia - b.distancia; });\n' +
        '  var seleccionados = vecinos.slice(0, Math.min(k, vecinos.length));\n' +
        '\n' +
        '  // Paso 3: votar. El voto vale 1/distancia: el vecino mas cercano pesa mas.\n' +
        '  var votos = {};\n' +
        '  seleccionados.forEach(function (v) {\n' +
        '    var aporte = 1 / (v.distancia + 1e-9);\n' +
        '    votos[v.clase] = (votos[v.clase] || 0) + aporte;\n' +
        '  });\n' +
        '\n' +
        '  // Paso 4: ganar la clase con mas votos\n' +
        '  var mejorClase = null, mejorVoto = -Infinity;\n' +
        '  for (var clase in votos) {\n' +
        '    if (votos[clase] > mejorVoto) { mejorVoto = votos[clase]; mejorClase = clase; }\n' +
        '  }\n' +
        '  return { clase: mejorClase, vecinos: seleccionados, votos: votos };\n' +
        '}'
    },
    {
      titulo: '3) NORMALIZACIÓN MIN-MAX',
      codigo:
        '/* x\' = (x - min) / (max - min)\n' +
        ' * min y max se calculan SOLO con entrenamiento (evita fuga de informacion). */\n' +
        'function normalizarValor(valor, spec) {\n' +
        '  var rango = spec.max - spec.min;\n' +
        '  if (rango === 0) return 0;   // variable constante: no aporta\n' +
        '  return (Number(valor) - spec.min) / rango;\n' +
        '}'
    },
    {
      titulo: '4) MATRIZ DE CONFUSIÓN',
      codigo:
        '/* filas = clase real, columnas = clase predicha, diagonal = aciertos */\n' +
        'function calcularMatrizConfusion(reales, predichos, clases) {\n' +
        '  var n = clases.length, matriz = [];\n' +
        '  for (var i = 0; i < n; i++) matriz.push(new Array(n).fill(0));\n' +
        '  for (var m = 0; m < reales.length; m++) {\n' +
        '    var fila = clases.indexOf(reales[m]);\n' +
        '    var col  = clases.indexOf(predichos[m]);\n' +
        '    if (fila !== -1 && col !== -1) matriz[fila][col]++;\n' +
        '  }\n' +
        '  return matriz;\n' +
        '}'
    },
    {
      titulo: '5) MÉTRICAS POR CLASE (precisión, recall y F1)',
      codigo:
        '/* VP = verdaderos positivos, FP = falsos positivos, FN = falsos negativos\n' +
        ' * Precision = VP / (VP + FP)   -> que tan confiable es cuando dice "es X"\n' +
        ' * Recall    = VP / (VP + FN)   -> cuantos X reales logra encontrar\n' +
        ' * F1        = 2PR / (P + R)    -> equilibrio entre ambas */\n' +
        'var precision = (vp + fp) === 0 ? 0 : vp / (vp + fp);\n' +
        'var recall    = soporte === 0 ? 0 : vp / soporte;\n' +
        'var f1        = (precision + recall) === 0 ? 0\n' +
        '              : 2 * precision * recall / (precision + recall);'
    },
    {
      titulo: '6) PARTICIÓN ESTRATIFICADA 70/30 CON SEMILLA',
      codigo:
        '/* Se baraja cada clase por separado y se toma su 30 % para prueba.\n' +
        ' * Asi ninguna clase queda fuera del conjunto de prueba. */\n' +
        'var filas = barajar(grupos[clase], rng);   // rng = PRNG con semilla fija\n' +
        'var nPrueba = Math.round(filas.length * 0.30);\n' +
        'for (var j = 0; j < filas.length; j++) {\n' +
        '  if (j < nPrueba) prueba.push(filas[j]); else entrenamiento.push(filas[j]);\n' +
        '}'
    }
  ];

  for (var b = 0; b < bloques.length; b++) {
    hoja.getRange(fila, 1).setValue(bloques[b].titulo)
      .setFontWeight('bold').setFontColor(CONFIG.COLOR.ENCABEZADO).setFontSize(11);
    fila++;

    var celdas = hoja.getRange(fila, 1).setValue(bloques[b].codigo);
    celdas.setFontFamily('Consolas').setFontSize(9)
      .setBackground('#F5F5F5').setWrap(true).setVerticalAlignment('top');

    var lineas = bloques[b].codigo.split('\n').length;
    hoja.setRowHeight(fila, lineas * 13 + 8);
    fila += 2;
  }

  hoja.setColumnWidth(1, 900);
  for (var c = 2; c <= 3; c++) hoja.setColumnWidth(c, 180);
  hoja.getRange(1, 1, fila, 1).setVerticalAlignment('top');
}
````

## 06_Valores.gs

Tabla de valores y relleno automático del documento.

*400 líneas.*

````javascript
/* ============================================================================
 *  06_Valores.gs  —  Tabla de valores para completar el documento
 * ----------------------------------------------------------------------------
 *  El documento del proyecto usa marcadores como {{EXACTITUD_CV}} o {{CM_SU}}.
 *  Esta pestaña genera la lista completa "marcador -> valor real" para que se
 *  puedan sustituir sin buscar cifra por cifra en otras hojas.
 *
 *  Además calcula dos explicaciones cualitativas:
 *    - por qué la mejor clase es la mejor;
 *    - por qué se confunden las dos clases más confundidas,
 *      comparando los promedios reales de sus variables.
 * ==========================================================================*/

/** Devuelve el orden de letras usado en los marcadores de la matriz. */
var LETRAS_CLASE = { 'Hatchback': 'H', 'Sedán': 'S', 'SUV': 'U', 'Pick-up': 'P', 'Van': 'V' };

/** Convierte el nombre de una clase en una clave ASCII para los marcadores:
 *  "Sedán" -> "SEDAN", "Pick-up" -> "PICKUP". */
function claveClaseParaMarcador(clase) {
  return normalizarTexto(clase).toUpperCase().replace(/[^A-Z]/g, '');
}

function escribirHojaValores(r) {
  var hoja = limpiarHoja(obtenerOCrearHoja(CONFIG.HOJAS.VALORES));
  var mH = r.holdout.metricas;
  var mC = r.cruzada.metricas;

  var dist = distribucionClases(r.datos);
  var total = r.datos.length;

  // Clase con mejor y peor F1
  var ordenadas = mC.porClase.slice().sort(function (a, b) { return b.f1 - a.f1; });
  var mejor = ordenadas[0];
  var peor = ordenadas[ordenadas.length - 1];

  // Confusión más frecuente fuera de la diagonal
  var peorPar = { real: '-', predicho: '-', casos: 0 };
  for (var i = 0; i < r.cruzada.clases.length; i++) {
    for (var j = 0; j < r.cruzada.clases.length; j++) {
      if (i !== j && r.cruzada.matriz[i][j] > peorPar.casos) {
        peorPar = {
          real: r.cruzada.clases[i],
          predicho: r.cruzada.clases[j],
          casos: r.cruzada.matriz[i][j]
        };
      }
    }
  }

  var ejemplo = r.holdout.detalles.length ? r.holdout.detalles[0] : null;

  /* --- Construcción de la tabla ---------------------------------------- */
  var filas = [];
  function agregar(marcador, valor, origen) {
    filas.push([marcador, valor, origen]);
  }

  /* Datos del equipo (los llena el estudiante a mano) */
  agregar('{{NOMBRE_PROFESOR}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_1}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_2}}', '(escribe el nombre)', 'Manual');
  agregar('{{NOMBRE_INTEGRANTE_3}}', '(escribe el nombre)', 'Manual');
  agregar('{{INSTITUCIÓN}}', '(escribe la institución)', 'Manual');
  agregar('{{FECHA_ENTREGA}}', '(escribe la fecha)', 'Manual');
  agregar('{{FECHA_INICIO}}', '(fecha en que empezaste a difundir el formulario)', 'Manual');
  agregar('{{FECHA_FIN}}', '(fecha en que cerraste la encuesta)', 'Manual');
  agregar('{{TIEMPO_PROMEDIO}}', '(promedio que muestra Google Forms)', 'Manual');

  /* Recolección */
  agregar('{{TOTAL_RESPUESTAS}}', r.lectura.total, '08_Resumen_Datos');
  agregar('{{VALIDAS}}', r.datos.length, '08_Resumen_Datos');
  agregar('{{DESCARTADAS}}', r.construccion.errores.length, '08_Resumen_Datos');
  agregar('{{DUPLICADOS}}', r.construccion.duplicados, '08_Resumen_Datos');

  /* Distribución */
  CLASES.forEach(function (c) {
    var n = dist[c] || 0;
    var clave = claveClaseParaMarcador(c);
    agregar('{{N_' + clave + '}}', n, '08_Resumen_Datos');
    agregar('{{PCT_' + clave + '}}', porcentaje(n / total), '08_Resumen_Datos');
  });

  /* Partición y k */
  agregar('{{N_ENTRENAMIENTO}}', r.particion.entrenamiento.length, '07_Metricas');
  agregar('{{N_PRUEBA}}', r.particion.prueba.length, '07_Metricas');
  agregar('{{K}}', r.k, '07_Metricas');
  r.seleccion.tabla.forEach(function (t) {
    agregar('{{LOO_K' + t.k + '}}', porcentaje(t.exactitud), '07_Metricas');
  });

  /* Holdout */
  agregar('{{ACIERTOS_HOLDOUT}}', mH.aciertos, '05_Matriz_Confusion');
  agregar('{{ERRORES_HOLDOUT}}', mH.errores, '05_Matriz_Confusion');
  agregar('{{EXACTITUD_HOLDOUT}}', porcentaje(mH.exactitud), '05_Matriz_Confusion');
  agregar('{{MACRO_PRECISION_HOLDOUT}}', porcentaje(mH.macroPrecision), '05_Matriz_Confusion');
  agregar('{{MACRO_RECALL_HOLDOUT}}', porcentaje(mH.macroRecall), '05_Matriz_Confusion');
  agregar('{{MACRO_F1_HOLDOUT}}', porcentaje(mH.macroF1), '05_Matriz_Confusion');
  agregar('{{KAPPA_HOLDOUT}}', redondear(mH.kappa, 3), '05_Matriz_Confusion');

  /* Validación cruzada */
  agregar('{{EXACTITUD_CV}}', porcentaje(mC.exactitud), '06_Validacion_Cruzada');
  agregar('{{MACRO_PRECISION_CV}}', porcentaje(mC.macroPrecision), '06_Validacion_Cruzada');
  agregar('{{MACRO_RECALL_CV}}', porcentaje(mC.macroRecall), '06_Validacion_Cruzada');
  agregar('{{MACRO_F1_CV}}', porcentaje(mC.macroF1), '06_Validacion_Cruzada');
  agregar('{{KAPPA_CV}}', redondear(mC.kappa, 3), '06_Validacion_Cruzada');

  var sumaFolds = 0;
  r.cruzada.detalleFolds.forEach(function (f) {
    agregar('{{FOLD' + f.fold + '_TRAIN}}', f.nEntrenamiento, '06_Validacion_Cruzada');
    agregar('{{FOLD' + f.fold + '_TEST}}', f.nPrueba, '06_Validacion_Cruzada');
    agregar('{{FOLD' + f.fold + '_ACC}}', porcentaje(f.exactitud), '06_Validacion_Cruzada');
    sumaFolds += f.exactitud;
  });
  agregar('{{PROMEDIO_FOLDS}}', porcentaje(sumaFolds / Math.max(1, r.cruzada.detalleFolds.length)), '06_Validacion_Cruzada');

  /* Ejemplo de predicción */
  if (ejemplo) {
    agregar('{{EJEMPLO_ID}}', ejemplo.id.replace('R', ''), '04_Predicciones');
    agregar('{{EJEMPLO_REAL}}', ejemplo.real, '04_Predicciones');
    agregar('{{EJEMPLO_PRED}}', ejemplo.predicho, '04_Predicciones');
    agregar('{{EJEMPLO_ACIERTO}}', ejemplo.acierto ? 'Sí' : 'No', '04_Predicciones');
    agregar('{{EJEMPLO_VECINOS}}', ejemplo.vecinos, '04_Predicciones');
  }

  /* Matriz: CM_<real><predicho> */
  for (var a = 0; a < r.cruzada.clases.length; a++) {
    for (var b = 0; b < r.cruzada.clases.length; b++) {
      var letraReal = LETRAS_CLASE[r.cruzada.clases[a]];
      var letraPred = LETRAS_CLASE[r.cruzada.clases[b]];
      agregar('{{CM_' + letraReal + letraPred + '}}', r.cruzada.matriz[a][b], '06_Validacion_Cruzada');
    }
    agregar('{{CM_' + LETRAS_CLASE[r.cruzada.clases[a]] + 'T}}',
      r.cruzada.matriz[a].reduce(function (x, y) { return x + y; }, 0), '06_Validacion_Cruzada');
  }

  /* Métricas por clase */
  mC.porClase.forEach(function (c) {
    var l = LETRAS_CLASE[c.clase];
    agregar('{{SUP_' + l + '}}', c.soporte, '06_Validacion_Cruzada');
    agregar('{{PRE_' + l + '}}', porcentaje(c.precision), '06_Validacion_Cruzada');
    agregar('{{REC_' + l + '}}', porcentaje(c.recall), '06_Validacion_Cruzada');
    agregar('{{F1_' + l + '}}', porcentaje(c.f1), '06_Validacion_Cruzada');
  });

  /* Textos cualitativos calculados */
  agregar('{{MEJOR_CLASE}}', mejor.clase, 'Calculado');
  agregar('{{MEJOR_F1}}', porcentaje(mejor.f1), 'Calculado');
  agregar('{{PEOR_CLASE}}', peor.clase, 'Calculado');
  agregar('{{PEOR_F1}}', porcentaje(peor.f1), 'Calculado');
  agregar('{{CLASE_REAL}}', peorPar.real, 'Calculado');
  agregar('{{CLASE_PREDICHA}}', peorPar.predicho, 'Calculado');
  agregar('{{CASOS_CONFUSION}}', peorPar.casos, 'Calculado');
  agregar('{{RAZON_MEJOR}}', razonDeClase(mejor.clase), 'Calculado');
  agregar('{{EXPLICACION_CONFUSION}}', explicarConfusion(r.datos, peorPar.real, peorPar.predicho), 'Calculado');

  // Veredicto de la hipótesis: se calcula, no se escribe a mano.
  // Así el documento nunca afirma algo que los números contradicen.
  var umbral = 0.75;
  var alcanzo = mC.exactitud >= umbral;
  agregar('{{VEREDICTO_HIPOTESIS}}', alcanzo ? 'se confirma' : 'no se confirma', 'Calculado');
  agregar('{{EXPLICACION_RESULTADO}}', alcanzo
    ? 'La exactitud supera el umbral del ' + Math.round(umbral * 100) +
      ' %, por lo que la hipótesis se confirma con esta muestra.'
    : 'La exactitud no alcanza el umbral del ' + Math.round(umbral * 100) +
      ' %. La mayor dificultad se concentró en ' + peor.clase + ' (F1 = ' + porcentaje(peor.f1) + ')' +
      (peorPar.casos > 0 ? ', que se confunde con ' + peorPar.predicho + ' en ' + peorPar.casos + ' casos' : '') +
      '. Ambas categorías comparten tamaño, altura y número de asientos, y la muestra es pequeña.',
    'Calculado');

  /* Enlaces */
  agregar('{{URL_FORMULARIO}}', obtenerUrlFormulario(), 'Manual');
  agregar('{{URL_HOJA}}', SpreadsheetApp.getActive().getUrl(), 'Automático');

  /* --- Escritura -------------------------------------------------------- */
  escribirTabla(hoja, ['Marcador en el documento', 'Valor real', 'Origen del dato'], filas, {
    titulo: 'VALORES PARA COMPLETAR EL DOCUMENTO — sustituye cada marcador por su valor',
    columnasTexto: [2]
  });

  hoja.setColumnWidth(1, 260);
  hoja.setColumnWidth(2, 460);
  hoja.setColumnWidth(3, 200);
  hoja.getRange(3, 2, filas.length, 1).setWrap(true);
}

/** Devuelve la URL pública del formulario o un texto de aviso. */function obtenerUrlFormulario() {
  var id = PropertiesService.getScriptProperties().getProperty('ID_FORMULARIO');
  if (!id) return '(sin formulario)';
  try {
    return FormApp.openById(id).getPublishedUrl();
  } catch (e) {
    return '(formulario no disponible)';
  }
}

/** Frase que justifica por qué una clase es fácil de reconocer. */
function razonDeClase(clase) {
  var razones = {
    'Hatchback': 'tamaño compacto, altura baja y compuerta trasera completa',
    'Sedán': 'cajuela separada, altura baja y longitud media',
    'SUV': 'altura del techo y al suelo, más amplitud y tracción disponible',
    'Pick-up': 'caja de carga abierta, altura al suelo y tracción 4x4',
    'Van': 'número de asientos, tres filas y capacidad para toda la familia'
  };
  return razones[clase] || 'un perfil de variables claramente diferenciado';
}

/**
 * Explica una confusión comparando los promedios reales de ambas clases.
 * Busca las dos variables con menor diferencia promedio entre las clases
 * involucradas: son las que "parecen iguales" para el modelo.
 */
function explicarConfusion(datos, claseA, claseB) {
  var grupoA = datos.filter(function (d) { return d.clase === claseA; });
  var grupoB = datos.filter(function (d) { return d.clase === claseB; });

  if (!grupoA.length || !grupoB.length) {
    return 'Ambas categorías presentan perfiles muy parecidos en las variables medidas.';
  }

  function promedio(grupo, id) {
    return grupo.reduce(function (acc, d) { return acc + Number(d[id]); }, 0) / grupo.length;
  }

  var diferencias = FEATURES.map(function (f) {
    return {
      etiqueta: f.etiqueta,
      diferencia: Math.abs(promedio(grupoA, f.id) - promedio(grupoB, f.id)),
      a: promedio(grupoA, f.id),
      b: promedio(grupoB, f.id)
    };
  }).sort(function (x, y) { return x.diferencia - y.diferencia; });

  var d1 = diferencias[0];
  var d2 = diferencias[1];

  return 'Los perfiles de ' + claseA + ' y ' + claseB + ' son casi idénticos en "' +
    d1.etiqueta + '" (' + redondear(d1.a, 2) + ' frente a ' + redondear(d1.b, 2) + ') y en "' +
    d2.etiqueta + '" (' + redondear(d2.a, 2) + ' frente a ' + redondear(d2.b, 2) + ')';
}

/* ============================================================================
 *  RELLENO AUTOMÁTICO DEL DOCUMENTO
 * ----------------------------------------------------------------------------
 *  Une la pestaña 11_Valores con el Google Doc del proyecto: recorre todos los
 *  marcadores y los sustituye por su valor real con DocumentApp.replaceText.
 *
 *  Uso:
 *    1. Pega el documento en Google Docs (desde Documento_Proyecto.html).
 *    2. Menú KNN Vehículos > "Completar documento con mis datos".
 *    3. Pega la URL del documento.
 *
 *  Los datos que solo puede escribir el equipo (nombre del profesor, fechas de
 *  recolección, etc.) se dejan intactos y se avisa de cuáles son.
 * ==========================================================================*/
function reemplazarMarcadoresEnDocumento() {
  var ui = SpreadsheetApp.getUi();

  var respuesta = ui.prompt(
    'Completar documento',
    'Pega la URL del Google Doc del proyecto.\n' +
    'El documento debe tener permisos de edición para tu cuenta.',
    ui.ButtonSet.OK_CANCEL
  );
  if (respuesta.getSelectedButton() !== ui.Button.OK) return;

  var idDocumento = extraerIdDocumento(respuesta.getResponseText());
  if (!idDocumento) {
    avisar('No pude leer la URL. Debe verse así:\nhttps://docs.google.com/document/d/XXXXX/edit');
    return;
  }

  var r = completarDocumento(idDocumento);

  if (r.error) { avisar(r.error); return; }

  var mensaje;

  if (r.reemplazados === 0 && r.yaConCifras) {
    // Caso normal al ejecutar dos veces: el documento ya está lleno.
    mensaje = 'El documento ya está actualizado con las cifras actuales (' + r.valorClave + ').\n\n' +
      'No quedaban marcadores que reemplazar, así que no se cambió nada. ' +
      'Esto es correcto: el relleno solo se ejecuta una vez por versión del documento.';
  } else if (r.reemplazados === 0) {
    mensaje = 'No encontré ningún marcador en el documento.\n\n' +
      'Si ya habías rellenado una versión anterior, las cifras pueden estar desactualizadas: ' +
      'vuelve a pegar la plantilla HTML y ejecuta de nuevo.';
  } else {
    mensaje = 'Se reemplazaron ' + r.reemplazados + ' marcadores en el documento "' + r.titulo + '".';
    if (r.noEncontrados.length) {
      mensaje += '\n\n' + r.noEncontrados.length + ' marcadores no aparecieron en el documento. ' +
        'Puede que hayas pegado una versión anterior del archivo.';
    }
  }

  if (r.manuales.length) {
    mensaje += '\n\nQuedan ' + r.manuales.length + ' datos que debes escribir a mano:\n' +
      r.manuales.join('\n');
  }

  avisar(mensaje);
}

/**
 * Rellena un documento por su ID, sin usar la interfaz de la hoja.
 * Devuelve un informe para poder ejecutarse desde el editor de Apps Script.
 */
function completarDocumento(idDocumento) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(CONFIG.HOJAS.VALORES);
  if (!hoja || hoja.getLastRow() < 3) {
    return { error: 'Primero ejecuta "Ejecutar análisis" para generar la pestaña ' + CONFIG.HOJAS.VALORES + '.' };
  }

  var documento;
  try {
    documento = DocumentApp.openById(idDocumento);
  } catch (e) {
    return { error: 'No pude abrir el documento. Revisa la URL y los permisos.\n' + e.message };
  }

  var cuerpo = documento.getBody();
  var valores = hoja.getDataRange().getValues();

  var reemplazados = 0;
  var manuales = [];
  var noEncontrados = [];
  var valorClave = '';

  for (var i = 2; i < valores.length; i++) {
    var marcador = String(valores[i][0]);
    var valor = formatearValorMarcador(marcador, valores[i][1]);

    if (marcador.indexOf('{{') !== 0) continue;
    if (marcador === '{{EXACTITUD_CV}}') valorClave = valor;

    // Los datos que el script no puede inventar se dejan para el equipo
    if (valor.indexOf('(escribe') === 0 || valor.indexOf('(fecha') === 0 ||
      valor.indexOf('(promedio') === 0 || valor.indexOf('(sin formulario') === 0) {
      manuales.push(marcador);
      continue;
    }

    // replaceText interpreta el patrón como expresión regular: hay que escapar
    // las llaves y cualquier carácter especial del marcador.
    var patron = escaparParaRegex(marcador);

    if (cuerpo.findText(patron)) {
      cuerpo.replaceText(patron, valor);
      reemplazados++;
    } else {
      noEncontrados.push(marcador);
    }
  }

  // ¿El documento ya tiene las cifras actuales? Sirve para distinguir
  // "ya está rellenado" de "pegaste una versión vieja".
  var texto = cuerpo.getText();
  var yaConCifras = false;
  if (valorClave) yaConCifras = texto.indexOf(valorClave) !== -1;

  var titulo = documento.getName();
  documento.saveAndClose();

  return {
    reemplazados: reemplazados,
    manuales: manuales,
    noEncontrados: noEncontrados,
    titulo: titulo,
    valorClave: valorClave,
    yaConCifras: yaConCifras
  };
}

/**
 * Convierte el valor almacenado en 11_Valores al texto que debe ir en el doc.
 * Si Sheets guardó un porcentaje como número (0.6818), lo devuelve como "68.18%".
 */
function formatearValorMarcador(marcador, valor) {
  if (typeof valor !== 'number') return String(valor);

  var esPorcentaje = /(EXACTITUD|MACRO_|PCT_|PRE_|REC_|F1_|PROMEDIO_FOLDS|_ACC|LOO_K)/.test(marcador);
  if (esPorcentaje && valor >= 0 && valor <= 1) return (valor * 100).toFixed(2) + '%';

  return String(valor);
}

/** Extrae el ID de un documento desde su URL o lo devuelve si ya es un ID. */
function extraerIdDocumento(texto) {
  var limpio = String(texto || '').trim();
  var coincidencia = limpio.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (coincidencia) return coincidencia[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(limpio)) return limpio;
  return null;
}

/** Escapa todos los caracteres especiales de una expresión regular. */
function escaparParaRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
````

---

*Documento generado con `node src/build_codigo_md.mjs` a partir de los archivos de `apps-script/`.*
