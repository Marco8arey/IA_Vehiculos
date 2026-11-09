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
