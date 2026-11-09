# Cómo funciona en Google Sheets (explicado simple)

La hoja de cálculo es el **taller** donde ocurre todo el proyecto. El formulario solo recoge; la hoja limpia, calcula y guarda las pruebas.

---

## 1. La idea general

Piensa en una cocina:

| Parte | Qué es |
|---|---|
| **Despensa** | Las respuestas crudas del formulario |
| **Preparación** | El dataset limpio y los números |
| **Receta** | El código que hace los cálculos |
| **Plato terminado** | La matriz, las métricas y el reporte |

Todo vive en el mismo libro de cálculo, en pestañas distintas.

---

## 2. El recorrido de una respuesta

```
1. Una persona responde el formulario
              ↓
2. Su respuesta aparece sola en la pestaña
   "Respuestas de formulario 2"
              ↓
3. Tú eliges el menú "Ejecutar análisis"
              ↓
4. El script lee, limpia, divide, compara
   y escribe los resultados en 10 pestañas
```

El paso 4 es el único que haces tú. Los demás son automáticos.

---

## 3. Las pestañas, una por una

| Pestaña | Qué es, en simple |
|---|---|
| `Respuestas de formulario 2` | Lo que contestó la gente, tal cual. Texto y todo. |
| `00_Guia` | Las instrucciones y el enlace del formulario. |
| `01_Dataset` | Las respuestas ya convertidas a números y limpias. |
| `02_Entrenamiento` | El 70 % de los vehículos, con los que el programa "aprende". |
| `03_Prueba` | El 30 % restante, que se guarda para evaluar. |
| `04_Predicciones` | Qué dijo el programa para cada vehículo y si acertó. |
| `05_Matriz_Confusion` | La tabla que muestra qué acertó y qué confundió. |
| `06_Validacion_Cruzada` | La misma evaluación, pero más confiable. |
| `07_Metricas` | Los números del resultado y por qué se eligió k. |
| `08_Resumen_Datos` | La calidad de los datos: cuántos sirvieron y cuántos no. |
| `09_Codigo` | El código explicado, para la entrega. |
| `10_Reporte` | El resumen escrito con las cifras reales. |
| `11_Valores` | La lista de "marcador → valor" que rellena el documento. |

---

## 4. El menú: los cuatro botones que importan

En la hoja aparece un menú llamado **KNN Vehículos**.

| Botón | Qué hace |
|---|---|
| **1. Instalar** | Crea el formulario y las pestañas. Ya está hecho. |
| **2. Ejecutar análisis** | Hace todos los cálculos y llena las pestañas. |
| **3. Ver enlace del formulario** | Te da el enlace para compartir. |
| **4. Completar documento** | Rellena el Google Doc con las cifras. |

En el uso normal solo necesitas el **2** y el **4**.

---

## 5. Qué hace el script por dentro

Aunque parezca magia, solo hace tres tareas:

### Tarea 1 · Limpiar

Lee las respuestas y convierte el texto en números.

> "Muy alto" → 4
> "Sí" → 1
> "7" → 7

Si una respuesta no se entiende, la aparta y la reporta. No la inventa.

### Tarea 2 · Separar y comparar

Divide los vehículos en dos grupos y, para cada uno del grupo de prueba, busca los **3 más parecidos** entre los de entrenamiento.

Esos 3 votan y gana la mayoría. Eso es KNN.

### Tarea 3 · Contar los aciertos

Compara lo que dijo el programa contra la categoría real y arma la tabla:

|  | Predijo Hatchback | Predijo Van |
|---|---|---|
| **Era Hatchback** | ✅ acertó | ❌ falló |
| **Era Van** | ❌ falló | ✅ acertó |

Esa tabla es la matriz de confusión.

---

## 6. ¿Por qué tantas pestañas?

Porque así se puede **auditar** el trabajo.

Si solo entregaras la matriz, el profesor tendría que creerte. Con las pestañas puede seguir el rastro:

```
respuesta de una persona
      → su fila en el Dataset
      → si cayó en entrenamiento o prueba
      → qué predijo el modelo
      → qué vecinos votaron
      → qué celda de la matriz se afectó
```

Todo el camino queda registrado.

---

## 7. Un ejemplo completo

Supón que alguien describe una minivan de 7 asientos.

1. Su respuesta entra en `Respuestas de formulario 2` con texto.
2. Al ejecutar el análisis, se convierte en una fila de números en `01_Dataset`.
3. Si cae en prueba, aparece en `03_Prueba`.
4. El script la compara con las de entrenamiento y encuentra 3 parecidas: dos Van y una SUV.
5. Vota: Van gana 2 a 1.
6. En `04_Predicciones` queda registrada como "real: Van / predicho: Van / acertó: SÍ".
7. En la matriz, suma 1 a la diagonal (acierto).

Eso es todo el recorrido.

---

## 8. Lo que la hoja NO hace

- **No busca en internet.** Todo sale de las 28 encuestas.
- **No inventa respuestas.** Los registros dudosos se descartan y se reportan.
- **No aprende sola.** Hay que pulsar el menú.
- **No decide por ti qué categoría es "correcta".** Eso lo dijo cada persona al responder.

---

## 9. Resumen para decir en 30 segundos

> "El formulario llena una pestaña con las respuestas. Cuando ejecuto el análisis, el script las convierte a números, las separa en entrenamiento y prueba, busca los vehículos más parecidos para cada caso y cuenta los aciertos. Todo queda en pestañas separadas: el dataset, las predicciones, la matriz y el reporte. Así se puede seguir el rastro desde la respuesta de una persona hasta el resultado final."

---

*Documento de apoyo. La parte técnica completa está en `Guia_Como_Funciona.md`.*
