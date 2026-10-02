import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal surface. variant="drawer" slides in from the right (full-screen sheet on phones);
 * variant="center" is a centred panel. Escape closes, focus is trapped and restored.
 */
export default function Dialog({ open, onClose, title, subtitle, children, variant = 'drawer', labelId }) {
  return (
    <AnimatePresence>
      {open && (
        <DialogInner onClose={onClose} title={title} subtitle={subtitle} variant={variant} labelId={labelId}>
          {children}
        </DialogInner>
      )}
    </AnimatePresence>
  );
}

function DialogInner({ onClose, title, subtitle, children, variant, labelId }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab' && panelRef.current) {
        const els = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      if (prev && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
    };
  }, []);

  const drawer = variant === 'drawer';
  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={
          drawer
            ? 'absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-2xl sm:w-[min(600px,92vw)] sm:border-l sm:border-line'
            : 'absolute inset-0 m-auto flex h-fit max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl'
        }
        initial={drawer ? { x: 40, opacity: 0 } : { y: 12, opacity: 0 }}
        animate={drawer ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
        exit={drawer ? { x: 40, opacity: 0 } : { y: 12, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            {subtitle && <div className="eyebrow mb-0.5">{subtitle}</div>}
            <h2 id={labelId} className="text-lg font-semibold leading-snug text-ink sm:text-xl">
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost -mr-2 h-9 w-9 p-0"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </motion.div>
    </div>
  );
}
