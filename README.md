# Dashboard de Capacitación — Brigadas Voluntarias MSC

Sistema web de gestión y seguimiento del programa de capacitación para Brigadas Voluntarias de Mina San Cristóbal, desarrollado por **INSEIN SRL**.

---

## Descripción

Herramienta de análisis y reporte del avance en el plan de capacitación de brigadistas voluntarios. Procesa directamente el archivo Excel de la planilla de capacitación sin enviar datos a ningún servidor — todo el procesamiento ocurre localmente en el navegador.

---

## Características principales

### Consultas
- **Por brigadista** — búsqueda individual con árbol completo de módulos, unidades y lecciones (completadas / pendientes / N/A), notas por lección y cumplimiento del programa
- **Por grupo** — filtros en cascada Área de trabajo → Grupo, tabla de cumplimiento con detalle expandible de módulos por brigadista
- **Módulos por grupo** — selector de módulo con tabla brigadistas × lecciones (✓ verde completada / ✗ rojo pendiente / — no aplica al tipo)

### Por nivel
- **Nv. Inicial (BV-B)** — 35 brigadistas, 95 hrs, 41 lecciones
- **Nv. Medio (BV-M)** — 96 brigadistas, 128 hrs, 54 lecciones
- **URE** — 6 brigadistas, 236 hrs, 51 lecciones
- **Sin clasificar** — brigadistas sin tipo_bv asignado

Cada sección incluye filtros por Estado / Área / Grupo, KPIs, ranking de mayor y menor cumplimiento (lista con scroll para empates), gráficos de cumplimiento por módulo y distribución de notas, y tabla con botón "Ver módulos" que expande lecciones completadas y pendientes.

### Herramientas
- **Por Organigrama** — árbol colapsable Vicepresidencia → Gerencia → Superintendencia → Supervisor con semáforo de cumplimiento por nivel, alerta de brigadistas bajo meta de 4 hrs/mes y lecciones pendientes abreviadas (M03: L01 L02). Exporta PDF formal con resumen ejecutivo, detalle jerárquico completo y bloque de firmas
- **Plan Semanal** — selector de módulos y lecciones específicas, muestra qué brigadistas tienen esas lecciones pendientes, exporta PDF del plan
- **Informe Mensual** — KPIs comparativos mes anterior vs actual, tendencia últimos 6 meses, horas por área de trabajo, brigadistas por tipo. Exporta PDF e Word
- **Verificar datos** — validación dinámica de integridad del archivo cargado

---

## Estructura del proyecto

```
dashboard-brigadas/
├── index.html              # Punto de entrada
├── css/
│   └── style.css           # Estilos globales
├── js/
│   ├── utils.js            # Constantes, estado global y helpers
│   ├── parser.js           # Carga y parseo del Excel (detección automática de layout)
│   ├── core.js             # Filtros temporales, cálculos y navegación
│   ├── views-individual.js # Vista por brigadista
│   ├── views-grupo.js      # Vista por grupo y módulos por grupo
│   ├── views-nivel.js      # Vistas BV-B, BV-M, URE, Sin clasificar
│   ├── views-organigrama.js# Reporte por organigrama con PDF formal
│   ├── informe.js          # Informe mensual y exportación PDF/Word
│   ├── tendencia.js        # Gráficos de tendencia histórica
│   ├── verificar.js        # Verificación de datos
│   └── exports.js          # Exportación PDF plan semanal e individual
└── libs/                   # Librerías externas (no modificar)
    ├── xlsx.js             # SheetJS — lectura de Excel
    ├── chart.js            # Chart.js v4 — gráficos
    ├── jspdf.js            # jsPDF — generación de PDF
    ├── html2canvas.js      # html2canvas — captura de gráficos
    └── docx.js             # docx.js — generación de Word
```

---

## Requisitos del archivo Excel

El archivo debe contener exactamente tres hojas:

| Hoja | Descripción |
|------|-------------|
| `BD_seg` | Registros de asistencia a capacitaciones |
| `BD_personal` | Datos de brigadistas con organigrama |
| `_tbl2` | Programa de capacitación (módulos, unidades, lecciones, cargas horarias) |

### Layout de BD_personal (versión con organigrama)

| Col | Campo |
|-----|-------|
| B (r[1]) | Cédula de Identidad |
| C (r[2]) | Nombre completo |
| D (r[3]) | Vicepresidencia |
| E (r[4]) | Gerencia |
| F (r[5]) | Superintendencia |
| G (r[6]) | Supervisor |
| H (r[7]) | Estado (Activo / Baja) |
| K (r[10]) | Tipo brigadista (BV-B / BV-M / URE-M / LE) |
| P (r[15]) | Grupo de trabajo |
| Q (r[16]) | Área 2 |

> El parser detecta automáticamente si el archivo usa el layout antiguo (sin columnas de organigrama) o el nuevo, manteniendo compatibilidad con ambas versiones.

---

## Cálculo de cumplimiento

El cumplimiento se calcula exclusivamente en base a **horas completadas / horas requeridas** según el tipo de brigadista, tomando la carga horaria de `_tbl2`:

| Tipo | Hrs requeridas | Lecciones |
|------|---------------|-----------|
| BV-B (Nv. Inicial) | 95 hrs | 41 |
| BV-M (Nv. Medio) | 128 hrs | 54 |
| LE (Líderes Evacuación) | 11 hrs | 6 |
| URE-M | 236 hrs | 51 |

Una lección se marca como completada cuando el brigadista tiene registrado el código de lección (formato `CV-M##-U##-L##`) con horas > 0 en BD_seg.

---

## Uso

### Local (recomendado para desarrollo)
1. Abrí la carpeta `dashboard-brigadas/` en VS Code
2. Instalá la extensión **Live Server**
3. Agregá en `.vscode/settings.json`:
   ```json
   {
     "liveServer.settings.donotInjectJs": true
   }
   ```
4. Click derecho en `index.html` → Open with Live Server

### Deploy en Netlify
1. Andá a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastrá la carpeta `dashboard-brigadas/` completa
3. La URL generada es permanente y actualizable

Para actualizar: en el dashboard de Netlify → Deploys → arrastrá la carpeta nuevamente.

---

## Notas técnicas

- **Procesamiento 100% local** — ningún dato sale del navegador del usuario
- Compatible con Chrome y Edge (se recomienda servir desde servidor local o Netlify, no desde `file://`)
- El archivo Excel puede crecer sin límite — la herramienta procesa el tamaño completo en memoria del navegador
- Las librerías en `/libs` no deben modificarse

---

## Desarrollado por

**INSEIN SRL** — Ingeniería en Seguridad Industrial  
Tarija, Bolivia
