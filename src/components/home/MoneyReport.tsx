'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/upload-client';
import { sfx } from '@/lib/sound';
import Sheet from './MoneySheet';

type Info = { ready: boolean; recipients: string[]; lastSent: Record<string, string> };

const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });

/** "Send my sheet": Jelly emails the month's Excel workbook now, to the people on the list (who she can change). */
export default function MoneyReport({ month, thisMonth }: { month: string; thisMonth: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Info>('/api/expenses/report', 'GET').then(setInfo).catch(() => {});
  }, []);

  async function send() {
    if (state === 'busy') return;
    setState('busy');
    setMsg('');
    try {
      const r = await api<{ sent: string[]; failed: string[] }>('/api/expenses/report', 'POST', { month });
      sfx('harp');
      setState('sent');
      setMsg(`Sent to ${r.sent.length === 1 ? r.sent[0] : `${r.sent.length} people`} 💌${r.failed.length ? ` (couldn’t reach ${r.failed.join(', ')})` : ''}`);
      setTimeout(() => setState('idle'), 4000);
    } catch (e) {
      sfx('nope');
      setState('idle');
      setMsg((e as Error).message);
    }
  }

  if (!info) return null;
  const n = info.recipients.length;
  return (
    <section className="soldi-report" aria-label="Monthly sheet">
      <div className="soldi-report-text">
        <b className="hand">your {monthName(month)} sheet</b>
        <small>
          A proper Excel file with every spend, your budget and Jelly’s take. {n ? `Goes to ${n === 1 ? info.recipients[0] : `${n} people`}` : 'Add who it should go to'}, and out on its own on the 1st of each month.
        </small>
      </div>
      <div className="soldi-report-actions">
        <button type="button" className="soldi-go" onClick={send} disabled={state === 'busy' || !n} data-quiet>
          {state === 'busy' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : month === thisMonth ? '📧 Send my sheet' : `📧 Send ${monthName(month)}`}
        </button>
        <button type="button" className="soldi-ghost" onClick={() => (sfx('page'), setOpen(true))} data-quiet>
          Who gets it
        </button>
      </div>
      {msg && <p className="soldi-report-msg" role="status">{msg}</p>}
      {!info.ready && <p className="soldi-report-msg">Email isn’t switched on yet, so nothing will go out until Varun finishes setting it up.</p>}
      {open && <Recipients list={info.recipients} onClose={() => setOpen(false)} onSaved={(recipients) => (setInfo({ ...info, recipients }), setOpen(false))} />}
    </section>
  );
}

function Recipients({ list, onClose, onSaved }: { list: string[]; onClose: () => void; onSaved: (l: string[]) => void }) {
  const [emails, setEmails] = useState(list);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function add() {
    const e = draft.trim().toLowerCase();
    if (!e) return true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr('That doesn’t look like an email address.'), false;
    if (emails.length >= 10) return setErr('Ten addresses is the most.'), false;
    if (!emails.includes(e)) setEmails([...emails, e]);
    setDraft('');
    setErr('');
    sfx('pop');
    return true;
  }
  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const e = draft.trim().toLowerCase();
    if (e && !add()) return;
    setBusy(true);
    try {
      const all = e && !emails.includes(e) ? [...emails, e] : emails;
      const r = await api<{ recipients: string[] }>('/api/expenses/report', 'PUT', { emails: all });
      sfx('coins');
      onSaved(r.recipients);
    } catch (z) {
      sfx('nope');
      setErr((z as Error).message);
      setBusy(false);
    }
  }
  return (
    <Sheet title="Who gets the sheet" onClose={onClose}>
      <form onSubmit={save} className="soldi-edit">
        <p className="soldi-sub">Jelly emails the sheet to each of these, on the 1st of every month and whenever you press the button.</p>
        <ul className="soldi-emails">
          {emails.map((e) => (
            <li key={e}>
              <span>{e}</span>
              <button type="button" onClick={() => (sfx('flip'), setEmails(emails.filter((x) => x !== e)))} aria-label={`Remove ${e}`}>
                ×
              </button>
            </li>
          ))}
          {!emails.length && <li className="none">No one yet, add an email below.</li>}
        </ul>
        <div className="soldi-add-row">
          <input className="soldi-note" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="friend@example.com" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} aria-label="Add an email address" />
          <button type="button" className="soldi-ghost" onClick={() => add()} data-quiet>
            Add
          </button>
        </div>
        {err && <p className="soldi-err">{err}</p>}
        <div className="soldi-sheet-actions">
          <button className="soldi-go" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
