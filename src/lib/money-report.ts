import ExcelJS from 'exceljs';
import * as db from './db';
import { isEmail } from './google';
import { mailReady, sendMail } from './mail';
import { categoryOf, daysIn, eur, kindOf, milanDay, monthOf, shiftMonth, type Expense } from './money';
import { getBudget, listExpenses } from './money-store';
import { jellyTake } from './money-take';

/**
 * The monthly sheet: a proper Excel workbook of one month of Soldi (every spend, the budget by
 * category, money in and Jelly's take), emailed as Jelly on the 1st of each month and whenever Saani
 * presses the button. The list of who gets it lives in the doc store; the first time it's read it
 * starts from REPORT_EMAILS (comma separated).
 */
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const round2 = (n: number) => Math.round(n * 100) / 100;
const MAX_RECIPIENTS = 10;
const MANUAL_PER_DAY = 5;

/* ---------- who gets it ---------- */
type Recipients = { id: 'report-recipients'; createdAt: string; emails: string[] };
export const cleanEmails = (list: unknown): string[] =>
  [...new Set((Array.isArray(list) ? list : []).filter(isEmail).map((e) => e.trim().toLowerCase()))].slice(0, MAX_RECIPIENTS);

export async function getRecipients(): Promise<string[]> {
  const saved = await db.get<Recipients>('money', 'report-recipients');
  if (saved) return saved.emails;
  return cleanEmails((process.env.REPORT_EMAILS ?? '').split(','));
}
export async function setRecipients(emails: string[]) {
  const list = cleanEmails(emails);
  await db.put<Recipients>('money', { id: 'report-recipients', createdAt: new Date().toISOString(), emails: list });
  return list;
}

/* ---------- what was sent, and when ---------- */
type State = { id: 'money-report'; createdAt: string; sent: Record<string, string>; manual: { day: string; count: number } };
const getState = async (): Promise<State> => (await db.get<State>('state', 'money-report')) ?? { id: 'money-report', createdAt: new Date().toISOString(), sent: {}, manual: { day: '', count: 0 } };
export const lastSent = async () => (await getState()).sent;
async function markSent(month: string) {
  const s = await getState();
  await db.put<State>('state', { ...s, sent: { ...s.sent, [month]: new Date().toISOString() } });
}
/** Counts one button press for today; false once she's pressed it too often. */
export async function manualAllowed(today = milanDay()): Promise<boolean> {
  const s = await getState();
  const count = s.manual.day === today ? s.manual.count : 0;
  if (count >= MANUAL_PER_DAY) return false;
  await db.put<State>('state', { ...s, manual: { day: today, count: count + 1 } });
  return true;
}

