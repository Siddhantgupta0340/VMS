import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

const variantClasses = {
  default: {
    icon: "bg-blue-50 text-blue-600",
    action: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600",
    action: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
  },
  destructive: {
    icon: "bg-red-50 text-red-600",
    action: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  },
};

const ConfirmationModal = ({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  disabled = false,
  onCancel,
  onConfirm,
  ariaLabel,
}) => {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const styles = variantClasses[variant] || variantClasses.default;

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActiveElement?.focus?.();
    };
  }, [loading, onCancel, open]);

  if (!open) return null;

  const actionDisabled = disabled || loading;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
        aria-label="Close confirmation dialog"
        onClick={() => {
          if (!loading) onCancel?.();
        }}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-labelledby="confirmation-modal-title"
        aria-describedby={description ? "confirmation-modal-description" : undefined}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
          <div className={`mt-0.5 rounded-xl p-2.5 ${styles.icon}`}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirmation-modal-title" className="text-lg font-bold text-slate-950">
              {title}
            </h2>
            {description && (
              <p id="confirmation-modal-description" className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {children && <div className="px-6 py-5">{children}</div>}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionDisabled}
            className={`inline-flex justify-center items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles.action}`}
          >
            {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmationModal;
