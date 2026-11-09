# Proyecto KNN — Clasificación de vehículos a partir de sus características

Sistema completo para la tarea de Inteligencia Artificial: cada persona **describe un vehículo real** mediante un formulario de Google, el dataset se prepara automáticamente y un clasificador **KNN implementado desde cero en JavaScript** identifica su categoría (Hatchback, Sedán, SUV, Pick-up o Van).

> **Los datos se obtienen de personas reales mediante una encuesta.** No se descarga ninguna base de datos ni se usa información de internet. El único insumo son las descripciones del formulario.

---

## ✅ Ya está creado y vinculado

| Elemento | Enlace |
|---|---|
| **Formulario (responder)** | https://docs.google.com/forms/d/e/1FAIpQLScAoT4O97VXhvqYv7NQd77WyRsuRY9aEx-cAKpnWn0wORgs2g/viewform |
| **Formulario (editar)** | https://docs.google.com/forms/d/1UJ21_Xx0VDSam_Oc4D0BZelozKR0DnCV_nNemKqDsOQ/edit |
| **Hoja de cálculo** | https://docs.google.com/spreadsheets/d/1-m8E7GWASibPzR4PX_wUdKEk3iez2zgq3Pz6w7K5gq4/edit |
| **Proyecto de Apps Script** | https://script.google.com/u/0/home/projects/140lLdFS-u1Ecyd9HpBltmOhBLULZsrPAhAhzTXhZCEobsvgdkT86jveq/edit |

El formulario tiene las 20 preguntas en 6 secciones, está vinculado a la hoja y la hoja ya tiene las pestañas de análisis (incluida `Respuestas de formulario 2` con las 21 columnas correctas). Solo falta **compartir el enlace y recolectar descripciones**.

> La pestaña `ZZ_Obsoleta_no_usar` es la hoja de respuestas de la versión anterior del cuestionario. Quedó vacía y se puede ignorar.

> El enlace del proyecto de Apps Script es el que aparece al abrirlo desde la hoja (Extensiones → Apps Script). Si el enlace de arriba no abre, entra por esa vía.

---

## Qué se entrega

| Entregable | Archivo / ubicación |
|---|---|
| Documento (Google Docs) | `docs/Documento_Proyecto.md` y `docs/Documento_Proyecto.html` |
| Hoja de cálculo con dataset, conjuntos, pruebas, matriz y código | Se genera en Google Sheets con el script |
| Código JavaScript documentado | `apps-script/` (6 archivos) y pestaña `09_Codigo` |
| Presentación | `docs/Guion_Presentacion.md` |
| Demo interactiva (sin internet) | `web/knn_demo.html` |
| Checklist de la rúbrica | `docs/Checklist_Entrega.md` |
| Guía del sistema | `docs/Guia_Como_Funciona.md` |
| Explicación sencilla | `docs/Explicacion_Sencilla.md` |
| Cómo funciona en Sheets | `docs/Explicacion_Sheets.md` |
| Guía del formulario | `formulario/Preguntas_Formulario.md` |

---

## Inicio rápido (30 minutos)

### Paso 1 · Crear la hoja y el formulario

