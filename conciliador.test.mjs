import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,cents,money,reconcile,report} from './conciliar.mjs';
const invoices = [{factura:'F1',cliente:'Cliente',moneda:'MXN',importe:'0.30'}];
test('suma exacta de centavos y pagos parciales',()=>{
 const r=reconcile(invoices,[{pago:'P1',factura:'F1',moneda:'MXN',importe:'0.10'},{pago:'P2',factura:'F1',moneda:'MXN',importe:'0.20'}]);
 assert.equal(r.invoices[0].status,'Pagada'); assert.equal(r.invoices[0].balance,0n);
});
test('detecta pago de más y separa referencia desconocida',()=>{
 const r=reconcile(invoices,[{pago:'P1',factura:'F1',moneda:'MXN',importe:'0.40'},{pago:'P2',factura:'X',moneda:'USD',importe:'900'}]);
 assert.equal(r.invoices[0].status,'Pago de más'); assert.equal(money(r.invoices[0].balance),'-0.10'); assert.equal(r.unknown.length,1);
});
test('rechaza duplicados y monedas distintas',()=>{
 const p={pago:'P1',factura:'F1',moneda:'MXN',importe:'0.10'};
 assert.throws(()=>reconcile([...invoices,...invoices],[]),/duplicada/);
 assert.throws(()=>reconcile(invoices,[p,p]),/duplicado/);
 assert.throws(()=>reconcile(invoices,[{...p,moneda:'USD'}]),/Moneda distinta/);
});
test('CSV maneja comillas, comas, nuevas líneas y BOM',()=>{
 assert.deepEqual(parseCSV('\uFEFFid,nombre\r\n1,"Taller, \"\"Norte\"\"\nSucursal"\r\n'),[{id:'1',nombre:'Taller, "Norte"\nSucursal'}]);
 assert.throws(()=>parseCSV('id,id\n1,2'),/duplicadas/);
 assert.throws(()=>parseCSV('id,x\n1'),/columnas incorrectas/);
 assert.throws(()=>parseCSV('id,x\n1,"a'),/sin cerrar/);
});
test('no admite importes ambiguos ni precisión que deba redondearse',()=>{
 for(const value of ['-1','1,000','NaN','1.001','1e2','']) assert.throws(()=>cents(value));
 assert.equal(cents('9007199254740993.01'),900719925474099301n);
});
test('escapa HTML del cliente para evitar scripts en el reporte',()=>{
 const html=report(reconcile([{...invoices[0],cliente:'<script>alert(1)</script>'}],[]));
 assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
});

