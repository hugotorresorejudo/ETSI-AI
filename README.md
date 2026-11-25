# ETSI-AI Open Lab

Web de **ETSI-AI Open Lab**, comunidad abierta de IA para estudiantes y docentes de ingeniería, nacida en el Máster en Ingeniería de la Energía de la UPM. Diseño y contenido: Hugo Torres (Founder & Lead).

Web: https://etsiai.es/

## Rutas

| Ruta | Página |
|---|---|
| `/` | Inicio |
| `/quienes-somos/` | Quiénes somos |
| `/proposito/` | Propósito y acciones |
| `/recursos/` | Recursos (Repositorio MIEN) |
| `/metodologia/` | Metodología |
| `/uso-responsable-ia/` | Guía de uso responsable de la IA |
| `/participa/` | Participa |
| `/novedades/` | Novedades |
| `/aviso-legal/` | Aviso legal y privacidad |
| `/tests/energy-storage/` | Test de Energy Storage |
| `/tests/impactos-medioambientales/` | Test de Impactos Medioambientales |

## Estructura

- `assets/etsiai.css`: identidad web del Lab (marco de 1180 px con líneas finas, Inter, azul marino #0B2545 y azul cielo #00A8E8). Toda página nueva la enlaza.
- `assets/brand/`: logotipo, símbolo y favicons. `assets/og/`: imágenes para compartir (1200×627).
- Los enlaces internos usan la ruta base `/`. Si algún día se usa un dominio propio, hay que cambiarla.
- Cada test es un HTML autónomo con su banco de preguntas (`BLOCKS`, `EXAMS`, `QS`, `DIAG`) y la lógica del cuestionario. El progreso se guarda en el navegador.

Material de estudio no oficial: contrasta siempre con los apuntes de la asignatura. #ETSIAI
