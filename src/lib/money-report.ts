import ExcelJS from 'exceljs';
import * as db from './db';
import { isEmail } from './google';
import { mailReady, sendMail } from './mail';
import { categoryOf, eur, kindOf, milanDay, monthOf, shiftMonth, type Expense } from './money';
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
const BLUSH = 'FFFBE3E8';
const PAPER = 'FFFFF8F3';
const EUR_FMT = '"€"#,##0.00';
const INR_FMT = '"₹"#,##0';

function head(ws: ExcelJS.Worksheet, row: number, labels: string[]) {
  const r = ws.getRow(row);
  labels.forEach((l, i) => {
    const c = r.getCell(i + 1);
    c.value = l;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BERRY } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center', wrapText: true };
  });
  r.height = 24;
}
const title = (ws: ExcelJS.Worksheet, text: string, span: number) => {
  ws.mergeCells(1, 1, 1, span);
  const c = ws.getCell(1, 1);
  c.value = text;
  c.font = { size: 18, bold: true, color: { argb: BURGUNDY }, name: 'Calibri' };
  c.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 32;
};
const widths = (ws: ExcelJS.Worksheet, w: number[]) => w.forEach((n, i) => (ws.getColumn(i + 1).width = n));
const totalRow = (row: ExcelJS.Row) =>
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: BURGUNDY } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUSH } };
    c.border = { top: { style: 'thin', color: { argb: BERRY } } };
  });
const sheetOf = (ws: ExcelJS.Worksheet) => {
  ws.properties.defaultRowHeight = 18;
  ws.views = [{ state: 'frozen', ySplit: 3, showGridLines: false }];
};

