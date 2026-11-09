/* ============================================================================
 *  mock_appsscript.mjs â€” Simulador mÃ­nimo de las APIs de Google Apps Script
 * ----------------------------------------------------------------------------
 *  No forma parte del entregable: es una herramienta de prueba. Permite correr
 *  los archivos .gs en Node.js con una hoja de cÃ¡lculo en memoria, para
 *  detectar errores antes de pegarlos en el editor de Google.
 * ==========================================================================*/

export function crearEntorno(opciones = {}) {
  /* ------------------------------------------------------------------ */
  /* Modelo de hoja: mapa (fila,col) -> valor                            */
  /* ------------------------------------------------------------------ */
  class Hoja {
    constructor(nombre, libro) {
      this.nombre = nombre;
      this.libro = libro;
      this.celdas = new Map();
      this.maxFila = 0;
      this.maxCol = 0;
      this.anchos = new Map();
      this.filasAltura = new Map();
      this.reglas = [];
      this.tabColor = null;
    }
    getName() { return this.nombre; }
    setTabColor(c) { this.tabColor = c; return this; }
    getLastRow() { return this.maxFila; }
    getLastColumn() { return this.maxCol; }
    _set(fila, col, valor) {
      if (valor === '' || valor === null || valor === undefined) this.celdas.delete(fila + ',' + col);
      else this.celdas.set(fila + ',' + col, valor);
      if (valor !== '' && valor !== null && valor !== undefined) {
        this.maxFila = Math.max(this.maxFila, fila);
        this.maxCol = Math.max(this.maxCol, col);
      }
    }
    _get(fila, col) {
      const v = this.celdas.get(fila + ',' + col);
      return v === undefined ? '' : v;
    }
    getRange(fila, col, numFilas = 1, numCols = 1) {
      return new Rango(this, fila, col, numFilas, numCols);
    }
    getDataRange() {
      return new Rango(this, 1, 1, Math.max(1, this.maxFila), Math.max(1, this.maxCol));
    }
    clear() { this.celdas.clear(); this.maxFila = 0; this.maxCol = 0; return this; }
    setFrozenRows() { return this; }
    setFrozenColumns() { return this; }
    autoResizeColumns() { return this; }
    setColumnWidth(c, w) { this.anchos.set(c, w); return this; }
    getColumnWidth(c) { return this.anchos.get(c) || 100; }
    setRowHeight() { return this; }
    setConditionalFormatRules(r) { this.reglas = r; return this; }
  }

  class Rango {
    constructor(hoja, fila, col, numFilas, numCols) {
      this.hoja = hoja;
      this.fila = fila;
      this.col = col;
      this.numFilas = numFilas;
      this.numCols = numCols;
    }
    /* --- escritura / lectura --- */
    setValues(matriz) {
      if (!Array.isArray(matriz)) throw new Error('setValues espera una matriz');
      if (matriz.length !== this.numFilas) {
        throw new Error(`setValues: se esperaban ${this.numFilas} filas y llegaron ${matriz.length} (rango en ${this.hoja.nombre}!)`);
      }
      matriz.forEach((fila, i) => {
        if (fila.length !== this.numCols) {
          throw new Error(`setValues: se esperaban ${this.numCols} columnas y llegaron ${fila.length} en "${this.hoja.nombre}" fila ${this.fila + i}`);
        }
        fila.forEach((v, j) => this.hoja._set(this.fila + i, this.col + j, v));
      });
      return this;
    }
    getValues() {
      const out = [];
      for (let i = 0; i < this.numFilas; i++) {
        const fila = [];
        for (let j = 0; j < this.numCols; j++) fila.push(this.hoja._get(this.fila + i, this.col + j));
        out.push(fila);
      }
      return out;
    }
    setValue(v) {
      this.hoja._set(this.fila, this.col, v);
      return this;
    }
    getValue() { return this.hoja._get(this.fila, this.col); }
    /* --- formato: todo no-op encadenable --- */
    merge() { return this; }
    setFontWeight() { return this; }
    setFontSize() { return this; }
    setFontStyle() { return this; }
    setFontFamily() { return this; }
    setBackground() { return this; }
    setFontColor() { return this; }
    setHorizontalAlignment() { return this; }
    setVerticalAlignment() { return this; }
    setWrap() { return this; }
    setBorder() { return this; }
    setNumberFormat() { return this; }
    setFormula(f) { this.hoja._set(this.fila, this.col, { formula: f }); return this; }
    clear() { return this; }
  }

  class Libro {
    constructor() {
      this.hojas = [];
      this.nombre = 'Hoja de cÃ¡lculo sin tÃ­tulo';
      this.id = 'ID_LIBRO_1';
      this.activa = null;
    }
    getId() { return this.id; }
    getUrl() { return 'https://docs.google.com/spreadsheets/d/DEMO/edit'; }
    rename(n) { this.nombre = n; return this; }
    getName() { return this.nombre; }
    getSheets() { return this.hojas; }
    getSheetByName(n) { return this.hojas.find((h) => h.nombre === n) || null; }
    insertSheet(n) {
      const h = new Hoja(n, this);
      this.hojas.push(h);
      if (!this.activa) this.activa = h;
      return h;
    }
    deleteSheet(h) {
      const i = this.hojas.indexOf(h);
      if (i >= 0) this.hojas.splice(i, 1);
    }
    setActiveSheet(h) { this.activa = h; return h; }
    getActiveSheet() { return this.activa; }
  }

  const libro = new Libro();
  const propiedades = new Map();

  /* ------------------------------------------------------------------ */
  /* Formulario simulado                                                 */
  /* ------------------------------------------------------------------ */
  const item = (tipo, titulo) => {
    const obj = {
      tipo,
      titulo,
      opciones: [],
      required: false,
      setTitle(t) { this.titulo = t; return this; },
      getTitle() { return this.titulo; },
      getType() { return this.tipo; },
      setHelpText() { return this; },
      setRequired(r) { this.required = r; return this; },
      setChoiceValues(o) { this.opciones = o; return this; },
      showOtherOption() { return this; },
      setBounds() { return this; },
      setLabels() { return this; }
    };
    return obj;
  };

  class Formulario {
    constructor(titulo) {
      this.id = 'ID_FORM';
      this.titulo = titulo;
      this.items = [];
      this.destino = null;
    }
    getId() { return this.id; }
    getTitle() { return this.titulo; }
    setTitle(t) { this.titulo = t; return this; }
    setDescription() { return this; }
    setConfirmationMessage() { return this; }
    setProgressBar() { return this; }
    setCollectEmail() { return this; }
    setLimitOneResponsePerUser() { return this; }
    setShuffleQuestions() { return this; }
    getItems() { return this.items; }
    getPublishedUrl() { return 'https://docs.google.com/forms/d/e/DEMO/viewform'; }
    getEditUrl() { return 'https://docs.google.com/forms/d/DEMO/edit'; }
    getDestinationId() {
      if (!this.destino) throw new Error('Sin destino');
      return this.destino;
    }
    setDestination(tipo, id) { this.destino = id; return this; }
    addPageBreakItem() { const i = item('pagina'); this.items.push(i); return i; }
    addMultipleChoiceItem() { const i = item('opcion'); this.items.push(i); return i; }
    addScaleItem() { const i = item('escala'); this.items.push(i); return i; }
    addTextItem() { const i = item('texto'); this.items.push(i); return i; }
    addParagraphTextItem() { const i = item('parrafo'); this.items.push(i); return i; }
  }

  const formulario = new Formulario('demo');
  let contadorReglas = 0;

  /* ------------------------------------------------------------------ */
  /* APIs globales                                                       */
  /* ------------------------------------------------------------------ */
  const ui = {
    Button: { YES: 'YES', NO: 'NO', OK: 'OK' },
    ButtonSet: { YES_NO: 'YES_NO', OK: 'OK' },
    alert: (...args) => 'YES',
    prompt: (titulo, texto, botones) => ({
      getSelectedButton: () => 'OK',
      getResponseText: () => opciones.respuestaPrompt || 'https://docs.google.com/document/d/ABC1234567890abcdefghij/edit'
    }),
    createMenu: () => {
      const menu = {
        addItem: () => menu,
        addSeparator: () => menu,
        addSubMenu: () => menu,
        addToUi: () => menu
      };
      return menu;
    }
  };

  const SpreadsheetApp = {
    getActive: () => libro,
    getUi: () => ui,
    BorderStyle: { SOLID: 'SOLID' },
    InterpolationType: { NUMBER: 'NUMBER' },
    DestinationType: { SPREADSHEET: 'SPREADSHEET' },
    newConditionalFormatRule: () => {
      const r = {
        setGradientMinpointWithValue: () => r,
        setGradientMaxpointWithValue: () => r,
        setRanges: () => r,
        build: () => ({ id: ++contadorReglas })
      };
      return r;
    }
  };

  const FormApp = {
    create: (titulo) => formulario,
    openById: () => formulario,
    DestinationType: { SPREADSHEET: 'SPREADSHEET' },
    ItemType: { PAGE_BREAK: 'pagina', MULTIPLE_CHOICE: 'opcion', SCALE: 'escala', TEXT: 'texto', PARAGRAPH_TEXT: 'parrafo' }
  };

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (propiedades.has(k) ? propiedades.get(k) : null),
      setProperty: (k, v) => { propiedades.set(k, String(v)); },
      deleteProperty: (k) => { propiedades.delete(k); }
    })
  };

  const Utilities = {
    sleep: () => { },
    formatDate: (d, tz, fmt) => {
      const p = (n) => String(n).padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
  };

  const Session = { getScriptTimeZone: () => 'America/Mexico_City' };

  /* ------------------------------------------------------------------ */
  /* Documento simulado (DocumentApp)                                    */
  /* ------------------------------------------------------------------ */
  const documento = {
    texto: opciones.documentoInicial || '',
    getBody() {
      const self = this;
      return {
        getText() { return self.texto; },
        findText(patron) {
          return new RegExp(patron).test(self.texto);
        },
        replaceText(patron, reemplazo) {
          self.texto = self.texto.replace(new RegExp(patron, 'g'), reemplazo);
        }
      };
    },
    saveAndClose() { },
    getId() { return 'ABC1234567890abcdefghij'; },
    getName() { return 'Documento de prueba'; }
  };

  const DocumentApp = { openById: () => documento };

  return {
    libro, formulario, propiedades, documento,
    SpreadsheetApp, FormApp, PropertiesService, Utilities, Session, ui, DocumentApp
  };
}
