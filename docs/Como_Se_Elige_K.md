# Cómo se elige el valor de k

Explicación del único hiperparámetro del proyecto: cuántos vecinos consulta KNN antes de decidir.

---

## 1. Qué es k

KNN clasifica un vehículo nuevo mirando los **k vehículos más parecidos** que ya conoce y poniéndolos a votar.

- **k = 1** → solo pregunta al más parecido.
- **k = 3** → pregunta a los tres más parecidos.
- **k = 11** → pregunta a los once más parecidos.

`k` no se aprende solo: hay que decidirlo. Y esa decisión cambia el resultado.

---

## 2. La regla de oro

> **k se elige usando únicamente el conjunto de entrenamiento.**

Nunca se mira el conjunto de prueba para escogerlo. Si lo hiciéramos, estaríamos ajustando el modelo a los datos con los que después lo evaluamos, y la cifra final dejaría de ser creíble. Ese es el error más común en estos proyectos.

---

## 3. Los valores que se prueban

Definidos en `00_Config.gs`:

```javascript
CANDIDATOS_K: [1, 3, 5, 7, 9, 11]
```

Se usan valores impares para reducir empates. Además, se descarta cualquier `k` que sea mayor o igual al número de ejemplos disponibles.

Con 27 vehículos válidos:

| Dato | Valor |
|---|---|
| Registros válidos | 27 |
| Entrenamiento (70 %) | **18** |
| Prueba (30 %) | 9 |

Los 18 de entrenamiento son los únicos que participan en la elección.

---

## 4. El método: leave-one-out

"Leave-one-out" significa **dejar uno fuera**. Se hace así, para cada valor de k:

```
Para cada uno de los 18 vehículos de entrenamiento:
    1. Sácalo temporalmente
    2. Entrena el modelo con los otros 17
    3. Pídele que prediga la categoría del que sacaste
    4. Anota si acertó
    5. Devuélvelo y sigue con el siguiente

Al final:  exactitud = aciertos / 18
```

Es como estudiar con 18 ejercicios y comprobar si aprendiste resolviendo cada uno **sin mirarlo**, usando los otros 17 como referencia.

### Ejemplo con 5 vehículos y k = 1

| Paso | Se saca | Se predice con | Resultado |
|---|---|---|---|
| 1 | A | B, C, D, E | ✅ acertó |
| 2 | B | A, C, D, E | ✅ acertó |
| 3 | C | A, B, D, E | ❌ falló |
| 4 | D | A, B, C, E | ✅ acertó |
| 5 | E | A, B, C, D | ✅ acertó |

Aciertos: 4 de 5 → **80 % de exactitud interna** para ese k.

Luego se repite todo el proceso con k = 3, k = 5, etc., y se comparan los resultados.

---

## 5. Los resultados reales del proyecto

Tabla de la pestaña `07_Metricas`:

| k | Exactitud interna | Aciertos |
|---|---|---|
| **3** | **61.11 %** | **11 de 18** |
| 1 | 44.44 % | 8 de 18 |
| 5 | 33.33 % | 6 de 18 |
| 7 | 27.78 % | 5 de 18 |
| 9 | 16.67 % | 3 de 18 |
| 11 | 11.11 % | 2 de 18 |

**Ganó k = 3** con 11 aciertos de 18. No hubo empate: los demás quedaron claramente por debajo.

---

## 6. Por qué k = 11 falla tanto

Con solo 18 ejemplos en entrenamiento, consultar 11 vecinos es mirar **más de la mitad** del conjunto. El voto se convierte en un promedio general y la categoría minoritaria desaparece.

Es como preguntar a once personas al azar en lugar de a las tres que de verdad se parecen a ti: la respuesta se vuelve genérica.

Con k = 1 pasa lo contrario: basta con que el vecino más cercano esté mal descrito para equivocarse.

**k = 3 es el punto medio**: suficiente para no depender de un caso raro, pero sin diluir la categoría.

---

## 7. ¿Y si hay empate?

Si dos valores de k obtienen la misma exactitud, gana **el mayor**. Un k más grande promedia más vecinos y suele ser más estable. Está implementado así en el código y documentado en el comentario de la función.

---

## 8. Dónde está en el código

| Función | Archivo | Qué hace |
|---|---|---|
| `elegirMejorK(...)` | `02_KNN.gs` | Recorre los candidatos, hace el leave-one-out y devuelve la mejor k |
| Llamada | `03_Analisis.gs` | Se ejecuta solo con `particion.entrenamiento` |
| Configuración | `00_Config.gs` | `CANDIDATOS_K` y `K_FIJO` |

Si pones `K_FIJO: 5` en la configuración, el script respeta ese valor y no elige automáticamente. Sirve para comparar en clase.

---

## 9. Qué pasa si consigues más datos

La k elegida no es fija: depende del conjunto. Con 100 vehículos, el entrenamiento tendría 70 y probablemente ganaría una k mayor, porque con más ejemplos un k grande ya no diluye las categorías.

Por eso la tabla de `07_Metricas` se regenera cada vez que ejecutas el análisis.

---

## 10. La frase para la presentación

> "No elegimos k a ojo. El script probó 1, 3, 5, 7, 9 y 11 con leave-one-out sobre los 18 vehículos de entrenamiento: saca uno, predice con los otros 17 y cuenta aciertos. Ganó k = 3 con 61 %. El conjunto de prueba nunca se usó para esa decisión."

---

## 11. Resumen

| Pregunta | Respuesta |
|---|---|
| ¿Qué es k? | Cuántos vecinos votan |
| ¿Quién lo elige? | El script, automáticamente |
| ¿Con qué datos? | Solo con el entrenamiento (18 vehículos) |
| ¿Cómo? | Leave-one-out para cada candidato |
| ¿Qué candidatos? | 1, 3, 5, 7, 9, 11 |
| ¿Cuál ganó? | **3**, con 61.11 % |
| ¿Y si empatan? | Gana la k mayor |
| ¿Se puede fijar a mano? | Sí, con `K_FIJO` en `00_Config.gs` |

---

*Documento de apoyo. La explicación completa del sistema está en `Guia_Como_Funciona.md`.*
