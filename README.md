# Conciliador de facturas y pagos

Muestra funcional de José Ángel automatiza. Todos los datos de demostración son ficticios.

Cruza dos archivos CSV por referencia exacta de factura y produce un reporte HTML que se abre en un navegador. Procesamiento local, sin API ni suscripción. Requiere Node.js.

```powershell
node conciliar.mjs facturas-demo.csv pagos-demo.csv reporte-demo.html
```

Facturas: columnas `factura,cliente,moneda,importe`. Pagos: `pago,factura,moneda,importe`. Separador coma; importes sin separador de miles, con punto decimal y hasta dos decimales. Se admiten campos entre comillas. Las referencias son sensibles a mayúsculas. Los identificadores de factura y pago deben ser únicos.

Detecta facturas sin pagar, pagos parciales, pagos completos, pagos de más y referencias desconocidas. Detiene el proceso ante duplicados, importes inválidos o pagos cuya moneda difiere de la factura. No asigna automáticamente referencias aproximadas, convierte monedas, maneja devoluciones o valida movimientos bancarios. Los pagos desconocidos se muestran aparte.

## Oferta comercial propuesta

Adaptación a los archivos de un cliente: US$125 por proyecto. Dos proyectos sumarían US$250 brutos; para alcanzar US$200 netos hay que confirmar antes comisiones y gastos. El precio es una propuesta, no una venta realizada.

Incluye: adaptar encabezados de dos archivos, configurar una regla exacta de referencia, reporte HTML, instrucciones y una ronda de correcciones. Primero se revisa una muestra anonimizada para confirmar el alcance. Otros formatos, conexiones bancarias e integraciones se presupuestan aparte.

Texto para una propuesta, todavía no enviado:

> Puedo automatizar el cruce de tus facturas con tus pagos y entregarte un reporte de pendientes, pagos parciales, pagos de más y referencias sin identificar. Tengo una demostración local con datos ficticios. Propongo US$125 para adaptar dos archivos CSV de estructura fija, incluir instrucciones y una ronda de correcciones. Antes de acordar el trabajo revisaré una muestra anonimizada. Uso herramientas de IA y verifico los cálculos con pruebas automatizadas.

No hay clientes, ventas ni recompensas cobradas asociadas a esta muestra.
