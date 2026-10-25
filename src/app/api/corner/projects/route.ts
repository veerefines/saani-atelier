import { CATEGORIES, createProject, listProjects, text, type Category } from '@/lib/corner';
import { requireSession, isResponse, json, fail } from '@/lib/api';

/** My Corner: her projects, most recently edited first. */
export async function GET() {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  return json(await listProjects());
}

/** A new project: a title, a description and a category. */
export async function POST(req: Request) {
  const s = await requireSession('saanika');
  if (isResponse(s)) return s;
  const body = await req.json().catch(() => ({}));
  const title = text(body.title, 80);
  if (!title) return fail('Give the project a title.');
  if (!CATEGORIES.includes(body.category)) return fail('Pick one of the categories.');
  return json(await createProject({ title, description: text(body.description, 1000), category: body.category as Category }), 201);
}
