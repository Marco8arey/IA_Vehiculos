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
