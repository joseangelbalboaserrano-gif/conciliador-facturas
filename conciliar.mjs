import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted) quoted = false;
      else if (field === '') quoted = true;
      else throw new Error('Comillas inválidas en CSV');
    } else if (!quoted && c === ',') { row.push(field); field = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(x => x !== '')) rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Comillas sin cerrar en CSV');
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 1) throw new Error('CSV vacío');
  const headers = rows.shift().map(x => x.trim());
  if (new Set(headers).size !== headers.length) throw new Error('Columnas duplicadas');
  return rows.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`Fila ${i + 2}: columnas incorrectas`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
  });
}

export function cents(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error(`Importe inválido: ${value}`);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function money(n) {
  return `${n < 0n ? '-' : ''}${(n < 0n ? -n : n) / 100n}.${String((n < 0n ? -n : n) % 100n).padStart(2, '0')}`;
}
export function reconcile(invoices, payments) {
  const ledger = new Map(), seen = new Set(), unknown = [];
  for (const r of invoices) {
    if (!r.factura || !r.cliente || !r.moneda || !r.importe) throw new Error('Facturas: faltan factura, cliente, moneda o importe');
    if (ledger.has(r.factura)) throw new Error(`Factura duplicada: ${r.factura}`);
    ledger.set(r.factura, { ...r, total: cents(r.importe), paid: 0n });
  }
  for (const p of payments) {
    if (!p.pago || !p.factura || !p.moneda || !p.importe) throw new Error('Pagos: faltan pago, factura, moneda o importe');
    if (seen.has(p.pago)) throw new Error(`Pago duplicado: ${p.pago}`);
    seen.add(p.pago);
    const amount = cents(p.importe), invoice = ledger.get(p.factura);
    if (!invoice) { unknown.push({ ...p, amount }); continue; }
    if (invoice.moneda !== p.moneda) throw new Error(`Moneda distinta en pago ${p.pago}; no se convierten divisas`);
    invoice.paid += amount;
  }
  return { invoices: [...ledger.values()].map(r => ({ ...r, balance: r.total - r.paid,
    status: r.paid > r.total ? 'Pago de más' : r.paid === r.total ? 'Pagada' : r.paid === 0n ? 'Sin pagar' : 'Pago parcial' })), unknown };
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function report(result) {
  const totals = new Map();
  for (const r of result.invoices) {
    const t = totals.get(r.moneda) ?? { billed: 0n, paid: 0n, outstanding: 0n, excess: 0n };
    t.billed += r.total; t.paid += r.paid;
    if (r.balance > 0n) t.outstanding += r.balance; else t.excess -= r.balance;
    totals.set(r.moneda, t);
  }
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conciliación de facturas</title>
  <style>body{font:16px system-ui;background:#f4f7fb;color:#172b43;margin:0;padding:40px}main{max-width:1100px;margin:auto}h1{font-size:36px;letter-spacing:-1px}small{color:#52677f}.cards{display:flex;gap:14px;flex-wrap:wrap}.card{background:white;padding:22px;border-radius:14px;flex:1;min-width:170px}.card strong{display:block;font-size:26px;margin-top:8px}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;margin:20px 0}td,th{text-align:left;padding:15px;border-bottom:1px solid #e6edf4}th{font-size:13px;color:#52677f}h2{margin-top:38px}.note{padding:18px;background:#fff0d4;border-radius:10px}.wrap{overflow:auto}button{border:0;background:#1252b5;color:white;padding:12px 18px;border-radius:8px;cursor:pointer}@media print{button{display:none}body{background:white;padding:0}} </style>
  <main><small>JOSÉ ÁNGEL AUTOMATIZA · REPORTE LOCAL</small><h1>Facturas y pagos, conciliados.</h1><p>Coincidencia exacta por referencia de factura. Los importes se calculan en centavos y se separan por moneda.</p>
  ${[...totals].map(([currency,t]) => `<h2>${esc(currency)}</h2><div class="cards">${[['Facturado',t.billed],['Pagos identificados',t.paid],['Pendiente de cobrar',t.outstanding],['Pagos de más',t.excess]].map(([label,value])=>`<div class="card">${label}<strong>${money(value)}</strong></div>`).join('')}</div>`).join('')}
  <h2>Detalle de facturas</h2><div class="wrap"><table><thead><tr>${['Factura','Cliente','Moneda','Facturado','Pagado','Saldo','Estado'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${result.invoices.map(r=>`<tr>${[r.factura,r.cliente,r.moneda,money(r.total),money(r.paid),money(r.balance),r.status].map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <h2>Pagos sin factura reconocida (${result.unknown.length})</h2>${result.unknown.length ? `<div class="note">Requieren revisión; no se incluyen en los totales de facturas.</div><div class="wrap"><table><tr><th>Pago</th><th>Referencia</th><th>Moneda</th><th>Importe</th></tr>${result.unknown.map(p=>`<tr>${[p.pago,p.factura,p.moneda,money(p.amount)].map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div>` : '<p>No hay referencias desconocidas.</p>'}
  <p><small>Este reporte no valida depósitos bancarios ni sustituye la revisión contable. No realiza transferencias. No convierte divisas.</small></p><button onclick="window.print()">Imprimir / guardar PDF</button></main></html>`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [invoicePath, paymentPath, outputPath = 'reporte.html'] = process.argv.slice(2);
    if (!invoicePath || !paymentPath) throw new Error('Uso: node conciliar.mjs facturas.csv pagos.csv reporte.html');
    const result = reconcile(parseCSV(readFileSync(invoicePath,'utf8')), parseCSV(readFileSync(paymentPath,'utf8')));
    writeFileSync(outputPath, report(result));
    console.log(`Reporte creado: ${outputPath}. ${result.invoices.length} facturas; ${result.unknown.length} pagos sin referencia reconocida.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