export async function renderWorkbook(r: Report): Promise<Buffer> {
  const s = r.f.summary;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jelly 🪼';
  wb.created = new Date();
  const label = monthLabel(r.month);

  /* Summary */
  const sm = wb.addWorksheet('Summary', { properties: { tabColor: { argb: BERRY } } });
  title(sm, `Saani’s Soldi · ${label}`, 3);
  sm.getCell('A2').value = `Prepared by Jelly 🪼 on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })}${r.f.current ? ' (the month so far)' : ''}`;
  sm.getCell('A2').font = { italic: true, color: { argb: 'FF7A5C69' } };
  const rows: [string, ExcelJS.CellValue, string?][] = [
    ['Spent (€)', s.spent, EUR_FMT],
    ['Spent (₹)', s.spentInr, INR_FMT],
    ['Number of spends', s.count],
    ['Monthly budget (€)', s.budget || '—', s.budget ? EUR_FMT : undefined],
    ['Left of the budget (€)', s.left ?? '—', s.left === null ? undefined : EUR_FMT],
    ['Budget pace so far (€)', s.pace ?? '—', s.pace === null ? undefined : EUR_FMT],
    ['On track?', s.onTrack === null ? '—' : s.onTrack ? 'Yes' : 'A little ahead of pace'],
    ['Money in (€)', s.inEur, EUR_FMT],
    ['Net: in minus spent (€)', s.net, EUR_FMT],
    ['Same time last month (€)', r.f.beforeTotal || '—', r.f.beforeTotal ? EUR_FMT : undefined],
    ['Projected month end (€)', r.f.projected ?? '—', r.f.projected === null ? undefined : EUR_FMT],
    ['Biggest single spend', r.f.biggest ? `${eur(r.f.biggest.eur)} · ${r.f.biggest.what}` : '—'],
  ];
  rows.forEach(([k, v, fmt], i) => {
    const row = sm.getRow(4 + i);
    row.getCell(1).value = k;
    row.getCell(1).font = { bold: true, color: { argb: BURGUNDY } };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUSH } };
    const c = row.getCell(2);
    c.value = v;
    if (fmt) c.numFmt = fmt;
    c.alignment = { horizontal: 'right' };
  });
  const jr = 4 + rows.length + 1;
  sm.mergeCells(jr, 1, jr, 3);
  sm.getCell(jr, 1).value = `Jelly says: ${r.take.headline}`;
  sm.getCell(jr, 1).font = { italic: true, size: 13, color: { argb: BURGUNDY } };
  sm.getCell(jr, 1).alignment = { wrapText: true, vertical: 'top' };
  sm.getRow(jr).height = 48;
  widths(sm, [30, 28, 16]);
  sm.views = [{ showGridLines: false }];

  /* Spends */
  const sp = wb.addWorksheet('Spends', { properties: { tabColor: { argb: 'FFF4A6C0' } } });
  title(sp, `Every spend · ${label}`, 9);
  sp.getCell('A2').value = 'Newest at the bottom. € and ₹ are worked out at the rate on the day it was logged.';
  sp.getCell('A2').font = { italic: true, color: { argb: 'FF7A5C69' } };
  head(sp, 3, ['Date', 'Category', 'Note', 'Amount', 'Currency', '€', '₹', 'Rate (₹ per €1)', 'Logged via']);
  r.spends.forEach((x: Expense, i) => {
    const row = sp.getRow(4 + i);
    const c = categoryOf(x.category, 'out');
    row.values = [new Date(`${x.day}T12:00:00Z`), c.label, x.note || '', x.amount, x.currency, x.eur, x.inr, x.rate, x.source === 'whatsapp' ? 'WhatsApp' : x.source === 'jelly' ? 'Jelly' : 'by hand'];
    row.getCell(1).numFmt = 'dd mmm yyyy';
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(6).numFmt = EUR_FMT;
    row.getCell(7).numFmt = INR_FMT;
    row.getCell(8).numFmt = '0.00';
    if (i % 2) row.eachCell((cell) => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PAPER } }));
  });
  const last = 3 + r.spends.length;
  const tr = sp.getRow(last + 1);
  tr.getCell(1).value = 'Total';
  tr.getCell(6).value = { formula: `SUM(F4:F${Math.max(last, 4)})`, result: s.spent };
  tr.getCell(6).numFmt = EUR_FMT;
  tr.getCell(7).value = { formula: `SUM(G4:G${Math.max(last, 4)})`, result: s.spentInr };
  tr.getCell(7).numFmt = INR_FMT;
  totalRow(tr);
  if (r.spends.length) sp.autoFilter = { from: 'A3', to: `I${last}` };
  widths(sp, [14, 20, 34, 12, 10, 12, 12, 16, 12]);
  sheetOf(sp);

  /* By category */
  const bc = wb.addWorksheet('By category', { properties: { tabColor: { argb: 'FFCDB4F0' } } });
  title(bc, `Budget by category · ${label}`, 6);
  bc.getCell('A2').value = 'Spent is added up live from the Spends tab; change a cap and the rest follows.';
  bc.getCell('A2').font = { italic: true, color: { argb: 'FF7A5C69' } };
  head(bc, 3, ['Category', 'Spent (€)', 'Monthly cap (€)', '% of cap used', 'Left of cap (€)', 'Share of spending']);
  const cats = s.byCat;
  const lastSpend = Math.max(last, 4);
  cats.forEach((c, i) => {
    const n = 4 + i;
    const row = bc.getRow(n);
    row.getCell(1).value = c.label;
    row.getCell(2).value = { formula: `SUMIFS(Spends!$F$4:$F$${lastSpend},Spends!$B$4:$B$${lastSpend},A${n})`, result: c.eur };
    row.getCell(3).value = c.cap ?? null;
    row.getCell(4).value = { formula: `IF(ISNUMBER(C${n}),B${n}/C${n},"")`, result: c.cap ? round2(c.eur / c.cap) : '' };
    row.getCell(5).value = { formula: `IF(ISNUMBER(C${n}),C${n}-B${n},"")`, result: c.cap ? round2(c.cap - c.eur) : '' };
    row.getCell(6).value = { formula: `IF(${'$B$' + (4 + cats.length)}=0,0,B${n}/${'$B$' + (4 + cats.length)})`, result: s.spent ? round2(c.eur / s.spent) : 0 };
    [2, 3, 5].forEach((k) => (row.getCell(k).numFmt = EUR_FMT));
    [4, 6].forEach((k) => (row.getCell(k).numFmt = '0%'));
  });
  const bt = bc.getRow(4 + cats.length);
  bt.getCell(1).value = 'Total';
  bt.getCell(2).value = { formula: `SUM(B4:B${Math.max(3 + cats.length, 4)})`, result: s.spent };
  bt.getCell(2).numFmt = EUR_FMT;
  bt.getCell(3).value = s.budget || null;
  bt.getCell(3).numFmt = EUR_FMT;
  totalRow(bt);
  if (cats.length)
    bc.addConditionalFormatting({
      ref: `A4:F${3 + cats.length}`,
      rules: [{ type: 'expression', priority: 1, formulae: ['AND(ISNUMBER($D4),$D4>1)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFAD1D8' } } } }],
    });
  widths(bc, [24, 14, 16, 16, 16, 18]);
  sheetOf(bc);

  /* Money in */
  const mi = wb.addWorksheet('Money in', { properties: { tabColor: { argb: 'FF7FB7B0' } } });
  title(mi, `Money in · ${label}`, 7);
  head(mi, 3, ['Date', 'Source', 'Note', 'Amount', 'Currency', '€', '₹']);
  r.ins.forEach((x, i) => {
    const row = mi.getRow(4 + i);
    row.values = [new Date(`${x.day}T12:00:00Z`), categoryOf(x.category, 'in').label, x.note || '', x.amount, x.currency, x.eur, x.inr];
    row.getCell(1).numFmt = 'dd mmm yyyy';
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(6).numFmt = EUR_FMT;
    row.getCell(7).numFmt = INR_FMT;
  });
  const lastIn = 3 + r.ins.length;
  const it = mi.getRow(lastIn + 1);
  it.getCell(1).value = 'Total';
  it.getCell(6).value = { formula: `SUM(F4:F${Math.max(lastIn, 4)})`, result: s.inEur };
  it.getCell(6).numFmt = EUR_FMT;
  it.getCell(7).value = { formula: `SUM(G4:G${Math.max(lastIn, 4)})`, result: s.inInr };
  it.getCell(7).numFmt = INR_FMT;
  totalRow(it);
  widths(mi, [14, 18, 34, 12, 10, 12, 12]);
  sheetOf(mi);

  /* Jelly's take */
  const jt = wb.addWorksheet('Jelly’s take', { properties: { tabColor: { argb: 'FFF7E3A1' } } });
  title(jt, `Jelly’s take · ${label}`, 2);
  jt.mergeCells('A3:B3');
  jt.getCell('A3').value = r.take.headline;
  jt.getCell('A3').font = { size: 14, bold: true, color: { argb: BURGUNDY } };
  jt.getCell('A3').alignment = { wrapText: true, vertical: 'top' };
  jt.getRow(3).height = 54;
  r.take.tips.forEach((t, i) => {
    const row = jt.getRow(5 + i);
    row.getCell(1).value = t.icon;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
    row.getCell(2).value = t.text;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = Math.max(34, Math.ceil(t.text.length / 80) * 18 + 8);
  });
  jt.getCell(5 + r.take.tips.length + 1, 2).value = r.take.via === 'jelly' ? 'Written by Jelly 🪼' : 'Quick tips (Jelly was resting when this was made)';
  jt.getCell(5 + r.take.tips.length + 1, 2).font = { italic: true, color: { argb: 'FF7A5C69' } };
  widths(jt, [8, 90]);
  jt.views = [{ showGridLines: false }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ---------- the email ---------- */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = 'https://saani.space';

/** The email as inline-styled HTML (tables, because mail apps ignore most CSS), in the site's blush and berry. */
export function emailHtml(r: Report, partial: boolean): string {
  const s = r.f.summary;
  const label = monthLabel(r.month);
  const tiles: [string, string, string][] = [
    ['🛍️', 'Spent', eur(s.spent)],
    s.left === null ? ['🎯', 'Budget', 'not set yet'] : s.left >= 0 ? ['🎯', 'Left of budget', eur(s.left)] : ['🎯', 'Over budget by', eur(-s.left)],
    ['💌', 'Money in', eur(s.inEur)],
    r.f.projected !== null ? ['🔮', 'Month end at', `~${eur(r.f.projected)}`] : ['🧾', 'Spends', String(s.count)],
  ];
  const tile = ([icon, name, value]: [string, string, string]) =>
    `<td width="50%" style="padding:6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #f3d4de"><tr><td style="padding:14px 14px 12px"><div style="font-size:20px;line-height:24px">${icon}</div><div style="font:600 12px Arial,Helvetica,sans-serif;color:#9a7b88;text-transform:uppercase;letter-spacing:.06em;margin-top:6px">${name}</div><div style="font:700 22px Georgia,'Times New Roman',serif;color:#6b1e3a;margin-top:2px">${esc(value)}</div></td></tr></table></td>`;
  const top = s.byCat.filter((c) => c.eur > 0).slice(0, 4);
  const bars = top
    .map((c) => {
      const pct = Math.max(4, Math.round((c.eur / Math.max(s.spent, 1)) * 100));
      return `<tr><td style="padding:7px 0 0;font:600 13px Arial,Helvetica,sans-serif;color:#3a2a33">${c.icon} ${esc(c.label)}</td><td align="right" style="padding:7px 0 0;font:700 13px Arial,Helvetica,sans-serif;color:#6b1e3a">${esc(eur(c.eur))}</td></tr><tr><td colspan="2" style="padding:4px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="${pct}%" height="8" style="background:${c.color};border-radius:8px;font-size:0;line-height:0">&nbsp;</td><td style="background:#f6e6ec;border-radius:8px;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>`;
    })
    .join('');
  const tips = r.take.tips
    .slice(0, 3)
    .map((t) => `<tr><td width="30" valign="top" style="padding:6px 0;font-size:18px">${esc(t.icon)}</td><td style="padding:6px 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#3a2a33">${esc(t.text)}</td></tr>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fbe3e8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#fbe3e8">Your ${label} Soldi sheet is attached, with Jelly's take 🪼</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe3e8;background-image:linear-gradient(180deg,#ffd9c7 0%,#fbe3e8 38%,#f4c7da 100%)"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td align="center" style="padding:0 0 14px">
  <img src="${SITE}/email/jelly.png" width="96" height="96" alt="Jelly" style="display:block;width:96px;height:96px;border-radius:48px;border:4px solid #ffffff;background:#ffffff;box-shadow:0 8px 22px rgba(107,30,58,.18)">
</td></tr>
<tr><td align="center" style="padding:0 0 4px;font:italic 400 20px Georgia,'Times New Roman',serif;color:#6b1e3a">ciao, it's Jelly 🪼</td></tr>
<tr><td align="center" style="padding:0 0 18px;font:400 30px/1.15 Georgia,'Times New Roman',serif;color:#6b1e3a"><b>Saani's Soldi sheet</b></td></tr>
<tr><td align="center" style="padding:0 0 18px"><span style="display:inline-block;padding:7px 18px;border-radius:999px;background:#b2305f;color:#ffffff;font:700 13px Arial,Helvetica,sans-serif;letter-spacing:.04em">${label}${partial ? ' · so far' : ''}</span></td></tr>
<tr><td style="background:#fff8f3;border-radius:26px;border:1px solid #f3d4de;padding:22px 20px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:0 6px 12px;font:italic 400 17px/1.5 Georgia,'Times New Roman',serif;color:#3a2a33">Here's how the month went, cara. The whole workbook is attached.</td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile(tiles[0])}${tile(tiles[1])}</tr><tr>${tile(tiles[2])}${tile(tiles[3])}</tr></table></td></tr>
    ${top.length ? `<tr><td style="padding:16px 6px 0"><div style="font:700 12px Arial,Helvetica,sans-serif;color:#9a7b88;text-transform:uppercase;letter-spacing:.08em">Where it went</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bars}</table></td></tr>` : ''}
    <tr><td style="padding:20px 6px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe3e8;border-radius:18px"><tr><td style="padding:16px 16px 12px">
      <div style="font:700 12px Arial,Helvetica,sans-serif;color:#b2305f;text-transform:uppercase;letter-spacing:.08em">Jelly's take</div>
      <div style="font:italic 400 18px/1.45 Georgia,'Times New Roman',serif;color:#6b1e3a;margin:6px 0 8px">${esc(r.take.headline)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tips}</table>
    </td></tr></table></td></tr>
    <tr><td align="center" style="padding:22px 6px 4px"><a href="${SITE}/home/money" style="display:inline-block;padding:14px 30px;border-radius:999px;background:#b2305f;color:#ffffff;font:700 15px Arial,Helvetica,sans-serif;text-decoration:none">Open Soldi 💗</a></td></tr>
  </table>
</td></tr>
<tr><td align="center" style="padding:18px 20px 0;font:400 12.5px/1.6 Arial,Helvetica,sans-serif;color:#8a6a77">📎 <b>Soldi-${r.month}.xlsx</b> has every spend, your budget by category, money in and my take.<br>Sent with love by Jelly, from Saani's Atelier 🫧</td></tr>
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
