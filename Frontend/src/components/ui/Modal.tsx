import { useEffect, useRef, type PropsWithChildren } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: PropsWithChildren<ModalProps>) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={clsx(
          'card-bolted w-full max-w-lg rounded-2xl bg-chassis p-6 relative',
          'max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        <span className="screw top-3 left-3 opacity-40" />
        <span className="screw top-3 right-3 opacity-40" />
        <span className="screw bottom-3 left-3 opacity-40" />
        <span className="screw bottom-3 right-3 opacity-40" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="btn-physical rounded-lg bg-chassis p-1.5 text-label hover:text-ink"
          >
            <i className="ph-bold ph-x" style={{ fontSize: 16 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