/* ---------- the data ---------- */
export async function buildReport(month: string, today = milanDay()) {
  const [all, budget] = await Promise.all([listExpenses(), getBudget()]);
  const { f, take } = await jellyTake(all, budget, month, today);
  const inMonth = all.filter((x) => monthOf(x.day) === month).sort((a, b) => (a.day === b.day ? (a.createdAt < b.createdAt ? -1 : 1) : a.day < b.day ? -1 : 1));
  return { month, today, budget, f, take, spends: inMonth.filter((x) => kindOf(x) === 'out'), ins: inMonth.filter((x) => kindOf(x) === 'in') };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;

/* ---------- the workbook ---------- */
const BERRY = 'FFB2305F';
const BURGUNDY = 'FF6B1E3A';
const ROSE = 'FFF4A6C0';
const BLUSH = 'FFFBE3E8';
const PAPER = 'FFFFF8F3';
const INK = 'FF3A2A33';
const MUTED = 'FF8A6A77';
const LINE = 'FFF0D3DD';
const EUR_FMT = '"€"#,##0.00';
const INR_FMT = '"₹"#,##0';
const FONT = 'Calibri';

const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
/** A colour mixed with white, for soft cell backgrounds ("#2fa97c" -> a pale green). */
const tint = (hex: string, amount = 0.82) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `FF${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};
const colName = (n: number) => String.fromCharCode(64 + n);
const thin = { style: 'thin' as const, color: { argb: LINE } };
const box = { top: thin, bottom: thin, left: thin, right: thin };

/** The coloured banner across the top of every tab. */
function banner(ws: ExcelJS.Worksheet, span: number, title: string, sub: string) {
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= span; c++) ws.getCell(r, c).fill = fill(BURGUNDY);
  ws.mergeCells(1, 1, 1, span);
  ws.mergeCells(2, 1, 2, span);
  ws.mergeCells(3, 1, 3, span);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: FONT, size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
  t.alignment = { vertical: 'middle', indent: 1 };
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { name: FONT, size: 12, color: { argb: ROSE } };
  s.alignment = { vertical: 'middle', indent: 1 };
  const j = ws.getCell(3, 1);
  j.value = 'Prepared by Jelly 🪼 for Saani’s Atelier';
  j.font = { name: FONT, size: 9, italic: true, color: { argb: 'FFE9C4D2' } };
  j.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 36;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 16;
  for (let c = 1; c <= span; c++) ws.getCell(4, c).fill = fill(BERRY);
  ws.getRow(4).height = 4;
}

function tableHead(ws: ExcelJS.Worksheet, row: number, labels: string[], align: ('left' | 'center' | 'right')[] = []) {
  labels.forEach((l, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = l;
    c.font = { name: FONT, bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } };
    c.fill = fill(BERRY);
    c.alignment = { vertical: 'middle', horizontal: align[i] ?? (i === 0 ? 'left' : 'center'), wrapText: true, indent: i === 0 ? 1 : 0 };
    c.border = { bottom: { style: 'medium', color: { argb: BURGUNDY } } };
  });
  ws.getRow(row).height = 26;
}
/** Zebra, hairlines and a comfortable row height for one body row. */
function bodyRow(ws: ExcelJS.Worksheet, row: number, cols: number, i: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.border = box;
    cell.font = { name: FONT, size: 10.5, color: { argb: INK }, ...(cell.font ?? {}) };
    if (i % 2) cell.fill = fill(PAPER);
    cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
  }
  ws.getRow(row).height = 20;
}
function totalRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { name: FONT, bold: true, size: 11, color: { argb: BURGUNDY } };
    cell.fill = fill(BLUSH);
    cell.border = { top: { style: 'medium', color: { argb: BERRY } }, bottom: { style: 'double', color: { argb: BERRY } } };
    cell.alignment = { vertical: 'middle', ...(cell.alignment ?? {}) };
  }
  ws.getRow(row).height = 24;
}
const widths = (ws: ExcelJS.Worksheet, w: number[]) => w.forEach((n, i) => (ws.getColumn(i + 1).width = n));
function setup(ws: ExcelJS.Worksheet, freezeRow = 0, landscape = true) {
  ws.views = [{ state: freezeRow ? 'frozen' : 'normal', ySplit: freezeRow, showGridLines: false, zoomScale: 110 } as ExcelJS.WorksheetView];
  ws.pageSetup = { orientation: landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } };
  ws.headerFooter = { oddFooter: '&L&"Calibri,Italic"&9Saani’s Soldi · made by Jelly&R&"Calibri"&9Page &P of &N' };
}
const bar = (color: string) => ({ type: 'dataBar', gradient: false, showValue: true, minLength: 0, maxLength: 100, cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: color } }) as unknown as ExcelJS.ConditionalFormattingRule;
const section = (ws: ExcelJS.Worksheet, row: number, span: number, text: string) => {
  ws.mergeCells(row, 1, row, span);
  const c = ws.getCell(row, 1);
  c.value = text.toUpperCase();
  c.font = { name: FONT, size: 11, bold: true, color: { argb: BERRY } };
  c.alignment = { vertical: 'bottom', indent: 1 };
  for (let k = 1; k <= span; k++) ws.getCell(row, k).border = { bottom: { style: 'medium', color: { argb: ROSE } } };
  ws.getRow(row).height = 26;
};

export async function renderWorkbook(r: Report): Promise<Buffer> {
  const s = r.f.summary;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jelly 🪼';
  wb.company = 'Saani’s Atelier';
  wb.title = `Saani’s Soldi · ${monthLabel(r.month)}`;
  wb.subject = 'Monthly spending, budget and Jelly’s take';
  wb.created = new Date();
  const label = monthLabel(r.month);
  const sub = `${label}${r.f.current ? ' · the month so far' : ''}`;
  const nCat = s.byCat.length;
  const spendLast = 4 + Math.max(r.spends.length, 1); // last data row on Spends (rows start at 5)
  const SP = (col: string) => `Spends!$${col}$5:$${col}$${spendLast}`;

  /* ===== Summary (dashboard) ===== */
  const sm = wb.addWorksheet('Summary', { properties: { tabColor: { argb: BERRY } } });
  widths(sm, Array(12).fill(11.5));
  banner(sm, 12, 'Saani’s Soldi', sub);
  setup(sm);
  const cards: { label: string; value: ExcelJS.CellValue; fmt?: string; note: string; color: string }[] = [
    { label: 'SPENT', value: s.spent, fmt: EUR_FMT, note: `${s.count} ${s.count === 1 ? 'spend' : 'spends'} · ₹${Math.round(s.spentInr).toLocaleString('en-IN')}`, color: BERRY },
    { label: s.left !== null && s.left < 0 ? 'OVER BUDGET BY' : 'LEFT OF BUDGET', value: s.left === null ? 'no budget' : Math.abs(s.left), fmt: s.left === null ? undefined : EUR_FMT, note: s.budget ? `of a ${eur(s.budget)} budget` : 'set one in Soldi', color: 'FF2FA97C' },
    { label: 'MONEY IN', value: s.inEur, fmt: EUR_FMT, note: `${s.inCount} ${s.inCount === 1 ? 'entry' : 'entries'}`, color: 'FF3A7FD0' },
    { label: 'IN MINUS SPENT', value: s.net, fmt: EUR_FMT, note: r.f.projected !== null ? `month end ~${eur(r.f.projected)}` : r.f.beforeTotal ? `last month: ${eur(r.f.beforeTotal)}` : ' ', color: 'FFE6A21A' },
  ];
  sm.getRow(5).height = 10;
  cards.forEach((c, k) => {
    const c0 = 1 + k * 3;
    const c1 = c0 + 2;
    for (let rr = 6; rr <= 9; rr++) for (let cc = c0; cc <= c1; cc++) sm.getCell(rr, cc).fill = fill('FFFFFFFF');
    sm.mergeCells(6, c0, 6, c1);
    sm.mergeCells(7, c0, 8, c1);
    sm.mergeCells(9, c0, 9, c1);
    const l = sm.getCell(6, c0);
    l.value = c.label;
    l.font = { name: FONT, size: 9, bold: true, color: { argb: MUTED } };
    l.alignment = { horizontal: 'left', vertical: 'bottom', indent: 1 };
    const v = sm.getCell(7, c0);
    v.value = c.value;
    if (c.fmt) v.numFmt = c.fmt;
    v.font = { name: FONT, size: 22, bold: true, color: { argb: BURGUNDY } };
    v.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    const n = sm.getCell(9, c0);
    n.value = c.note;
    n.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } };
    n.alignment = { horizontal: 'left', vertical: 'top', indent: 1 };
    for (let cc = c0; cc <= c1; cc++) {
      sm.getCell(6, cc).border = { top: { style: 'thick', color: { argb: c.color } } };
      sm.getCell(9, cc).border = { bottom: thin };
    }
    for (let rr = 6; rr <= 9; rr++) {
      const left = sm.getCell(rr, c0);
      left.border = { ...left.border, left: thin };
      const right = sm.getCell(rr, c1);
      right.border = { ...right.border, right: thin };
    }
  });
  sm.getRow(6).height = 22;
  sm.getRow(7).height = 20;
  sm.getRow(8).height = 20;
  sm.getRow(9).height = 20;

  // budget progress, worked out live from the By category tab
  const tot = 5 + nCat; // total row on By category
  sm.getRow(10).height = 12;
  section(sm, 11, 12, 'Budget');
  sm.mergeCells(12, 1, 12, 3);
  sm.getCell(12, 1).value = s.budget ? `${eur(s.spent)} of ${eur(s.budget)} used` : 'No monthly budget set yet';
  sm.getCell(12, 1).font = { name: FONT, size: 11, bold: true, color: { argb: INK } };
  sm.getCell(12, 1).alignment = { vertical: 'middle', indent: 1 };
  sm.mergeCells(12, 4, 12, 12);
  const pct = s.budget ? Math.min(1, s.spent / s.budget) : 0;
  const cells = 36;
  sm.getCell(12, 4).value = {
    formula: `IF('By category'!C${tot}>0,REPT("█",ROUND(MIN(1,'By category'!B${tot}/'By category'!C${tot})*${cells},0))&REPT("░",${cells}-ROUND(MIN(1,'By category'!B${tot}/'By category'!C${tot})*${cells},0))&"  "&TEXT('By category'!B${tot}/'By category'!C${tot},"0%"),"")`,
    result: s.budget ? `${'█'.repeat(Math.round(pct * cells))}${'░'.repeat(cells - Math.round(pct * cells))}  ${Math.round((s.spent / s.budget) * 100)}%` : '',
  };
  sm.getCell(12, 4).font = { name: FONT, size: 12, color: { argb: s.budget && s.spent > s.budget ? 'FFC8364F' : BERRY } };
  sm.getCell(12, 4).alignment = { vertical: 'middle', horizontal: 'left' };
  sm.getRow(12).height = 26;

  // where it went: the top categories, with bars
  sm.getRow(13).height = 12;
  section(sm, 14, 12, 'Where it went');
  const top = s.byCat.filter((c) => c.eur > 0).slice(0, 6);
  top.forEach((c, i) => {
    const row = 15 + i;
    const src = 5 + s.byCat.findIndex((x) => x.id === c.id);
    sm.mergeCells(row, 1, row, 4);
    sm.getCell(row, 1).value = { formula: `'By category'!A${src}`, result: c.label };
    sm.getCell(row, 1).alignment = { vertical: 'middle', indent: 1 };
    sm.mergeCells(row, 5, row, 6);
    sm.getCell(row, 5).value = { formula: `'By category'!B${src}`, result: c.eur };
    sm.getCell(row, 5).numFmt = EUR_FMT;
    sm.getCell(row, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    sm.getCell(row, 7).value = { formula: `'By category'!G${src}`, result: s.spent ? c.eur / s.spent : 0 };
    sm.getCell(row, 7).numFmt = '0%';
    sm.getCell(row, 7).alignment = { horizontal: 'center', vertical: 'middle' };
    sm.mergeCells(row, 8, row, 12);
    sm.getCell(row, 8).value = { formula: `REPT("█",ROUND(G${row}*40,0))`, result: '█'.repeat(Math.round((s.spent ? c.eur / s.spent : 0) * 40)) };
    sm.getCell(row, 8).font = { name: FONT, size: 11, color: { argb: `FF${c.color.slice(1).toUpperCase()}` } };
    sm.getCell(row, 8).alignment = { vertical: 'middle', horizontal: 'left' };
    for (const cc of [1, 5, 7]) sm.getCell(row, cc).font = { name: FONT, size: 10.5, color: { argb: INK }, bold: cc === 5 };
    sm.getRow(row).height = 20;
  });
  if (!top.length) {
    sm.mergeCells(15, 1, 15, 12);
    sm.getCell(15, 1).value = 'Nothing spent yet this month.';
    sm.getCell(15, 1).font = { name: FONT, italic: true, color: { argb: MUTED } };
    sm.getCell(15, 1).alignment = { indent: 1 };
  }

  // Jelly's take
  const jr = 15 + Math.max(top.length, 1) + 1;
  section(sm, jr, 12, 'Jelly’s take');
  sm.mergeCells(jr + 1, 1, jr + 1, 12);
  sm.getCell(jr + 1, 1).value = `“${r.take.headline}”`;
  sm.getCell(jr + 1, 1).font = { name: 'Georgia', size: 13, italic: true, color: { argb: BURGUNDY } };
  sm.getCell(jr + 1, 1).alignment = { wrapText: true, vertical: 'middle', indent: 1 };
  for (let cc = 1; cc <= 12; cc++) sm.getCell(jr + 1, cc).fill = fill(BLUSH);
  sm.getRow(jr + 1).height = 38;
  r.take.tips.slice(0, 4).forEach((t, i) => {
    const row = jr + 2 + i;
    sm.mergeCells(row, 1, row, 12);
    sm.getCell(row, 1).value = `${t.icon}  ${t.text}`;
    sm.getCell(row, 1).font = { name: FONT, size: 11, color: { argb: INK } };
    sm.getCell(row, 1).alignment = { wrapText: true, vertical: 'middle', indent: 1 };
    sm.getRow(row).height = Math.max(22, Math.ceil(t.text.length / 105) * 17 + 6);
  });
  const tail = jr + 2 + Math.min(r.take.tips.length, 4) + 1;
  sm.mergeCells(tail, 1, tail, 12);
  sm.getCell(tail, 1).value = `${r.take.via === 'jelly' ? 'Written by Jelly' : 'Quick tips (Jelly was resting)'} · other tabs: Spends, By category, Daily, Money in`;
  sm.getCell(tail, 1).font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } };
  sm.getCell(tail, 1).alignment = { indent: 1 };

  /* ===== Spends ===== */
  const sp = wb.addWorksheet('Spends', { properties: { tabColor: { argb: ROSE } } });
  widths(sp, [14, 7, 20, 34, 12, 8, 12, 12, 13, 11]);
  banner(sp, 10, 'Every spend', `${sub} · newest at the bottom`);
  tableHead(sp, 4, ['Date', 'Day', 'Category', 'Note', 'Amount', 'Cur.', '€', '₹', 'Rate (₹/€)', 'Logged via'], ['left', 'center', 'left', 'left', 'right', 'center', 'right', 'right', 'right', 'center']);
  r.spends.forEach((x: Expense, i) => {
    const row = 5 + i;
    const c = categoryOf(x.category, 'out');
    sp.getCell(row, 1).value = new Date(`${x.day}T12:00:00Z`);
    sp.getCell(row, 2).value = { formula: `TEXT(A${row},"ddd")`, result: new Date(`${x.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) };
    sp.getCell(row, 3).value = c.label;
    sp.getCell(row, 4).value = x.note || '';
    sp.getCell(row, 5).value = x.amount;
    sp.getCell(row, 6).value = x.currency;
    sp.getCell(row, 7).value = x.eur;
    sp.getCell(row, 8).value = x.inr;
    sp.getCell(row, 9).value = x.rate;
    sp.getCell(row, 10).value = x.source === 'whatsapp' ? 'WhatsApp' : x.source === 'jelly' ? 'Jelly' : 'by hand';
    bodyRow(sp, row, 10, i);
    sp.getCell(row, 1).numFmt = 'dd mmm yyyy';
    sp.getCell(row, 5).numFmt = '#,##0.00';
    sp.getCell(row, 7).numFmt = EUR_FMT;
    sp.getCell(row, 8).numFmt = INR_FMT;
    sp.getCell(row, 9).numFmt = '0.00';
    for (const cc of [2, 6, 10]) sp.getCell(row, cc).alignment = { horizontal: 'center', vertical: 'middle' };
    sp.getCell(row, 3).fill = fill(tint(c.color));
    sp.getCell(row, 3).font = { name: FONT, size: 10.5, bold: true, color: { argb: INK } };
    sp.getCell(row, 7).font = { name: FONT, size: 10.5, bold: true, color: { argb: BURGUNDY } };
  });
  const tr = 5 + r.spends.length;
  sp.getCell(tr, 1).value = 'Total';
  sp.getCell(tr, 7).value = { formula: `SUM(G5:G${Math.max(tr - 1, 5)})`, result: s.spent };
  sp.getCell(tr, 7).numFmt = EUR_FMT;
  sp.getCell(tr, 8).value = { formula: `SUM(H5:H${Math.max(tr - 1, 5)})`, result: s.spentInr };
  sp.getCell(tr, 8).numFmt = INR_FMT;
  totalRow(sp, tr, 10);
  if (r.spends.length) {
    sp.autoFilter = { from: 'A4', to: `J${tr - 1}` };
    sp.addConditionalFormatting({ ref: `G5:G${tr - 1}`, rules: [bar('FFF4A6C0')] });
  }
  setup(sp, 4);

  /* ===== By category ===== */
  const bc = wb.addWorksheet('By category', { properties: { tabColor: { argb: 'FFCDB4F0' } } });
  widths(bc, [26, 14, 15, 13, 15, 16, 13]);
  banner(bc, 7, 'Budget by category', `${sub} · spent adds up live from the Spends tab, so change a cap and the rest follows`);
  tableHead(bc, 4, ['Category', 'Spent (€)', 'Monthly cap (€)', '% of cap', 'Left of cap (€)', 'Status', 'Share of spending'], ['left', 'right', 'right', 'center', 'right', 'center', 'center']);
  s.byCat.forEach((c, i) => {
    const n = 5 + i;
    bc.getCell(n, 1).value = `${c.icon}  ${c.label}`;
    bc.getCell(n, 2).value = { formula: `SUMIFS(${SP('G')},${SP('C')},"${c.label}")`, result: c.eur };
    bc.getCell(n, 3).value = c.cap ?? null;
    bc.getCell(n, 4).value = { formula: `IF(ISNUMBER(C${n}),B${n}/C${n},"")`, result: c.cap ? round2(c.eur / c.cap) : '' };
    bc.getCell(n, 5).value = { formula: `IF(ISNUMBER(C${n}),C${n}-B${n},"")`, result: c.cap ? round2(c.cap - c.eur) : '' };
    bc.getCell(n, 6).value = { formula: `IF(ISNUMBER(C${n}),IF(B${n}>C${n},"⚠ Over cap",IF(B${n}>=0.8*C${n},"◔ Near cap","✓ Within cap")),"no cap set")`, result: !c.cap ? 'no cap set' : c.eur > c.cap ? '⚠ Over cap' : c.eur >= 0.8 * c.cap ? '◔ Near cap' : '✓ Within cap' };
    bc.getCell(n, 7).value = { formula: `IF($B$${tot}=0,0,B${n}/$B$${tot})`, result: s.spent ? c.eur / s.spent : 0 };
    bodyRow(bc, n, 7, i);
    [2, 3, 5].forEach((k) => (bc.getCell(n, k).numFmt = EUR_FMT));
    bc.getCell(n, 4).numFmt = '0%';
    bc.getCell(n, 7).numFmt = '0%';
    bc.getCell(n, 4).alignment = { horizontal: 'center', vertical: 'middle' };
    bc.getCell(n, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    bc.getCell(n, 1).fill = fill(tint(c.color));
    bc.getCell(n, 1).font = { name: FONT, size: 10.5, bold: true, color: { argb: INK } };
  });
  bc.getCell(tot, 1).value = 'Total';
  bc.getCell(tot, 2).value = { formula: `SUM(B5:B${Math.max(tot - 1, 5)})`, result: s.spent };
  bc.getCell(tot, 2).numFmt = EUR_FMT;
  bc.getCell(tot, 3).value = s.budget || null;
  bc.getCell(tot, 3).numFmt = EUR_FMT;
  bc.getCell(tot, 5).value = { formula: `IF(ISNUMBER(C${tot}),C${tot}-B${tot},"")`, result: s.budget ? round2(s.budget - s.spent) : '' };
  bc.getCell(tot, 5).numFmt = EUR_FMT;
  totalRow(bc, tot, 7);
  if (nCat) {
    bc.addConditionalFormatting({ ref: `B5:B${tot - 1}`, rules: [bar('FFF4A6C0')] });
    bc.addConditionalFormatting({ ref: `G5:G${tot - 1}`, rules: [bar('FFCDB4F0')] });
    bc.addConditionalFormatting({ ref: `D5:F${tot - 1}`, rules: [{ type: 'expression', priority: 1, formulae: ['AND(ISNUMBER($D5),$D5>1)'], style: { font: { bold: true, color: { argb: 'FFC8364F' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFAD1D8' } } } }] });
  }
  setup(bc, 4);

  /* ===== Daily ===== */
  const dy = wb.addWorksheet('Daily', { properties: { tabColor: { argb: 'FFF7E3A1' } } });
  widths(dy, [14, 8, 14, 18, 17, 24]);
  banner(dy, 6, 'Day by day', `${sub} · running total against an even pace through your budget`);
  tableHead(dy, 4, ['Date', 'Day', 'Spent (€)', 'Running total (€)', 'Budget pace (€)', 'Ahead (+) / under (−)'], ['left', 'center', 'right', 'right', 'right', 'right']);
  const days = daysIn(r.month);
  const upTo = r.f.current ? Number(r.today.slice(8, 10)) : days;
  for (let d = 1; d <= upTo; d++) {
    const row = 4 + d;
    const iso = `${r.month}-${String(d).padStart(2, '0')}`;
    const spentDay = round2(r.spends.filter((x) => x.day === iso).reduce((t, x) => t + x.eur, 0));
    dy.getCell(row, 1).value = new Date(`${iso}T12:00:00Z`);
    dy.getCell(row, 2).value = { formula: `TEXT(A${row},"ddd")`, result: new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) };
    dy.getCell(row, 3).value = { formula: `SUMIFS(${SP('G')},${SP('A')},A${row})`, result: spentDay };
    const running = round2(r.spends.filter((x) => x.day <= iso).reduce((t, x) => t + x.eur, 0));
    dy.getCell(row, 4).value = { formula: `SUM(C$5:C${row})`, result: running };
    dy.getCell(row, 5).value = s.budget ? { formula: `'By category'!$C$${tot}*${d}/${days}`, result: round2((s.budget * d) / days) } : null;
    dy.getCell(row, 6).value = s.budget ? { formula: `D${row}-E${row}`, result: round2(running - (s.budget * d) / days) } : null;
    bodyRow(dy, row, 6, d - 1);
    dy.getCell(row, 1).numFmt = 'ddd dd mmm'.replace('ddd ', '');
    for (const k of [3, 4, 5, 6]) dy.getCell(row, k).numFmt = EUR_FMT;
    dy.getCell(row, 2).alignment = { horizontal: 'center', vertical: 'middle' };
  }
  const dEnd = 4 + upTo;
  dy.getCell(dEnd + 1, 1).value = 'Total';
  dy.getCell(dEnd + 1, 3).value = { formula: `SUM(C5:C${dEnd})`, result: s.spent };
  dy.getCell(dEnd + 1, 3).numFmt = EUR_FMT;
  totalRow(dy, dEnd + 1, 6);
  dy.addConditionalFormatting({ ref: `C5:C${dEnd}`, rules: [bar('FFE6A21A')] });
  if (s.budget) dy.addConditionalFormatting({ ref: `F5:F${dEnd}`, rules: [{ type: 'expression', priority: 2, formulae: ['F5>0'], style: { font: { bold: true, color: { argb: 'FFC8364F' } } } }, { type: 'expression', priority: 3, formulae: ['F5<=0'], style: { font: { color: { argb: 'FF2F8A3A' } } } }] });
  setup(dy, 4, false);

  /* ===== Money in ===== */
  const mi = wb.addWorksheet('Money in', { properties: { tabColor: { argb: 'FF7FB7B0' } } });
  widths(mi, [14, 7, 20, 34, 12, 8, 12, 12]);
  banner(mi, 8, 'Money in', sub);
  tableHead(mi, 4, ['Date', 'Day', 'Source', 'Note', 'Amount', 'Cur.', '€', '₹'], ['left', 'center', 'left', 'left', 'right', 'center', 'right', 'right']);
  r.ins.forEach((x, i) => {
    const row = 5 + i;
    mi.getCell(row, 1).value = new Date(`${x.day}T12:00:00Z`);
    mi.getCell(row, 2).value = { formula: `TEXT(A${row},"ddd")`, result: new Date(`${x.day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) };
    mi.getCell(row, 3).value = categoryOf(x.category, 'in').label;
    mi.getCell(row, 4).value = x.note || '';
    mi.getCell(row, 5).value = x.amount;
    mi.getCell(row, 6).value = x.currency;
    mi.getCell(row, 7).value = x.eur;
    mi.getCell(row, 8).value = x.inr;
    bodyRow(mi, row, 8, i);
    mi.getCell(row, 1).numFmt = 'dd mmm yyyy';
    mi.getCell(row, 5).numFmt = '#,##0.00';
    mi.getCell(row, 7).numFmt = EUR_FMT;
    mi.getCell(row, 8).numFmt = INR_FMT;
    for (const cc of [2, 6]) mi.getCell(row, cc).alignment = { horizontal: 'center', vertical: 'middle' };
    mi.getCell(row, 3).fill = fill(tint('#3e9d6c'));
    mi.getCell(row, 3).font = { name: FONT, size: 10.5, bold: true, color: { argb: INK } };
    mi.getCell(row, 7).font = { name: FONT, size: 10.5, bold: true, color: { argb: 'FF2F8A3A' } };
  });
  const itr = 5 + r.ins.length;
  mi.getCell(itr, 1).value = 'Total';
  mi.getCell(itr, 7).value = { formula: `SUM(G5:G${Math.max(itr - 1, 5)})`, result: s.inEur };
  mi.getCell(itr, 7).numFmt = EUR_FMT;
  mi.getCell(itr, 8).value = { formula: `SUM(H5:H${Math.max(itr - 1, 5)})`, result: s.inInr };
  mi.getCell(itr, 8).numFmt = INR_FMT;
  totalRow(mi, itr, 8);
  if (!r.ins.length) {
    mi.mergeCells(5, 1, 5, 8);
    mi.getCell(5, 1).value = 'No money in this month.';
    mi.getCell(5, 1).font = { name: FONT, italic: true, color: { argb: MUTED } };
    mi.getCell(5, 1).alignment = { indent: 1 };
  }
  setup(mi, 4);

  wb.views = [{ x: 0, y: 0, width: 20000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ---------- the email ---------- */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = 'https://saani.space';

/** The email as inline-styled HTML (tables, because mail apps ignore most CSS), in the site's blush and berry. Kept short so it fits one screen. */
export function emailHtml(r: Report, partial: boolean): string {
  const s = r.f.summary;
  const label = monthLabel(r.month);
  const short = (n: number) => `€${Math.round(n * 100) % 100 ? n.toFixed(2) : Math.round(n)}`;
  const tiles: [string, string, string][] = [
    ['🛍️', 'Spent', short(s.spent)],
    s.left === null ? ['🎯', 'Budget', 'not set'] : s.left >= 0 ? ['🎯', 'Left', short(s.left)] : ['🎯', 'Over by', short(-s.left)],
    ['💌', 'In', short(s.inEur)],
    r.f.projected !== null ? ['🔮', 'Forecast', `~${short(r.f.projected)}`] : ['🧾', 'Spends', String(s.count)],
  ];
  const tile = ([icon, name, value]: [string, string, string]) =>
    `<td width="25%" valign="top" style="padding:0 2px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #f3d4de"><tr><td align="center" style="padding:9px 2px 8px"><div style="font:700 10.5px Arial,Helvetica,sans-serif;color:#9a7b88;text-transform:uppercase;letter-spacing:.03em">${icon} ${name}</div><div style="font:700 17px Georgia,'Times New Roman',serif;color:#6b1e3a;margin-top:3px;white-space:nowrap">${esc(value)}</div></td></tr></table></td>`;
  const top = s.byCat.filter((c) => c.eur > 0).slice(0, 3);
  const bars = top
    .map((c) => {
      const pct = Math.max(4, Math.round((c.eur / Math.max(s.spent, 1)) * 100));
      return `<tr><td style="padding:5px 0 0;font:600 12.5px Arial,Helvetica,sans-serif;color:#3a2a33">${c.icon} ${esc(c.label)}</td><td align="right" style="padding:5px 0 0;font:700 12.5px Arial,Helvetica,sans-serif;color:#6b1e3a">${esc(eur(c.eur))}</td></tr><tr><td colspan="2" style="padding:3px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="${pct}%" height="6" style="background:${c.color};border-radius:6px;font-size:0;line-height:0">&nbsp;</td><td style="background:#f6e6ec;border-radius:6px;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>`;
    })
    .join('');
  const tips = r.take.tips
    .slice(0, 2)
    .map((t) => `<tr><td width="26" valign="top" style="padding:4px 0 0;font-size:15px">${esc(t.icon)}</td><td style="padding:4px 0 0;font:400 13px/1.45 Arial,Helvetica,sans-serif;color:#3a2a33">${esc(t.text)}</td></tr>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fbe3e8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbe3e8">Your ${label} Soldi sheet is attached, with Jelly's take 🪼</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe3e8;background-image:linear-gradient(180deg,#ffd9c7 0%,#fbe3e8 40%,#f4c7da 100%)"><tr><td align="center" style="padding:12px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%">
<tr><td style="padding:0 4px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="72" valign="middle"><img src="${SITE}/email/jelly.png" width="64" height="64" alt="Jelly" style="display:block;width:64px;height:64px;border-radius:32px;border:3px solid #ffffff;background:#ffffff"></td>
  <td valign="middle" style="padding-left:6px"><div style="font:italic 400 14px Georgia,'Times New Roman',serif;color:#6b1e3a">ciao, it's Jelly 🪼</div><div style="font:700 22px/1.15 Georgia,'Times New Roman',serif;color:#6b1e3a">Saani's Soldi sheet</div><span style="display:inline-block;margin-top:5px;padding:3px 11px;border-radius:999px;background:#b2305f;color:#ffffff;font:700 11px Arial,Helvetica,sans-serif">${label}${partial ? ' · so far' : ''}</span></td>
</tr></table></td></tr>
<tr><td style="background:#fff8f3;border-radius:22px;border:1px solid #f3d4de;padding:12px 8px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tiles.map(tile).join('')}</tr></table></td></tr>
    ${top.length ? `<tr><td style="padding:12px 6px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bars}</table></td></tr>` : ''}
    <tr><td style="padding:14px 3px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe3e8;border-radius:16px"><tr><td style="padding:12px 14px 10px">
      <div style="font:italic 400 15px/1.4 Georgia,'Times New Roman',serif;color:#6b1e3a">“${esc(r.take.headline)}” <span style="font:700 11px Arial,Helvetica,sans-serif;color:#b2305f;font-style:normal">· Jelly</span></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tips}</table>
    </td></tr></table></td></tr>
    <tr><td align="center" style="padding:14px 0 0"><a href="${SITE}/home/money" style="display:inline-block;padding:10px 26px;border-radius:999px;background:#b2305f;color:#ffffff;font:700 14px Arial,Helvetica,sans-serif;text-decoration:none">Open Soldi 💗</a></td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:10px 10px 0;font:400 11.5px/1.5 Arial,Helvetica,sans-serif;color:#8a6a77">📎 <b>Soldi-${r.month}.xlsx</b> has every spend, budget by category, money in and my take 🫧</td></tr>
</table>
</td></tr></table></body></html>`;
}

function body(r: Report, partial: boolean) {
  const s = r.f.summary;
  const label = monthLabel(r.month);
  const lines = [
    `Spent ${eur(s.spent)} over ${s.count} ${s.count === 1 ? 'spend' : 'spends'}${s.budget ? `, against a budget of ${eur(s.budget)}${s.left !== null ? ` (${s.left >= 0 ? `${eur(s.left)} left` : `${eur(-s.left)} over`})` : ''}` : ''}.`,
    ...(s.inEur ? [`Money in: ${eur(s.inEur)}.`] : []),
  ];
  const text = `Ciao! Jelly here 🪼\n\nHere is Saani’s Soldi sheet for ${label}${partial ? ' (so far)' : ''}.\n\n${lines.join('\n')}\n\n“${r.take.headline}”\n\nThe full workbook is attached: every spend, the budget by category, money in and my take.\n\nJelly 🫧\n`;
  return { subject: `Jelly’s Soldi sheet for ${label}${partial ? ' (so far)' : ''} 🪼`, text, html: emailHtml(r, partial) };
}

export type Sent = { sent: string[]; failed: string[] };

/** Build the month's workbook and email it, one message per person on the list. null when there's no one to send to or no mail set up. */
export async function sendReport(month: string, today = milanDay()): Promise<Sent | null> {
  const to = await getRecipients();
  if (!to.length || !mailReady()) return null;
  const r = await buildReport(month, today);
  const partial = r.f.current;
  const file = await renderWorkbook(r);
  const mail = body(r, partial);
  const out: Sent = { sent: [], failed: [] };
  for (const addr of to) (await sendMail({ to: addr, ...mail, attachments: [{ filename: `Soldi-${month}.xlsx`, content: file }] })) ? out.sent.push(addr) : out.failed.push(addr);
  if (out.sent.length && !partial) await markSent(month);
  return out;
}

/**
 * The 1st of the month (retried on the 2nd and 3rd if it didn't go): last month's sheet, once.
 * Returns what happened, for the daily job's log.
 */
export async function monthlyReport(today: string): Promise<string> {
  if (Number(today.slice(8, 10)) > 3) return 'not-due';
  const month = shiftMonth(monthOf(today), -1);
  if ((await lastSent())[month]) return 'already-sent';
  if (!mailReady() || !(await getRecipients()).length) return 'off';
  const all = await listExpenses();
  if (!all.some((x) => monthOf(x.day) === month)) return 'empty-month';
  const r = await sendReport(month, today);
  // once anyone has it the month counts as sent, so a retry never sends the others a second copy
  return r && r.sent.length ? (r.failed.length ? 'partial' : 'sent') : 'failed';
}
