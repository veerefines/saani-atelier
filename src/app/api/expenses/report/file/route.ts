import { milanDay, monthOf } from '@/lib/money';
import { buildReport, renderWorkbook } from '@/lib/money-report';
import { requireSession, isResponse } from '@/lib/api';

/** The month's workbook as a download (this month unless ?month=YYYY-MM). */
export async function GET(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const q = new URL(req.url).searchParams.get('month');
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : monthOf(milanDay());
  const file = await renderWorkbook(await buildReport(month));
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Soldi-${month}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
