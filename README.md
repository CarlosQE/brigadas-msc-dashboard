# Dashboard · Brigadas Voluntarias MSC

Herramienta de visualización y reporte del programa de capacitación para brigadistas voluntarios de Mina San Cristóbal.

## Características

- Carga directa de planilla Excel (.xlsx) — procesamiento 100% local
- Vista individual por brigadista (búsqueda por CI o nombre)
- Vista por grupos (área, grupo de trabajo)
- Programa anual por área con desglose BV-M
- Análisis de nivel inicial con distribución de notas
- Tendencia temporal histórica (2024–2026)
- Exportación a PDF
- Sin backend, sin servidor — desplegable en GitHub Pages

## Uso

1. Abrí `index.html` en cualquier navegador moderno
2. Cargá la planilla de capacitación (.xlsx)
3. Navegá entre las secciones y generá reportes PDF

## Verificación de datos

Incluye `test_suite.py` para validar que la herramienta interpreta correctamente los datos del Excel.

\\\ash
pip install openpyxl
python test_suite.py
\\\

## Stack

HTML · CSS · JavaScript · SheetJS · Chart.js · jsPDF · html2canvas

## Versión

v1.0.0 — Funcionalidad core validada
