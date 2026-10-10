// Разбор банковской выписки (Т-Банк: PDF «Справка о движении средств» и CSV)
const RULES = [
  [/vernyj|верный|pyatero|пятероч|perekrestok|перекрест|magnit|магнит|lenta|лента|dixy|дикси|vkusvill|вкусвилл|krasnoe|красное|myasno|мясн|produkty|продукт|miratorg|ashan|auchan|okey|окей|5ka|spar|monetka|da s71|mag \d/i, 'groceries'],
  [/cafe|кафе|kofe|coffee|кофе|stolovaya|столов|restoran|ресторан|bar |pizza|пицц|burger|бургер|sushi|суши|mangal|shaurma|шаурм|kfc|vkusno|tasty|donuts|bakery|pekarn|пекарн/i, 'cafe'],
  [/\bvv_\d|vkusvill|вкусвилл/i, 'groceries'],
  [/delivery club|яндекс еда|yandex.*eda|samokat|самокат|lavka|лавка|dostavka|доставка|ozon fresh/i, 'delivery'],
  [/yandex.*go|taxi|такси|uber|citymobil|ситимобил|maksim/i, 'taxi'],
  [/metro.*proezd|troika|тройка|подорожник|transport|транспорт|rzd|ржд|avtobus|автобус|billet|билет/i, 'transport'],
  [/azs|заправ|lukoil|лукойл|gazprom|газпром|rosneft|роснефт|tatneft|shell|benzin|бензин|parking|парков|avtomoyka|автомойк/i, 'car'],
  [/apteka|аптека|pharm|farma|clinic|клиник|med|мед |стоматол|stomat|invitro|gemotest|analiz/i, 'health'],
  [/letoile|лэтуаль|rive gauche|подружка|magnit cosmetic|cosmetic|космет|barbershop|salon|салон|parikmaher|nail/i, 'beauty'],
  [/wildberries|ozon|lamoda|zara|hm |uniqlo|sportmaster|спортмастер|odezhda|обув|shoes|detsk/i, 'clothes'],
  [/dns|citilink|mvideo|eldorado|re:store|apple|samsung|technika|техник/i, 'tech'],
  [/fitness|фитнес|sport|спорт|basseyn|бассейн|yoga|gym/i, 'sport'],
  [/cinema|синема|кино|kino|teatr|театр|concert|концерт|igr|steam|playstation|xbox|bowling|park/i, 'fun'],
  [/netflix|spotify|yandex plus|плюс|podpisk|подписк|vpn|icloud|google|youtube|kinopoisk|кинопоиск|ivi|okko/i, 'subs'],
  [/mts|мтс|megafon|мегафон|beeline|билайн|tele2|теле2|svyaz|связь|internet|интернет|rostelecom/i, 'mobile'],
  [/zhku|жку|oeirc|еирц|kommunal|коммунал|energosbyt|энергосб|gaz |vodokanal|kvartplata|arenda|аренд|ipoteka/i, 'home'],
  [/zoo|зоо|vetklinik|ветклин|petshop|korm/i, 'pets'],
  [/book|книг|chitay|читай|labirint|kurs|курс|school|школ|university|obuchen|обучен|skillbox|netology/i, 'education'],
  [/igrushk|игрушк|detmir|детский мир|kids/i, 'kids'],
  [/fix price|fixprice|leroy|леруа|obi|hoff|ikea|tovar|hozto|bytov/i, 'household'],
  [/подарк|podarok|cvety|цветы|flower/i, 'gifts'],
  [/aviasales|aeroflot|аэрофлот|pobeda|победа|tutu|ostrovok|booking|otel|отел|hotel|turag/i, 'travel'],
];

const SKIP = /внутренний перевод|перевод себе|перевод с договора|пополнение|кэшбэк|кешбэк|возврат средств|банковский перевод|проценты на остаток/i;

export function categorize(desc) {
  const d = desc.toLowerCase();
  if (/внешний перевод|перевод по номеру|sbp|сбп/.test(d)) return 'transfers';
  if (/снятие наличных/.test(d)) return 'other';
  for (const [re, cat] of RULES) if (re.test(d)) return cat;
  return 'other';
}

