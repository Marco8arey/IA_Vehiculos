# Formulario de recolección de datos

Este documento contiene el formulario completo, listo para crearlo a mano si prefieres no usar el instalador automático.

> **Recomendación:** ejecuta `instalarTodo()` desde Apps Script. Crea el formulario exactamente así, con sus seis secciones, y lo vincula a la hoja. Crearlo a mano es propenso a errores de texto, y el script localiza las columnas **por el texto del encabezado**.

---

## Idea central del instrumento

Cada persona **describe un vehículo real** que conoce (el suyo, el de su familia o uno que haya visto). No se pregunta qué vehículo le gustaría, sino **cómo es** el vehículo: cuántos asientos tiene, si la caja de carga está abierta, qué tan alto es el techo, si tiene tracción 4x4.

Con esas características, el modelo KNN infiere la **categoría**: Hatchback, Sedán, SUV, Pick-up o Van. La categoría se pregunta al final, y se usa únicamente como etiqueta de entrenamiento.

---

## Configuración general del formulario

| Ajuste | Valor |
|---|---|
| Título | Encuesta: describe un vehículo y descubre su categoría |
| Descripción | Esta encuesta forma parte de un proyecto escolar de Inteligencia Artificial. Elige UN vehículo que conozcas bien (el tuyo, el de tu familia o uno que hayas visto) y describe sus características: carrocería, tamaño, asientos, carga y motor. Con esas respuestas, un modelo KNN intentará clasificarlo en cinco categorías: Hatchback, Sedán, SUV, Pick-up o Van. Son 20 preguntas y toma menos de 4 minutos. No se piden datos personales sensibles. |
| Mensaje de confirmación | ¡Gracias! Tu descripción ya forma parte del conjunto de datos del proyecto. |
| Barra de progreso | Activada |
| Recopilar direcciones de correo | **Desactivado** (anonimato) |
| Limitar a 1 respuesta | **Desactivado** (permite describir varios vehículos) |
| Mezclar orden de preguntas | **Desactivado** (el orden es intencional) |

---

## Sección 1 — Identificación del vehículo

> Descripción de la sección: *Elige un solo vehículo real que conozcas. No importa si es tuyo.*

**1. ¿Qué vehículo vas a describir? (marca y modelo, opcional)**
- Tipo: respuesta corta
- Obligatoria: no

**2. ¿El vehículo es tuyo o de alguien cercano?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí, es mío` · `Es de un familiar o conocido` · `No, es de otra persona`

---

## Sección 2 — Carrocería y asientos

> Descripción de la sección: *Observa el vehículo: número de puertas, asientos y forma del área de carga.*

**3. ¿Cuántas puertas laterales tiene (sin contar la compuerta trasera)?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `2` · `3` · `4` · `5` · `Más de 5`

**4. ¿Cuántos asientos tiene en total?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `2` · `3` · `4` · `5` · `6` · `7` · `8 o más`

**5. ¿Cuántas filas de asientos tiene?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `1` · `2` · `3`

**6. ¿Tiene cajuela cerrada y separada del área de pasajeros?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí` · `No`

**7. ¿El área de carga trasera es una caja abierta, sin techo?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí` · `No`

**8. ¿La puerta trasera se abre completa, como compuerta (tipo hatch)?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí` · `No`

---

## Sección 3 — Tamaño y altura

> Descripción de la sección: *Compara el vehículo con un automóvil común.*

**9. ¿Qué tan largo es comparado con un auto común?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Más corto que un auto común` · `Similar a un auto común` · `Más largo que un auto común` · `Mucho más largo que un auto común`

**10. ¿Qué tan alto es el techo de la carrocería?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Bajo` · `Medio` · `Alto` · `Muy alto`

**11. ¿Qué tan separado está la parte baja del vehículo del suelo?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Muy bajo` · `Bajo` · `Alto` · `Muy alto`

**12. ¿Cuánta carga cabe en la parte trasera?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Poca (unas maletas)` · `Media (maletas y bultos)` · `Mucha (muebles o equipo)` · `Caja abierta para carga voluminosa`

---

## Sección 4 — Capacidad y motor

> Descripción de la sección: *Si no conoces el dato exacto, elige la opción más aproximada.*

**13. ¿Qué tan capaz es de circular en terracería o caminos en mal estado?**
- Tipo: escala lineal, 1 a 5
- Etiquetas: `Nada capaz` / `Totalmente capaz`
- Obligatoria: sí

**14. ¿Tiene tracción en las cuatro ruedas (4x4 o AWD)?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí` · `No`

**15. Potencia aproximada del motor**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Menos de 100 hp` · `100 a 150 hp` · `150 a 200 hp` · `Más de 200 hp`

