# Guion de presentación

Tres versiones: **18 minutos** (completa), **10 minutos** (ajustada) y **5 minutos** (exprés). El orden sigue la rúbrica.

---

## Preparación previa (10 minutos antes)

- Abre en pestañas separadas:
  1. El documento (Google Docs).
  2. La hoja de cálculo, en la pestaña `05_Matriz_Confusion`.
  3. La hoja, en `10_Reporte`.
  4. La demo: `web/knn_demo.html` (doble clic al archivo).
  5. El formulario publicado.
- Cierra notificaciones. Ten el cargador conectado.
- Ten a mano una hoja impresa con la matriz de confusión, por si falla el proyector.
- Reparte los turnos: quién habla en cada bloque y quién opera la computadora.

---

## Versión completa · 18 minutos

### 1. Apertura y problema (2 min)

> "Clasificar un vehículo parece trivial: basta mirarlo. Pero cuando hay que hacerlo de forma masiva —en un inventario, una aseguradora o una plataforma de venta— dos personas pueden llamar 'camioneta' a cosas distintas. Nuestra pregunta fue: **¿se puede identificar la categoría de un vehículo a partir de sus características?**"

- Presenta al equipo y el objetivo: clasificar en 5 categorías con KNN.
- Aclara de inmediato: **los datos son descripciones de vehículos hechas por personas, no información de internet**.

### 2. Recolección de datos (2 min)

- Muestra el formulario. Explica las 6 secciones y por qué 20 preguntas.
- Enfatiza el diseño: **se describe un vehículo real, no una preferencia**. Se pregunta cuántos asientos tiene, no cuál le gustaría.
- Menciona la prueba piloto y la opción "No estoy seguro", que permite descartar registros sin etiqueta fiable.
- Comparte la cifra: **N vehículos descritos, M válidos**.
- Si preguntan por el sesgo: admítelo. "La muestra es por conveniencia; lo declaramos en el documento."

### 3. Preparación (2 min)

Explica el recorrido de un dato con un ejemplo concreto:

> "Alguien describió una camioneta con 7 asientos, 3 filas, caja cerrada y techo alto. Eso se convierte en 7, 3, 0 y 4. La pregunta de uso se desdobla en dos columnas binarias."

- Muestra la tabla de codificación del documento.
- Explica la **normalización min-max**: sin ella, "asientos" (2–8) dominaría a las binarias (0–1).
- Menciona la regla de oro: **min y max solo con entrenamiento**, para evitar fuga de información.

### 4. Algoritmo (3 min)

- Justifica KNN frente a árboles, Naive Bayes y SVM.
- Explica los 4 pasos: medir → ordenar → votar → decidir.
- Escribe en el pizarrón la distancia euclidiana ponderada.
- Explica la elección de k con **leave-one-out**: "elegimos k sin ver el conjunto de prueba".

### 5. Entrenamiento (1 min)

- Sé honesto: **KNN no entrena parámetros**. "Entrenar aquí es guardar los ejemplos normalizados; el costo está en predecir."
- Muestra la tabla de k con la exactitud interna.

### 6. Pruebas (2 min)

- Muestra `02_Entrenamiento` y `03_Prueba`: los conjuntos existen y son disjuntos.
- Muestra las métricas del holdout y de la validación cruzada.
- Explica por qué hay dos evaluaciones: "con pocos casos de prueba, un acierto mueve la exactitud varios puntos".

### 7. Matriz de confusión (2 min)

- Proyecta la matriz. Señala la diagonal: "aquí están los aciertos".
- Señala **una celda específica** y cuéntala como historia: "esta Van se clasificó como SUV porque tenía cinco plazas y altura media".
- Explica la confusión principal con los promedios de las variables (la pestaña `11_Valores` ya redacta esa frase).
- Cierra con la idea clave: **la matriz dice más que la exactitud**.

### 8. Demostración en vivo (3 min)

1. Abre `web/knn_demo.html`. Muestra el conjunto de datos.
2. Señala las métricas: exactitud, macro-F1, kappa.
3. Mueve el control de **k** y muestra cómo cambian las métricas.
4. Ve a **Predicción en vivo**: sube "asientos" a 7, "filas" a 3, "altura del techo" a 4 y "capacidad de carga" a 3. Clasifica. Debe salir **Van**.
5. Ahora baja "asientos" a 2, "filas" a 1, pone "caja abierta" en 1 y "tracción 4x4" en 1. Debe salir **Pick-up**.
6. Muestra los **k vecinos** y explica: "así razona el modelo: busca los vehículos más parecidos y vota".
7. Si hay tiempo, cambia los ejes de la gráfica y muestra cómo se agrupan las categorías.

> Si el proyector falla: las capturas están en el documento y en `evidencias/`.

### 9. Conclusiones (1 min)

