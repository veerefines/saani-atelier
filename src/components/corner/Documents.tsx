'use client';

import { mediaUrl } from '@/lib/upload-client';
import { FileButton, Status, fileSize, shortDate, uploadCorner, useAction, type Ctx } from './shared';

const KIND: Record<string, { label: string; tag: string }> = {
  'application/pdf': { label: 'PDF', tag: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'Word', tag: 'DOCX' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { label: 'PowerPoint', tag: 'PPTX' },
  'text/plain': { label: 'Text', tag: 'TXT' },
};
const ACCEPT =
  '.pdf,.docx,.pptx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation';

/** Documents: PDFs, Word, PowerPoint and text files, up to 25 MB each. */
export default function Documents({ ctx }: { ctx: Ctx }) {
  const docs = ctx.items.filter((i) => i.kind === 'doc');
  const { busy, err, ok, run } = useAction();
  const upload = (f: File) => {
    const ext = f.name.toLowerCase().split('.').pop() ?? '';
    if (!['pdf', 'docx', 'pptx', 'txt'].includes(ext)) return run('', async () => Promise.reject(new Error('Upload a PDF, Word (DOCX), PowerPoint (PPTX) or TXT file.')));
    if (f.size > 25 * 1024 * 1024) return run('', async () => Promise.reject(new Error(`That file is ${fileSize(f.size)}; the limit is 25 MB.`)));
    return run(
      'Uploading…',
      async () => {
        const mediaId = await uploadCorner(f);
        await ctx.add({ kind: 'doc', mediaId });
      },
      `${f.name} added ✓`,
    );
  };
  return (
    <div className="cn-panel">
      <div className="cn-adder">
        <div className="cn-row">
          <FileButton label={busy || '+ Upload a document'} accept={ACCEPT} disabled={Boolean(busy)} onFile={upload} />
          <small className="cn-hint">PDF, DOCX, PPTX or TXT · up to 25 MB · only you can open them</small>
        </div>
        <Status err={err} ok={ok} />
      </div>
      {!docs.length && <p className="cn-empty-note">No documents yet. Briefs, trend reports, research and slides all belong here.</p>}
      <ul className="cn-docs">
        {docs.map((d) => {
          if (d.kind !== 'doc') return null;
          const k = KIND[d.mime] ?? { label: 'File', tag: 'FILE' };
          return (
            <li key={d.id}>
              <span className="cn-doc-icon" aria-hidden="true">
                {k.tag}
              </span>
              <span className="cn-doc-main">
                <b>{d.filename}</b>
                <small>
                  {k.label} · {fileSize(d.size)} · added {shortDate(d.createdAt)}
                </small>
              </span>
              <span className="cn-doc-actions">
                <a className="cn-btn" href={`${mediaUrl(d.mediaId)}?download=1`} download={d.filename}>
                  Download
                </a>
                <button type="button" className="cn-btn danger" onClick={() => confirm(`Delete ${d.filename}?`) && run('Deleting…', () => ctx.removeItem(d.id))} aria-label={`Delete ${d.filename}`}>
                  Delete
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
