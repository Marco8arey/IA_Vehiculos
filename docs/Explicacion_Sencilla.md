# El proyecto explicado en simple

Una versión sin tecnicismos, pensada para entender el trabajo y poder contarlo en voz alta.

---

## 1. ¿Qué hicimos?

Construimos un programa que, a partir de la **descripción de un vehículo**, dice a qué categoría pertenece:

**Hatchback · Sedán · SUV · Pick-up · Van**

La persona no dice qué coche le gustaría. Describe uno real —el suyo, el de su familia o uno que conozca— y el programa deduce qué tipo es.

---

## 2. ¿Para qué sirve?

Clasificar vehículos parece fácil para una persona: basta mirarlo. Pero cuando hay que hacerlo con cientos de vehículos y de forma automática, dos personas pueden llamar "camioneta" a cosas distintas.

Eso se necesita en inventarios de agencias, aseguradoras, estacionamientos, peajes y plataformas de venta de autos.

---

## 3. ¿Cómo conseguimos los datos?

Con una **encuesta hecha por nosotros**, aplicada a personas reales.

- No usamos internet.
- No descargamos ninguna base de datos.
- No copiamos información de ningún lado.

Todo salió de lo que respondieron las personas: **28 encuestas, de las cuales 27 resultaron útiles** (una estaba repetida).

---

## 4. ¿Qué le preguntamos?

20 preguntas sobre el vehículo, agrupadas en seis temas:

| Tema | Ejemplo de pregunta |
|---|---|
| Identificación | ¿Qué vehículo es? ¿Es tuyo? |
| Carrocería | ¿Cuántas puertas y asientos tiene? ¿Tiene cajuela separada? |
| Tamaño | ¿Es largo? ¿Qué tan alto es el techo? |
| Motor | ¿Es 4x4? ¿Cuánta potencia tiene? |
| Uso | ¿Se usa para trabajo, familia o ciudad? |
| Clasificación | ¿Tú cómo lo clasificarías? |

La última pregunta es la más importante: **es la respuesta que el programa debe aprender a predecir**.

---

## 5. ¿Cómo entiende la computadora un vehículo?

Con **números**.

Cada respuesta se convierte en un número. Por ejemplo:

| Respuesta de la persona | Número |
|---|---|
| "Alto" | 3 |
| "Muy alto" | 4 |
| "Tiene caja abierta: Sí" | 1 |
| "Tiene caja abierta: No" | 0 |
| "7 asientos" | 7 |

Al final, cada vehículo queda como una lista de **14 números**. Eso es lo que el programa compara.

Antes de comparar, todos los números se ajustan a una misma escala (de 0 a 1). Si no lo hiciéramos, "asientos" (que va de 2 a 8) pesaría muchísimo más que "tracción" (que solo es 0 o 1).

---

## 6. ¿Cómo decide la categoría?

Con un método llamado **KNN**, que en español significa "los k vecinos más cercanos".

La idea es la misma que usamos los humanos:

> Para saber a qué grupo pertenece alguien nuevo, mira con quién se junta.

El programa hace esto:

1. **Compara** el vehículo nuevo con los 27 que ya conoce.
2. **Mide** qué tan distinto es de cada uno.
3. **Toma los 3 más parecidos** (por eso k = 3).
4. **Los pone a votar**: cada vecino vota por su categoría.
5. **Gana la mayoría**.

### Un ejemplo real

Llega un vehículo con 7 asientos, 3 filas, techo alto y uso de transporte de pasajeros.

Los tres vehículos más parecidos de la base son:
- dos que están clasificados como **Van**
- uno que está clasificado como **SUV**

Votación: Van 2, SUV 1. **Resultado: Van.**

Nada más. Eso es todo el algoritmo.

---

## 7. ¿Cómo comprobamos que funciona?

No basta con que acierte con los datos que ya vio: hay que probarlo con datos nuevos.

Para eso se separan los vehículos en dos grupos:

