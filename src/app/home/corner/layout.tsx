import Jelly from '@/components/corner/Jelly';
import '@/components/corner/corner.css';

/** Every My Corner page, with Jelly floating along (she stays put between pages). */
export default function CornerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Jelly />
    </>
  );
}
