/** Her mood today: she picks one on her desk; her people see it on theirs. */
export type MoodId = 'great' | 'good' | 'tired' | 'homesick' | 'stressed' | 'excited';
export const MOODS: { id: MoodId; emoji: string; label: string; low?: boolean }[] = [
  { id: 'great', emoji: '☀️', label: 'great' },
  { id: 'excited', emoji: '🥳', label: 'excited' },
  { id: 'good', emoji: '🙂', label: 'okay' },
  { id: 'tired', emoji: '😴', label: 'tired' },
  { id: 'homesick', emoji: '🥺', label: 'homesick', low: true },
  { id: 'stressed', emoji: '😮‍💨', label: 'stressed', low: true },
];
export type MoodState = { mood: MoodId; note?: string; at: string; day: string };