| Grupo | Cuántos | Para qué |
|---|---|---|
| Entrenamiento | 70 % | El programa "aprende" con ellos |
| Prueba | 30 % | Se usan solo para evaluar |

Además se hace una **validación cruzada**: se repite el ejercicio cinco veces cambiando qué vehículos quedan para prueba, de modo que **todos se evalúen al menos una vez**. Eso da una cifra más confiable cuando hay pocos datos.

---

## 8. ¿Qué resultados obtuvimos?

| Medida | Resultado |
|---|---|
| Vehículos válidos | 27 |
| Vecinos consultados (k) | 3 |
| Aciertos en el grupo de prueba (9 casos) | 8 de 9 → **88.89 %** |
| Aciertos en la validación cruzada (27 casos) | 16 de 27 → **59.26 %** |

### ¿Cuál cifra es la buena?

La de **59.26 %**.

La de 88.89 % sale de solo 9 casos: un solo error mueve 11 puntos. En cambio la validación cruzada evalúa los 27, así que es más estable.

### ¿Es bueno o malo?

Es **mejor que adivinar** (con cinco categorías, adivinar acierta 20 %), pero está por debajo del 75 % que nos habíamos propuesto. Y sabemos exactamente por qué.

---

## 9. Algo que salió mal (y cómo lo arreglamos)

La pregunta 6 decía: *"¿Tiene cajuela cerrada y separada del área de pasajeros?"*

Muchas personas la entendieron como *"¿tiene tapa la cajuela?"* y respondieron "Sí" incluso en hatchbacks, que **no tienen cajuela separada**.

Consecuencia: los hatchbacks y los sedanes quedaban descritos con los mismos números. El programa no podía distinguirlos, y **no acertó ni un solo hatchback** (0 de 3).

Lo hablamos con los encuestados. Nos confirmaron que no habían entendido y autorizaron la corrección. Ajustamos **solo esa respuesta**, y volvimos a ejecutar.

Resultado: el hatchback pasó de **0 % a 100 %** de acierto.

Ese es uno de los aprendizajes más valiosos del proyecto: **los datos importan más que el algoritmo**.

---

## 10. ¿Qué limitaciones tiene?

- **Pocos datos.** 27 vehículos para 14 características es una muestra pequeña.
- **La gente se equivoca al clasificar.** Algunos dudaban si su coche era SUV o Van.
- **SUV y Van son muy parecidas.** Una SUV de 7 asientos y una minivan comparten tamaño, altura y plazas. El programa las confunde porque **de verdad se parecen**.
- **Datos declarados, no medidos.** La potencia y la longitud se respondieron en rangos amplios, no con instrumentos.

---

## 11. Resumen para decir en 30 segundos

> "Hicimos una encuesta donde cada persona describe un vehículo real. Convertimos esas descripciones en 14 números y usamos el algoritmo KNN, que clasifica comparando con los vehículos más parecidos. Con 27 vehículos obtuvimos 59 % de acierto en validación cruzada. El trabajo documenta todo el proceso, y también un error que encontramos en una pregunta: al corregirlo, una categoría pasó de 0 % a 100 %."

---

## 12. Palabras que conviene saber

| Palabra | Qué significa |
|---|---|
| **Variable** | Cada característica que describimos (asientos, altura, tracción) |
| **Clase** | La categoría que queremos predecir (Hatchback, Van…) |
| **Etiqueta** | La respuesta correcta de un vehículo ya conocido |
| **Entrenamiento** | Los datos con los que el programa aprende |
| **Prueba** | Los datos que se usan solo para evaluar |
| **k** | Cuántos vecinos consulta antes de votar |
| **Normalizar** | Ajustar todos los números a la misma escala |
| **Matriz de confusión** | Tabla que muestra qué acertó y qué confundió |

---

*Documento de apoyo. Las cifras corresponden al cierre del proyecto: 27 vehículos válidos, k = 3, validación cruzada de 59.26 %.*
