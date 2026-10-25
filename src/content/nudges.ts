/** "Thinking of you" nudges: what friends can send, and what she can send back. */
export type Nudge = {
  id: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  emoji: string;
  text?: string;
  /** her answer */
  reaction?: string;
  reply?: string;
  answeredAt?: string;
  /** she's seen it and cleared it from her desk (the friend still sees it in theirs) */
  dismissedAt?: string;
};
export const NUDGE_EMOJI = ['💗', '🫶', '🌸', '🤗', '☕', '✨', '🍝', '🥹'];
export const REACT_EMOJI = ['💗', '🥹', '🫶', '😘', '😂', '🌸'];
