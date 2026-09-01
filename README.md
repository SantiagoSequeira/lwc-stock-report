# lwc-stock-report
Reporte de stock personalizado en LWC con Salesforce

## Descripción

Prototipo de un componente LWC (`stockReport`) para visualizar el stock de productos
usando exclusivamente Salesforce Lightning Design System (SLDS), sin librerías
externas. Todos los datos se leen directamente desde Salesforce mediante Apex/SOQL.

## Estructura del proyecto

- `force-app/main/default/lwc/stockReport`: componente LWC principal (HTML/CSS/JS).
  - Lista/búsqueda de productos con filtros dinámicos (todos / stock bajo / por vencer).
  - Card de detalle del producto seleccionado (nombre, cantidad total, próximo vencimiento).
  - Tabla de lotes en stock con columnas Vto, Lote y Unidades.
  - Visualización simple de tendencia de stock por mes (barras SLDS, sin gráficos externos).
- `force-app/main/default/classes/StockReportController.cls`: Apex controller con las
  queries SOQL que alimentan el componente (`getProducts`, `getStockBatches`,
  `getStockTrend`) y su clase de test (`StockReportControllerTest`).
- `force-app/main/default/objects/Stock_Batch__c`: objeto personalizado que modela
  los lotes de stock (`Product__c`, `Expiration_Date__c`, `Lot_Number__c`, `Quantity__c`).
- `force-app/main/default/permissionsets/Stock_Report_Access`: permission set con el
  acceso necesario a `Stock_Batch__c` y `Product2`.

## Cómo desplegar en un scratch org

```bash
sf org create scratch -f config/project-scratch-def.json -a stock-report -d
sf project deploy start -o stock-report
sf org assign permset -n Stock_Report_Access -o stock-report
sf org open -o stock-report
```

Luego cargá productos (`Product2`) y lotes de stock (`Stock_Batch__c`) de ejemplo
desde Setup o Data Loader, y agregá el componente `stockReport` a una App Page o
Home Page desde el Lightning App Builder.

## Cómo correr los tests

```bash
npm install
npm run test:unit    # Jest para el componente LWC
npm run lint         # ESLint para el componente LWC
```

Los tests Apex se ejecutan desde el org con:

```bash
sf apex run test --class-names StockReportControllerTest --result-format human -o stock-report
```

