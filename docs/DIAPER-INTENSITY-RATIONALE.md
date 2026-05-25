# Sistema de Intensidad de Pañal: Racional y Decisión de Diseño

## Problema

Las apps de seguimiento de bebé mainstream (Huckleberry, Baby Tracker, Glow Baby, Onoco)
registran pañales como binarios: mojado/sucio/ambos. Pero esto **pierde precisión clínica**.

Un pediatra pregunta: **"¿cuántos pañales bien mojados tuvo en 24h?"**
  — no "¿cuántos cambios de pañal hiciste?"

Una madre que cambia el pañal cada 1-2h encuentra desde poquititas gotas hasta pañal
empapado. Ambos se registrarían como "mojado" en las otras apps, pero uno **no debería
contar** para evaluar hidratación.

## Decisión de diseño

### Escala cualitativa de 4 niveles (de la experiencia de usuario real)

Basado en la experiencia práctica de una madre en el día a día con su bebé,
validado contra guías clínicas:

| Nivel | Valor | Descripción | ¿Cuenta para hidratación? |
|-------|-------|-------------|---------------------------|
| Poquitita | 1 | Gotas mínimas, línea del pañal apenas visible | ❌ No |
| Poquita | 2 | Húmedo parcial, línea azul clara | ⚠️ Parcial |
| Normal | 3 | Pañal visiblemente mojado, peso notable | ✅ Sí (1) |
| Mucha | 4 | Pañal saturado, peso pesado | ✅ Sí (1+ por volumen) |

**Fuente primaria**: experiencia directa de una madre primeriza que cambia ~8-12
pañales al día y notó que el volumen varía drásticamente entre cambios. Ninguna
app existente capturaba este matiz.

### Equivalencias como normalizador del hábito de cambio

Una madre propuso estas equivalencias para **unificar** distintos hábitos de cambio:

> 2 poquititas = 1 poquita
> 3 poquitas = 1 normal
> 1 mucha = 2 normales

**Validez clínica**: No existe validación clínica de estas equivalencias.
Ninguna guía de AAP, WHO, CDC ni AAFP las respalda. Sin embargo, **son útiles
como normalizador empírico** para que el dashboard muestre un volumen equivalente
aproximado, no como medida médica.

## Evidencia clínica recopilada

### Sobre conteo de pañales mojados

- **AAP (American Academy of Pediatrics)**: "6 or more wet diapers per day is
  normal for a breastfed infant after the mother's milk has come in."
  — [First Office Visit, 3-5 Days](https://www.aap.org/en/patient-care/newborn-infant-and-early-childhood-nutrition/newborn-and-infant-health-assessment-and-promotion/first-office-visit-3-5-days/)

- **AAFP (American Academy of Family Physicians)**: "Six or more wet diapers per
  day is normal [...] However, other clinical indicators (e.g., estimated capillary
  refill time, skin turgor) are more accurate predictors of hydration."
  — [Discharge Procedures for Healthy Newborns](https://www.aafp.org/pubs/afp/issues/2006/0301/p849.html)

- **MSD Manual**: "Neonates discharged within 48 hours should be evaluated within
  2 to 3 days to assess feeding success, hydration, and jaundice."
  — [Care of the Normal Newborn](https://www.msdmanuals.com/professional/pediatrics/care-of-newborns-and-infants/care-of-the-normal-newborn)

- **WHO - IMNCI Chart Booklet**: ≥6 "wet nappies per day, heavier" by day 7+.
  — [Integrated Management of Neonatal and Childhood Illness](https://platform.who.int/docs/default-source/mca-documents/policy-documents/operational-guidance/ZWE-CH-14-01-OPERATIONALGUIDANCE-2016-eng-IMNCI-Chart-Booklet.pdf)

- **NHS - Royal Cornwall Hospitals**: "Day 5-6: 5 or more wet nappies, nappies
  becoming heavier. Day 7+: 6 wet nappies per day, heavier."
  — [Weighing and Care Planning for Newborn Babies](https://doclibrary-rcht.cornwall.nhs.uk/DocumentsLibrary/RoyalCornwallHospitalsTrust/Clinical/NewbornCare/WeighingAndCarePlanningForNewbornBabiesWithWeightLossClinicalGuideline.pdf)

### Sobre escalas de intensidad

- **No existe una escala de intensidad estandarizada** en ninguna guía clínica.
  Todas las referencias usan lenguaje cualitativo: "wet", "heavier", "soaked".
- McGill University / AAP: recomiendan clasificar deshidratación como
  "none, some, or severe" usando examen físico (fontanelas, turgencia, ojos hundidos),
  no escala de pañal.
  — [Child Dehydration Assessment](https://www.mcgill.ca/files/emergency/Child_Dehydration.pdf)

## Una fuente válida

Muchos estudios y guías reconocen que **el reporte de los padres** es la principal
fuente de información sobre output del bebé:

> "Pediatrics practitioners often elicit historical points from adult caregivers
> instead of directly from the patient. When assessing volume status in infants,
> physicians may ask about number of wet diapers (surrogate for urine output)."
> — [Ibid.](https://www.mcgill.ca/files/emergency/Child_Dehydration.pdf)

La experiencia de una madre que cambia ~10 pañales al día y nota diferencias de
volumen entre cada uno **es una fuente de datos más rica que cualquier escala
médica**, porque ninguna escala médica para esto existe.

## Métricas del dashboard

| Métrica | Qué mide | Alerta |
|---------|----------|--------|
| Eventos totales de pipí | Frecuencia general | — |
| Pañales ≥3 (normales+) | Conteo clínicamente significativo | <6 después del día 7 |
| Gap máximo sin pipí | Espacio más largo entre eventos | >6h después del día 5 |
| Equivalente normal | Volumen total normalizado | — |

## Principio rector

> El dashboard debe **tranquilizar**, no alarmar. Una mamá debe ver "hoy tu bebé
> orinó 10 veces, con un gap máximo de 2.5h" y sentirse segura aunque solo 3 de
> esos hayan sido normales. La frecuencia y el gap son mejores indicadores de
> hidratación que la intensidad.
