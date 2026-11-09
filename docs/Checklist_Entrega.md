# Checklist de entrega

Marca cada casilla cuando el elemento exista **y esté completo**. La columna "Dónde" indica exactamente qué archivo o pestaña abrir.

---

## A. Documento de Google Docs

| ✔ | Requisito de la rúbrica | Dónde está | Cómo verificarlo |
|---|---|---|---|
| ☐ | Planteamiento del problema | `docs/Documento_Proyecto.md`, sección 1 | ¿Hay contexto, pregunta de investigación, hipótesis, objetivo general y específicos? |
| ☐ | Análisis de los datos | Sección 2 | ¿Describe tipos de variables, distribución, calidad, sesgos y variables descartadas? |
| ☐ | Descripción del proceso de recolección (evidencia fotográfica o documental) | Sección 3 | ¿Explica el instrumento, la muestra, el procedimiento y las consideraciones éticas? ¿Hay capturas? |
| ☐ | Descripción del proceso de preparación | Sección 4 | ¿Codificación, validación, normalización y partición, con la regla de no fuga de información? |
| ☐ | Selección del algoritmo | Sección 5 | ¿Compara alternativas y justifica KNN, la distancia y la elección de k? |
| ☐ | Evidencia del proceso de entrenamiento | Sección 6 | ¿Explica qué significa entrenar en KNN y muestra la tabla de selección de k? |
| ☐ | Evidencia de las pruebas realizadas | Sección 7 | ¿Muestra holdout y validación cruzada con cifras reales? |
| ☐ | Análisis de la matriz de confusión | Sección 8 | ¿Interpreta la diagonal, los errores concretos y sus causas? |
| ☐ | Conclusiones | Sección 9 | ¿Retoma la hipótesis, reconoce limitaciones y propone trabajo futuro? |
| ☐ | Sin marcadores pendientes | Todo el documento | Buscar `{{`. No debe aparecer ninguno. |
| ☐ | Nombres, profesor, institución y fecha | Portada | Reemplazados los datos del equipo |

---

## B. Hoja de cálculo

| ✔ | Requisito de la rúbrica | Pestaña | Cómo verificarlo |
|---|---|---|---|
| ☐ | Dataset preparado | `01_Dataset` | Una fila por persona, 14 variables numéricas, sin celdas vacías |
| ☐ | Conjunto de datos de entrenamiento | `02_Entrenamiento` | Suma con el de prueba = total del dataset |
| ☐ | Conjunto de datos de prueba | `03_Prueba` | Las cinco clases aparecen al menos una vez |
| ☐ | Pruebas | `04_Predicciones` | Clase real, clase predicha, ¿acertó?, vecinos |
| ☐ | Matriz de confusión | `05_Matriz_Confusion` y `06_Validacion_Cruzada` | Diagonal verde, totales y métricas |
| ☐ | Código JavaScript altamente documentado | `09_Codigo` + editor de Apps Script | Seis bloques comentados y el proyecto completo |
| ☐ | Valores para completar el documento | `11_Valores` | Cada marcador con su valor real |
| ☐ | Reporte automático | `10_Reporte` | Ocho párrafos con tus cifras |
| ☐ | Modo demostración desactivado | Menú KNN Vehículos | La guía no debe mostrar el aviso en rojo |

---

## C. Presentación frente a grupo

| ✔ | Requisito de la rúbrica | Dónde está | Cómo verificarlo |
|---|---|---|---|
| ☐ | Descripción del proceso completo | `docs/Guion_Presentacion.md` | Se cubren las nueve secciones |
| ☐ | Descripción del código | Bloque 4 y pestaña `09_Codigo` | Se explican distancia, votación, partición y métricas |
| ☐ | Muestra de funcionamiento de la solución | `web/knn_demo.html` | Predice en vivo y muestra los vecinos |
| ☐ | Conclusiones | Bloque 9 | Hipótesis, límites y aprendizajes |

---

## D. Evidencias que suelen pedir y se olvidan

| ✔ | Evidencia | Cómo obtenerla |
|---|---|---|
| ☐ | Formulario publicado | Captura de pantalla en el navegador |
| ☐ | Panel de respuestas con el conteo | Captura de Google Forms |
| ☐ | Hoja con las respuestas originales | Captura de la pestaña de respuestas |
| ☐ | Aplicación presencial | Foto pidiendo permiso; difumina rostros si lo solicitan |
| ☐ | Proceso de análisis | Captura del editor de Apps Script y del menú |
| ☐ | Matriz de confusión | Captura de `05_Matriz_Confusion` |
| ☐ | Fecha y lugar de recolección | Nota escrita en el documento |

---

## E. Revisión técnica final (5 minutos)

1. Ejecuta **KNN Vehículos → Ejecutar análisis** una última vez.
2. Verifica que la guía no muestre "MODO DEMOSTRACIÓN ACTIVO".
3. Confirma que `01_Dataset` tiene tantas filas como respuestas válidas reportadas.
4. Comprueba que entrenamiento + prueba = dataset.
5. Abre `05_Matriz_Confusion`: la suma de todas las celdas debe ser igual al número de casos de prueba.
6. Abre `10_Reporte`: las cifras deben coincidir con las del documento.
7. Abre `web/knn_demo.html` **sin internet** y predice un caso.
8. Comparte el documento, la hoja y la presentación con permisos de lectura para el profesor.

---

## F. Errores que bajan calificación

- Dejar marcadores `{{...}}` en el documento.
- Entregar el modo demostración con datos sintéticos.
- Reportar exactitud sin matriz de confusión.
- No explicar por qué se eligió k.
- Presentar cifras del documento que no coinciden con la hoja.
- Decir "usamos una librería" cuando el código es propio (o al revés).
- No incluir evidencia de que los datos se recolectaron de personas reales.