1. Entra a [sheets.new](https://sheets.new) y crea una hoja en blanco. Ponle nombre: `KNN Vehículos`.
2. Menú **Extensiones → Apps Script**.
3. En el editor, crea ocho archivos con estos nombres y pega el contenido de cada uno desde la carpeta `apps-script/`:

   | Archivo en Apps Script | Copiar de |
   |---|---|
   | `00_Config.gs` | `apps-script/00_Config.gs` |
   | `01_Datos.gs` | `apps-script/01_Datos.gs` |
   | `01b_Hojas.gs` | `apps-script/01b_Hojas.gs` |
   | `02_KNN.gs` | `apps-script/02_KNN.gs` |
   | `03_Analisis.gs` | `apps-script/03_Analisis.gs` |
   | `04_Instalador.gs` | `apps-script/04_Instalador.gs` |
   | `05_Menu.gs` | `apps-script/05_Menu.gs` |
   | `06_Valores.gs` | `apps-script/06_Valores.gs` |

   > Son ocho archivos. En el editor, usa el botón **+ → Secuencia de comandos** para crear cada uno y pega el contenido. No cambies los nombres.

4. Guarda y ejecuta la función **`instalarTodo`**. Autoriza los permisos cuando Google los pida (es tu propio script).
5. Vuelve a la hoja: aparece el menú **KNN Vehículos** y la pestaña `00_Guia` con el enlace del formulario.

### Paso 2 · Recolectar respuestas

Comparte el enlace del formulario. Meta mínima: **60 respuestas** para que el análisis sea estable. Con 20 funciona, pero las métricas serán muy variables.

### Paso 3 · Ejecutar el análisis

Menú **KNN Vehículos → 2. Ejecutar análisis**. Se llenan las pestañas `01` a `11`.

### Paso 4 · Armar el documento

1. Abre `docs/Documento_Proyecto.html` en Chrome (doble clic).
2. Selecciona todo (`Ctrl+A`), copia y pega en un Google Doc nuevo.
3. En la hoja de cálculo: menú **KNN Vehículos → 4. Completar documento con mis datos** y pega la URL del documento. El script sustituye automáticamente los 117 marcadores de datos reales (cifras, matriz de confusión, métricas por clase, tablas de k y folds).
4. Escribe a mano los 9 datos del equipo: profesor, integrantes, institución, fecha de entrega y fechas de recolección. Quedarán resaltados en amarillo.
5. Borra el recuadro de instrucciones del inicio y revisa la redacción de las secciones 7 y 8 para que coincida con lo que observaste.

### Paso 5 · Ensayar la presentación

Abre `web/knn_demo.html` (doble clic, funciona sin internet) y sigue `docs/Guion_Presentacion.md`.

---

## Probar el proyecto sin Google (opcional pero recomendado)

Requiere Node.js 18 o superior.

```powershell
node src/build.mjs                 # ensambla los .gs y la demo web
node src/test.mjs 60               # prueba el núcleo KNN con 60 datos
node src/test_appsscript.mjs       # simula Google Sheets completo
node src/test_documento.mjs        # prueba el relleno automático del documento
node src/check_placeholders.mjs    # verifica que todo marcador tenga valor
node src/md2html.mjs docs/Documento_Proyecto.md docs/Documento_Proyecto.html
```

`test_appsscript.mjs` ejecuta `instalarTodo`, `activarModoDemo` y `ejecutarAnalisis` sobre una hoja de cálculo simulada, y comprueba que los conjuntos sumen el total, que la matriz tenga cinco clases y que el reporte exista. Si esto pasa, el proyecto funciona en Google.

Para ver la demo con un servidor local:

```powershell
node src/servidor.mjs 8123
# abre http://localhost:8123/web/knn_demo.html
```

---

## Cómo funciona el modelo

```
Formulario (20 preguntas)
        │
        ▼
01_Datos.gs      texto → número (codificación explícita)
        │        14 variables predictoras, 5 de control
        ▼
01b_Hojas.gs     limpieza: validación, duplicados, trazabilidad
        │
        ▼
02_KNN.gs        normalización min-max + distancia euclidiana ponderada
        │        + votación 1/d + matriz de confusión + métricas
        ▼
03_Analisis.gs   partición 70/30 estratificada (semilla 42)
        │        + selección de k por leave-one-out
        │        + holdout + validación cruzada 5-fold
        ▼
Pestañas 01–11   dataset, conjuntos, predicciones, matriz, métricas,
                 reporte y tabla de valores para el documento
```

### Decisiones de diseño importantes

- **Normalización solo con entrenamiento.** Evita fuga de información; es el error más común en proyectos escolares.
- **Partición estratificada.** Con pocas respuestas, un corte aleatorio simple puede dejar una clase fuera del conjunto de prueba.
- **k elegido con leave-one-out sobre entrenamiento.** El conjunto de prueba nunca participa en decisiones de diseño.
- **Dos evaluaciones.** Holdout (riguroso) y validación cruzada (estable con pocos datos).
- **Trazabilidad.** Cada registro conserva un ID que permite rastrear cualquier predicción hasta la respuesta original.

---

## Estructura de carpetas

```
KNN/
├─ apps-script/           Código para pegar en Google Apps Script
│  ├─ 00_Config.gs        Parámetros del experimento
│  ├─ 01_Datos.gs         Preguntas, codificación y variables
│  ├─ 01b_Hojas.gs        Lectura/escritura en Google Sheets
│  ├─ 02_KNN.gs           Núcleo del algoritmo (documentado)
│  ├─ 03_Analisis.gs      Pipeline y generación de pestañas
│  ├─ 04_Instalador.gs    Crea el formulario y la estructura
│  ├─ 05_Menu.gs          Menú, demo y documentación del código
│  └─ 06_Valores.gs       Tabla de valores para el documento
├─ docs/
│  ├─ Documento_Proyecto.md      Documento completo (fuente)
│  ├─ Documento_Proyecto.html    Listo para copiar a Google Docs
│  ├─ Guia_Como_Funciona.md      Explicación completa del sistema
│  ├─ Explicacion_Sencilla.md    Versión sin tecnicismos, para presentar
│  ├─ Explicacion_Sheets.md      Cómo funciona la hoja, paso a paso
│  ├─ Guion_Presentacion.md      Guion de 18, 10 y 5 minutos
│  └─ Checklist_Entrega.md       Rúbrica punto por punto
├─ formulario/
│  └─ Preguntas_Formulario.md    Formulario completo y protocolo
├─ src/                   Código compartido y herramientas de prueba
│  ├─ esquema.js          Fuente única de preguntas y codificación
│  ├─ knn_core.js         Fuente única del algoritmo
│  ├─ build.mjs           Ensambla .gs y la demo web
│  ├─ test.mjs            Pruebas del núcleo
│  ├─ test_appsscript.mjs Simulación completa de Google Sheets
│  ├─ mock_appsscript.mjs Simulador de las APIs de Google
│  ├─ check_placeholders.mjs  Verifica el documento
│  ├─ md2html.mjs         Convierte el documento a HTML
│  └─ servidor.mjs        Servidor local para ver la demo
├─ web/
│  ├─ plantilla_demo.html Plantilla de la demo
│  └─ knn_demo.html       Demo autocontenida (generada)
└─ datos/
   ├─ dataset_real.csv                Dataset real (27 vehículos descritos)
   └─ dataset_EJEMPLO_sintetico.csv   Ejemplo del formato CSV (datos inventados)
```

---

## Personalizar el experimento

Todo se cambia en `00_Config.gs` o en `src/esquema.js` (y luego se ejecuta `node src/build.mjs`).

| Qué quieres cambiar | Dónde |
|---|---|
| Proporción de prueba (70/30) | `CONFIG.PROPORCION_PRUEBA` |
| Valores de k a probar | `CONFIG.CANDIDATOS_K` |
| Fijar k manualmente | `CONFIG.K_FIJO = 5` |
| Número de particiones de la validación cruzada | `CONFIG.FOLDS` |
| Semilla de la partición | `CONFIG.SEMILLA` |
| Pesos de las variables | `FEATURES` en `esquema.js` |
| Preguntas del formulario | `PREGUNTAS` en `esquema.js` |
| Clases de vehículo | `CLASES` en `esquema.js` |

> Si cambias el formulario después de recolectar, actualiza también `PREGUNTAS` en `01_Datos.gs`; de lo contrario el script reportará "preguntas sin columna".

---

## Problemas frecuentes

**"No se encontró la hoja de respuestas del formulario"**
El formulario no está vinculado a la hoja. Ve a Google Forms → Respuestas → icono de Sheets → *Vincular a Hojas de cálculo*.

**"Solo hay N respuestas válidas y se requieren 20"**
Sigue difundiendo el formulario o baja `CONFIG.MIN_RESPUESTAS` (no se recomienda por debajo de 15).

**"No hay respuestas para las clases: Van"**
Nadie eligió esa categoría. El modelo necesita las cinco; difunde más o elimina temporalmente esa clase en `CLASES` y en las opciones del formulario.

**Aparece "MODO DEMOSTRACIÓN ACTIVO"**
Estás trabajando con datos sintéticos. Menú **KNN Vehículos → Datos de demostración → Desactivar y borrar**, y vuelve a ejecutar el análisis.

**Las cifras del documento no coinciden con la hoja**
Se ejecutó el análisis después de copiar los párrafos. Vuelve a copiar `10_Reporte` y `11_Valores`.

**El documento conserva marcadores `{{...}}`**
Es el paso que más se olvida. Busca `{{` en Google Docs; no debe quedar ninguno.

**Error de permisos al ejecutar**
La primera ejecución pide autorización. Es normal: el script lo creaste tú. Revisa *Configuración avanzada → Ir a (nombre del proyecto)*.

---

## Ética y honestidad académica

- Las respuestas provienen de personas reales; el modo demostración está separado y marcado en rojo a propósito.
- Los registros descartados se reportan, no se inventan ni se imputan.
- El conjunto de prueba nunca se usa para elegir k.
- Las limitaciones de la muestra se declaran en el documento, no se esconden.
- El código es propio y está comentado para poder explicarlo en vivo.

---

## Referencias del método

Cover, T., & Hart, P. (1967). Nearest neighbor pattern classification. *IEEE Transactions on Information Theory, 13*(1), 21–27.

Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.

Tan, P.-N., Steinbach, M., & Kumar, V. (2019). *Introduction to Data Mining* (2nd ed.). Pearson.

Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement, 20*(1), 37–46.