// «Оплата в VERNYJ 1513 Uzlovaya RUS» -> «VERNYJ 1513»
export function merchant(desc) {
  let s = desc.replace(/^оплата в\s*/i, '').replace(/^операция в других.*$/i, 'Другой банк')
    .replace(/^оплата услуг\s*/i, 'Услуги ').replace(/\s+(RUS|MOSCOW)\b/gi, '').trim();
  s = s.replace(/\s{2,}/g, ' ');
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

const num = (s) => Math.round(parseFloat(s.replace(/[\s  ]/g, '').replace(',', '.')) * 100);
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); };

function makeItem(dateStr, timeStr, amount, desc) {
  const [d, m, y] = dateStr.split('.').map(Number);
  const [hh = 12, mm = 0] = (timeStr || '').split(':').map(Number);
  const ts = new Date(y, m - 1, d, hh, mm).getTime();
  const note = merchant(desc);
  return { id: `imp${hash(`${ts}|${amount}|${note}`)}`, amount: -amount, category: categorize(desc), note, ts };
}

/* ---------- PDF ---------- */
function linesFromItems(items) {
  const rows = new Map();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const y = Math.round(it.transform[5] / 3);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x: it.transform[4], s: it.str });
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s{2,}/g, ' ').trim());
}

const ROW = /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+([+-][\d\s  ]*[\d][.,]\d{2})\s*₽\s+([+-][\d\s  ]*[\d][.,]\d{2})\s*₽\s*(.*?)\s*(?:\d{4}|—)?$/;
const TIME = /^(\d{2}:\d{2})(\s+\d{2}:\d{2})?\s*/;

function parseLines(lines) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const amount = num(cur.amount);
    const desc = cur.desc.replace(/\s*\b\d{4}\b\s*$/, '').replace(/\s+—\s*$/, '').trim();
    if (amount < 0 && !SKIP.test(desc)) out.push(makeItem(cur.date, cur.time, amount, desc));
    cur = null;
  };
  for (const line of lines) {
    const m = ROW.exec(line);
    if (m) {
      flush();
      cur = { date: m[1], amount: m[3], desc: m[5] || '', time: '' };
      continue;
    }
    if (!cur) continue;
    if (/^(итого|дата и время|движение средств|сумма в валюте)/i.test(line)) { flush(); continue; }
    let rest = line;
    const t = TIME.exec(rest);
    if (t) { cur.time ||= t[1]; rest = rest.slice(t[0].length); }
    rest = rest.replace(/\b\d{4}\b\s*$/, '').trim();
    if (rest) cur.desc += ` ${rest}`;
  }
  flush();
  return out;
}

export async function parsePdf(file) {
  const pdfjs = await import('./vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    lines.push(...linesFromItems((await page.getTextContent()).items));
  }
  return parseLines(lines);
}

/* ---------- CSV ---------- */
function splitCsv(text) {
  const delim = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseCsv(text) {
  const rows = splitCsv(text);
  const head = rows[0].map((h) => h.toLowerCase().trim());
  const col = (...names) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = col('дата операции', 'дата платежа', 'дата');
  const iAmount = col('сумма операции', 'сумма платежа', 'сумма');
  const iDesc = col('описание', 'назначение', 'категория');
  if (iDate < 0 || iAmount < 0) throw new Error('Не найдены колонки с датой и суммой');
  const out = [];
  for (const r of rows.slice(1)) {
    const dm = /(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?/.exec(r[iDate] || '');
    if (!dm) continue;
    const amount = num(r[iAmount] || '0');
    const desc = (r[iDesc] || '').trim();
    if (!Number.isFinite(amount) || amount >= 0 || SKIP.test(desc)) continue;
    out.push(makeItem(`${dm[1]}.${dm[2]}.${dm[3]}`, dm[4], amount, desc));
  }
  return out;
}

export async function parseStatement(file) {
  const items = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await parsePdf(file);
  const seen = new Set();
  return items.filter((i) => !seen.has(i.id) && seen.add(i.id)).sort((a, b) => b.ts - a.ts);
}

export const _test = { parseLines };
