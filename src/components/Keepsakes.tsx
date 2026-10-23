import fs from 'node:fs';
import path from 'node:path';
import { keepsakeSets, type Spot } from '@/content/keepsakes';

const DIR = path.join(process.cwd(), 'public', 'her');
const exists = (name: string) => fs.existsSync(path.join(DIR, `${name}.png`));

function vars(s: Spot, i: number): React.CSSProperties {
  const v: Record<string, string> = {
    '--t': s.top,
    '--w': `${s.w}px`,
    '--rot': `${s.rot}deg`,
    '--delay': `${0.3 + i * 0.15}s`,
    '--bob': `${5 + (i % 3)}s`,
  };
  if (s.left !== undefined) v['--l'] = s.left;
  if (s.right !== undefined) v['--r'] = s.right;
  if (s.phone) {
    v['--pt'] = s.phone.top;
    v['--pw'] = `${s.phone.w}px`;
    if (s.phone.left !== undefined) v['--pl'] = s.phone.left;
    if (s.phone.right !== undefined) v['--pr'] = s.phone.right;
  }
  return v as React.CSSProperties;
}

/** Little things she loves, tucked around a section. Server-side so missing files never render. */
export default function Keepsakes({ set }: { set: keyof typeof keepsakeSets }) {
  const dev = process.env.NODE_ENV !== 'production';
  const spots = keepsakeSets[set].map((s, i) => ({ s, i, ok: exists(s.name) })).filter((x) => x.ok || dev);
  if (!spots.length) return null;
  return (
    <div className="ks-layer" aria-hidden="true">
      {spots.map(({ s, i, ok }) => {
        const cls = `ks${s.left !== undefined ? ' ks-l' : ' ks-r'}${s.phone ? (s.phone.left !== undefined ? ' ks-pl' : ' ks-pr') : ' ks-wide'}`;
        return ok ? (
          <img key={`${s.name}${i}`} src={`/her/${s.name}.png`} alt="" className={cls} style={vars(s, i)} loading="lazy" decoding="async" />
        ) : (
          <span key={`${s.name}${i}`} className={`${cls} ks-empty`} style={vars(s, i)}>
            her/{s.name}.png
          </span>
        );
      })}
    </div>
  );
}