**16. Rendimiento aproximado de combustible**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Menos de 10 km/l` · `10 a 14 km/l` · `14 a 18 km/l` · `Más de 18 km/l`

---

## Sección 5 — Uso del vehículo

> Descripción de la sección: *Para qué se usa principalmente.*

**17. ¿Cuál es el uso principal del vehículo?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones:
  - `Ciudad / traslados diarios`
  - `Familia / pasajeros`
  - `Trabajo / carga`
  - `Viajes en carretera`
  - `Transporte de pasajeros (taxi, app o traslados)`

**18. ¿Se usan más de 5 asientos con frecuencia?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones: `Sí` · `No`

---

## Sección 6 — Clasificación final

> Descripción de la sección: *Esta es la variable que el modelo de Inteligencia Artificial intentará predecir.*

**19. ¿Cómo se clasifica ese vehículo?**
- Tipo: opción múltiple
- Obligatoria: sí
- Opciones:
  - `Hatchback (compacto de 5 puertas, ideal para ciudad)`
  - `Sedán (4 puertas, cajuela separada)`
  - `SUV (camioneta cerrada, más alta y amplia)`
  - `Pick-up (caja de carga abierta)`
  - `Van o Minivan (7 o más asientos, familiar)`
  - `No estoy seguro`

> La opción "No estoy seguro" es importante: permite descartar registros sin etiqueta fiable en lugar de forzar una respuesta.

**20. ¿Por qué lo clasificas así? (opcional)**
- Tipo: párrafo
- Obligatoria: no

---

## Textos de ayuda del formulario

Para evitar malinterpretaciones, cada pregunta incluye un texto de ayuda debajo del enunciado. **No cambia los títulos** (que son los encabezados de la hoja), así que no afecta las respuestas ya recogidas.

| # | Texto de ayuda |
|---|---|
| 1 | Escribe la marca y el modelo si los conoces. No es obligatorio. |
| 2 | Solo para control de calidad. No guardamos datos del propietario. |
| 3 | Cuenta solo las puertas de los costados. NO cuentes la compuerta trasera ni la tapa de la cajuela. |
| 4 | Cuenta todas las plazas, incluida la del conductor. No cuentes espacios sin cinturón de seguridad. |
| 5 | Fila 1: conductor y copiloto. Fila 2: asientos traseros. Fila 3: solo en van y algunas SUV familiares. |
| 6 | Responde **Sí** solo si el equipaje va en un compartimento cerrado y **separado** del habitáculo, como en un sedán. Si el equipaje va en el mismo espacio que los pasajeros (hatchback, SUV, van), responde **No**. |
| 7 | Responde **Sí** solo si la carga va al aire libre, sin techo ni tapa encima: es el caso de las pick-up. |
| 8 | Responde **Sí** si toda la parte trasera se levanta como una compuerta e incluye el vidrio (hatchback, SUV, van). Responde **No** si solo se abre una tapa de cajuela (sedán). |
| 9 | Compara con un sedán común de cuatro puertas. |
| 10 | Bajo: como un sedán. Medio: como un auto familiar. Alto: como una SUV. Muy alto: como una van o furgoneta. |
| 11 | Es el espacio libre entre el suelo y la parte más baja del vehículo. Muy bajo: auto deportivo. Muy alto: camioneta 4x4. |
| 12 | Considera el espacio con los asientos traseros en su posición normal, sin abatirlos. |
| 13 | 1 = no puede salir del pavimento; 5 = diseñado para todo terreno. |
| 14 | Responde Sí si el vehículo tiene tracción en las cuatro ruedas. Si no estás seguro, responde No. |
| 15 | Si no conoces el dato, elige el rango más aproximado según el tipo de vehículo. |
| 16 | Si no conoces el dato, elige el rango más aproximado. Un auto compacto suele rendir más de 14 km/l. |
| 17 | Elige solo uno: el uso más frecuente, no todos los que le dan. |
| 18 | Responde Sí si normalmente viajan más de cinco personas. |
| 19 | Elige la categoría que mejor describa el vehículo. Hatchback: compuerta trasera y sin cajuela separada. Sedán: cajuela cerrada y separada. SUV: cerrada, alta y amplia. Pick-up: caja de carga abierta. Van: 7 o más asientos. Si dudas, marca "No estoy seguro". |
| 20 | Si quieres, explica brevemente tu elección. Nos ayuda a detectar errores de clasificación. |

> **Por qué solo texto de ayuda y no cambiar los enunciados:** el script localiza las columnas de la hoja por el texto del encabezado. Cambiar un título obligaría a rehacer la hoja y perdería las respuestas ya recogidas.

---

## Cómo aplicar la encuesta (protocolo)

1. **Prueba piloto.** Aplica el formulario a 5 personas y pregúntales si alguna pregunta les resultó confusa.
2. **Explica el objetivo.** *"Describe un vehículo que conozcas; no preguntamos cuál te gustaría, sino cómo es."*
3. **Difunde por dos vías.** Enlace por WhatsApp y aplicación presencial con código QR.
4. **Aclara las dudas sin inducir.** Si alguien no sabe el número de asientos, que cuente las plazas reales.
5. **Insiste en la categoría.** Si duda entre SUV y Van, pídele que elija la que más se parezca; si de plano no sabe, que marque "No estoy seguro".
6. **Registra la evidencia.** Captura del formulario, del panel de respuestas y una foto de la aplicación presencial.
7. **No borres respuestas atípicas.** Una pick-up de dos plazas es información real.

---

## Errores frecuentes y cómo evitarlos

| Síntoma | Causa | Solución |
|---|---|---|
| "Preguntas sin columna" | El texto del formulario cambió | Restaura el texto exacto de este documento |
| "Valores no reconocidos" | Respuesta fuera del catálogo | Revisa el registro en la hoja |
| Muchos descartes por "No estoy seguro" | La categoría no está clara para el encuestado | Explica las categorías antes de aplicar la encuesta |
| Solo aparecen 4 clases | Nadie describió esa categoría | Difunde más; el modelo necesita las 5 |
| Aparecen duplicados | Doble envío | El script los elimina y lo reporta |
