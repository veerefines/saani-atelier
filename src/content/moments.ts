/** Moments: photos, videos and voice notes Saanika sends her people (a little like Locket). */
export type MomentKind = 'photo' | 'video' | 'voice';
export type Moment = {
  id: string;
  createdAt: string;
  kind: MomentKind;
  mediaId: string;
  caption?: string;
  /** everyone, or just these friends (by id) */
  to: 'all' | string[];
  reactions: { by: string; name: string; emoji: string; at: string }[];
};
export const MOMENT_REACTIONS = ['💗', '🥹', '😍', '😂', '🔥', '🫶'];
export const sentTo = (m: Moment, id: string) => m.to === 'all' || m.to.includes(id);
