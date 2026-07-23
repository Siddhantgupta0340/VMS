import { AlertTriangle } from "lucide-react";

export const RequiredLabel = ({ children, helper }) => (
  <span className="mb-2 block text-sm font-semibold text-slate-700">
    {children} <span className="text-red-600">*</span>
    {helper && <span className="mt-1 block text-xs font-medium text-slate-500">{helper}</span>}
  </span>
);

export const ValidationSummary = ({ title = "Cannot save record.", errors = [], onSelect }) => {
  if (!errors.length) return null;
  return (
    <section
      tabIndex={-1}
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 font-medium">Please complete:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {errors.map((error) => (
              <button
                key={`${error.field}-${error.message}`}
                type="button"
                onClick={() => onSelect?.(error.field)}
                className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {error.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
