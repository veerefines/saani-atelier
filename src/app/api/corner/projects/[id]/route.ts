import { activity, cleanPatch, deleteProject, getProject, listItems, ownMedia, updateProject, type ProjectPatch } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** One project, with everything in it and its recent activity. */
export async function GET(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  const p = await getProject(id);
  if (!p) return fail('That project isn’t here.', 404);
  const items = await listItems(id);
  return json({ project: p, items, activity: activity(p, items) });
}

/** Rename, describe, recategorise, favourite, archive, set the cover, or save the brief and costing. */
export async function PATCH(req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  if (!(await getProject(id))) return fail('That project isn’t here.', 404);
  const body = await req.json().catch(() => ({}));
  const patch = cleanPatch(body);
  if (typeof patch === 'string') return fail(patch);
  const full: ProjectPatch = { ...patch };
  if ('coverMediaId' in body) {
    if (body.coverMediaId === null) full.coverMediaId = undefined;
    else {
      const m = await ownMedia(s, body.coverMediaId);
      if (!m || !m.mime.startsWith('image/')) return fail('Upload the cover image first.');
      full.coverMediaId = m.id;
    }
  }
  return json(await updateProject(id, full));
}

/** Delete a project, everything in it, and its files. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const { id } = await params;
  return (await deleteProject(id)) ? json({ ok: true }) : fail('That project isn’t here.', 404);
}
