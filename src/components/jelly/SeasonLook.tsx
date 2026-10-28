import type { Look } from '@/lib/jelly-seasons';

/**
 * What Jelly wears for a season or festival, drawn over her picture (a 100×100 box laid on top of
 * it, so it bobs with her). Her head is at the top middle and her eyes about 42% down.
 */
export default function SeasonLook({ look }: { look: Look }) {
  return (
    <svg className={`jelly-look look-${look}`} viewBox="0 0 100 100" aria-hidden="true">
      {look === 'pumpkin' && (
        <g transform="rotate(-12 46 6)">
          <ellipse cx="46" cy="6" rx="15" ry="11" fill="#ff9a3c" />
          <ellipse cx="40" cy="6" rx="6" ry="10.5" fill="#ffad55" />
          <ellipse cx="52" cy="6" rx="6" ry="10.5" fill="#f68a2a" />
          <path d="M46 -5 q1 -5 5 -6" stroke="#6e9e7a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M47 -4 q7 -3 9 2 q-6 2 -9 -2z" fill="#7fb77a" />
        </g>
      )}
      {look === 'santa' && (
        <g transform="rotate(-14 46 8)">
          <path d="M28 12 Q40 -14 64 -4 Q70 2 68 10 Z" fill="#e5374d" />
          <circle cx="69" cy="10" r="5" fill="#fff" />
          <rect x="25" y="9" width="44" height="8" rx="4" fill="#fff" />
        </g>
      )}
      {look === 'party' && (
        <g transform="rotate(14 50 4)">
          <path d="M40 12 L50 -16 L60 12 Z" fill="#cdb4f0" />
          <path d="M43 4 L57 4 M45.5 -3 L54.5 -3 M47.5 -9 L52.5 -9" stroke="#f4a6c0" strokeWidth="2.4" />
          <circle cx="50" cy="-16" r="3.4" fill="#f7e3a1" />
        </g>
      )}
      {look === 'beret' && (
        <g transform="rotate(-10 46 6)">
          <ellipse cx="46" cy="6" rx="21" ry="7.5" fill="#b2305f" />
          <ellipse cx="46" cy="9" rx="17" ry="3" fill="#8f2147" />
          <path d="M46 -1 v-4" stroke="#8f2147" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {look === 'crown' && (
        <g transform="rotate(-8 46 4)">
          <path d="M33 11 L31 -3 L39 4 L46 -6 L53 4 L61 -3 L59 11 Z" fill="#f2c84b" stroke="#d9a72a" strokeWidth="1" />
          <circle cx="46" cy="5" r="2.3" fill="#f4a6c0" />
          <circle cx="38" cy="7" r="1.6" fill="#cdb4f0" />
          <circle cx="54" cy="7" r="1.6" fill="#bfe6f5" />
        </g>
      )}
      {look === 'shades' && (
        <g>
          <path d="M25 37 h46" stroke="#1e1b24" strokeWidth="2" />
          <path d="M26 36 h18 q1 9 -8 10 q-9 -1 -10 -10z" fill="#1e1b24" />
          <path d="M52 36 h18 q-1 9 -10 10 q-9 -1 -8 -10z" fill="#1e1b24" />
          <path d="M29 38 l4 -1 M55 38 l4 -1" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
      {look === 'heart' && (
        <g transform="translate(70 10) rotate(18)">
          <path d="M0 4 C-10 -6 -14 6 0 12 C14 6 10 -6 0 4z" fill="#f45b8c" />
          <path d="M0 4 C-10 -6 -14 6 0 12" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" />
        </g>
      )}
      {look === 'mask' && (
        <g>
          <path d="M23 36 q12 -8 23 2 q11 -10 25 -2 q-2 12 -12 12 q-8 0 -13 -5 q-5 5 -13 5 q-10 0 -10 -12z" fill="#cdb4f0" opacity=".92" />
          <ellipse cx="35" cy="40" rx="5" ry="3.4" fill="#fff" opacity=".5" />
          <ellipse cx="58" cy="40" rx="5" ry="3.4" fill="#fff" opacity=".5" />
          <path d="M71 34 q8 -10 14 -6" stroke="#f2c84b" strokeWidth="2" fill="none" />
          <circle cx="86" cy="27" r="2.5" fill="#f4a6c0" />
        </g>
      )}
      {look === 'diya' && (
        <g transform="translate(80 70)">
          <path d="M-11 0 q11 10 22 0 z" fill="#d9822b" />
          <path d="M-11 0 h22" stroke="#b5651d" strokeWidth="1.4" />
          <path d="M0 -1 q-4 -6 0 -12 q4 6 0 12z" fill="#ffcc3d" />
          <path d="M0 -3 q-2 -3 0 -6 q2 3 0 6z" fill="#fff3b0" />
          <circle cx="0" cy="-6" r="9" fill="#ffd77a" opacity=".25" />
        </g>
      )}
      {look === 'colours' && (
        <g opacity=".85">
          <circle cx="30" cy="20" r="5" fill="#ff7fb5" />
          <circle cx="62" cy="14" r="4" fill="#5fc4ff" />
          <circle cx="70" cy="30" r="3.4" fill="#ffd54a" />
          <circle cx="24" cy="54" r="3.6" fill="#8ce07a" />
          <circle cx="44" cy="10" r="2.6" fill="#b28cff" />
          <circle cx="74" cy="50" r="3" fill="#ff9f5a" />
        </g>
      )}
    </svg>
  );
}