- Recupera la hipótesis: se cumplió con {{EXACTITUD_CV}} frente al umbral de 75 %.
- Reconoce límites: muestra pequeña, ruido de etiqueta, fronteras difusas SUV/Van.
- Cierra con el aprendizaje más valioso: **"la calidad de los datos importa más que el algoritmo"**.

---

## Versión de 10 minutos

| Bloque | Tiempo | Qué recortar |
|---|---|---|
| Problema y objetivo | 1 min | Solo la pregunta de investigación |
| Recolección | 1.5 min | Muestra el formulario, di las cifras |
| Preparación | 1.5 min | Solo codificación y normalización |
| Algoritmo | 2 min | Los 4 pasos y por qué KNN |
| Pruebas | 1.5 min | Solo validación cruzada |
| Matriz de confusión | 1.5 min | Una celda, una causa |
| Demo | 2 min | Solo una clasificación en vivo |
| Conclusiones | 1 min | Hipótesis + una limitación |

---

## Versión de 5 minutos (exprés)

1. **Problema (30 s):** identificar la categoría de un vehículo a partir de sus características.
2. **Datos (45 s):** encuesta propia, N vehículos descritos, 14 variables, 5 clases. Nada de internet.
3. **Preparación (45 s):** texto → número, normalización min-max, partición 70/30 estratificada.
4. **Algoritmo (45 s):** KNN mide distancias, toma k vecinos y vota.
5. **Resultado (45 s):** exactitud y la confusión principal, con su causa.
6. **Demo (60 s):** describe un vehículo, muestra la categoría y los vecinos.
7. **Conclusión (30 s):** funcionó y estas son sus limitaciones.

---

## Preguntas probables del profesor (y respuestas)

**¿Por qué KNN y no una red neuronal?**
Con 60 descripciones y 14 variables, una red neuronal sobreajustaría y no sería interpretable. KNN es competitivo en este tamaño y permite mostrar qué vehículos sustentan la predicción.

**Si la encuesta ya pregunta la categoría, ¿el modelo no está haciendo trampa?**
No. La categoría es la **variable objetivo**: es la respuesta que queremos aprender a predecir. El modelo nunca la recibe como entrada; solo ve las 14 características. Al usar el sistema con un vehículo nuevo, se describen sus características y la categoría la produce el modelo.

**¿Cómo evitan el sobreajuste?**
Con tres medidas: partición entrenamiento/prueba, elección de k con leave-one-out solo sobre entrenamiento y validación cruzada. Además, la normalización usa solo las estadísticas del entrenamiento.

**¿Qué pasa si k es par?**
Puede haber empate. Usamos votación ponderada por 1/distancia y, si aun así hay empate, decide el vecino más cercano.

**¿Por qué normalizan?**
Porque la distancia euclidiana es sensible a la escala: "asientos" (2–8) dominaría a una variable binaria (0–1). Min-max lleva todo a [0,1].

**¿Por qué 14 variables y no las 20?**
Porque seis no aportan (marca, puertas, si es propio) o son redundantes (capacidad fuera del pavimento, uso completo, siete asientos). La selección está justificada con la varianza calculada en `08_Resumen_Datos`.

**¿La muestra es representativa?**
No. Es por conveniencia y lo declaramos como limitación. El objetivo es demostrar el proceso completo.

**¿Qué mejorarían con más tiempo?**
Más vehículos descritos (150+), una guía de categorías para reducir el ruido de etiqueta, variables objetivas (longitud y peso exactos) y comparación con otros algoritmos usando la misma partición.

**¿El código es suyo?**
Sí, implementado desde cero en JavaScript: distancia, votación, partición, métricas y validación cruzada. No usa librerías de machine learning; todo está en Apps Script y documentado línea por línea.

---

## Reparto sugerido de roles

| Integrante | Responsabilidad |
|---|---|
| 1 | Apertura, problema, recolección y ética |
| 2 | Preparación de datos y explicación de la normalización |
| 3 | Algoritmo, entrenamiento y pruebas |
| 4 | Matriz de confusión, demo en vivo y conclusiones |

Si son tres: el 2 y el 3 combinan preparación y algoritmo; el 4 toma matriz y demo.

---

## Lista de verificación antes de presentar

- [ ] La hoja tiene las respuestas reales (no el modo demostración).
- [ ] `10_Reporte` y `11_Valores` están actualizados.
- [ ] El documento no tiene ningún marcador de llaves dobles.
- [ ] La demo abre sin internet y clasifica correctamente.
- [ ] Las cifras que vas a decir en voz alta están escritas en una tarjeta.
- [ ] Sabes explicar la diferencia entre exactitud, precisión y recall.
- [ ] Sabes responder "¿no es trampa preguntar la categoría?".
- [ ] Alguien cronometra los ensayos.
