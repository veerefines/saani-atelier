'use client';

/** Opens the browser's print dialog, where "Save as PDF" turns the book into a keepsake file. */
export default function PrintButton() {
  return (
    <button className="cta book-print" onClick={() => window.print()}>
      Save as PDF or print
    </button>
  );
}
