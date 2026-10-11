// Минимальный XLSX без зависимостей: запись (zip без сжатия) и чтение (stored/deflate)
const enc = new TextEncoder();
const dec = new TextDecoder();

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files) {
  const parts = [];
  const dir = [];
  let offset = 0;
  for (const { name, data } of files) {
    const n = enc.encode(name);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(12, 33, true); // 1 января 1980
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, n.length, true);
    parts.push(head, n, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(14, 33, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, n.length, true);
    cd.setUint32(42, offset, true);
    dir.push(cd, n);
    offset += 30 + n.length + data.length;
  }
  const size = dir.reduce((a, p) => a + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...dir, end]);
}

async function unzip(buf) {
  const v = new DataView(buf);
  let e = buf.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  const out = {};
  let p = v.getUint32(e + 16, true);
  for (let i = v.getUint16(e + 10, true); i > 0; i--) {
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nlen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = new Uint8Array(buf, start, size);
    out[name] = method === 0 ? raw
      : new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    p += 46 + nlen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return out;
}

const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const col = (i) => String.fromCharCode(65 + i);
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// Ячейка: строка, число или { v, f: 'money' | 'date' }. Первая строка листа — заголовок.
const FMT = { money: 2, date: 3 };
function cell(c, r, ci) {
  const ref = `${col(ci)}${r + 1}`;
  if (c === null || c === undefined || c === '') return '';
  if (r === 0) return `<c r="${ref}" t="inlineStr" s="1"><is><t>${xml(c)}</t></is></c>`;
  if (typeof c === 'object') return `<c r="${ref}" s="${FMT[c.f] || 0}"><v>${c.v}</v></c>`;
  if (typeof c === 'number') return `<c r="${ref}"><v>${c}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(c)}</t></is></c>`;
}

function sheetXml({ rows, cols = [] }) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS}>`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + (cols.length ? `<cols>${cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '')
    + `<sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((c, ci) => cell(c, r, ci)).join('')}</row>`).join('')}</sheetData>`
    + (rows.length > 1 ? `<autoFilter ref="A1:${col(rows[0].length - 1)}${rows.length}"/>` : '')
    + '</worksheet>';
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ${NS}>`
  + '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy hh:mm"/></numFmts>'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

// sheets: [{ name, rows, cols }]
export function writeXlsx(sheets) {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = [
    ['[Content_Types].xml', `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>'],
    ['_rels/.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${head}<workbook ${NS} xmlns:r="${REL}"><sheets>`
      + sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
      + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  return zip(files.map(([name, text]) => ({ name, data: enc.encode(text) })));
}

// → { [имя листа]: [[значения строк]] }; числа приходят числами, текст — строками
export async function readXlsx(buf) {
  const files = await unzip(buf);
  const parse = (name) => files[name] && new DOMParser().parseFromString(dec.decode(files[name]), 'application/xml');
  const shared = [...(parse('xl/sharedStrings.xml')?.getElementsByTagName('si') || [])]
    .map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
  const rels = {};
  [...parse('xl/_rels/workbook.xml.rels').getElementsByTagName('Relationship')]
    .forEach((r) => { rels[r.getAttribute('Id')] = r.getAttribute('Target').replace(/^\/?(xl\/)?/, ''); });
  const out = {};
  for (const sh of parse('xl/workbook.xml').getElementsByTagName('sheet')) {
    const id = sh.getAttribute('r:id') || sh.getAttributeNS(REL, 'id');
    const doc = parse(`xl/${rels[id]}`);
    if (!doc) continue;
    out[sh.getAttribute('name')] = [...doc.getElementsByTagName('row')].map((row) => {
      const vals = [];
      for (const c of row.getElementsByTagName('c')) {
        const ci = c.getAttribute('r').replace(/\d+/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent;
        vals[ci] = t === 's' ? shared[Number(v)]
          : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map((x) => x.textContent).join('')
            : t === 'str' || t === 'b' ? v : v === undefined ? '' : Number(v);
      }
      return vals;
    });
  }
  return out;
}
