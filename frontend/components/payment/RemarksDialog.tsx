import React, { useState } from 'react';

interface RemarksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  title: string;
  placeholder: string;
  submitButtonText: string;
  submitButtonColor: string;
  isPending?: boolean;
  isRequired?: boolean;
}

export default function RemarksDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder,
  submitButtonText,
  submitButtonColor,
  isPending = false,
  isRequired = false,
}: RemarksDialogProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRequired && !text.trim()) {
      setError('This field is required.');
      return;
    }
    setError('');
    onSubmit(text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-zinc-950/60 dark:bg-black/80"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white dark:bg-zinc-900 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-150 dark:border-zinc-800">
          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">{title}</h3>
            </div>
            
            <div className="px-6 py-4">
              <label htmlFor="payment-remarks" className="sr-only">Remarks</label>
              <textarea
                id="payment-remarks"
                rows={4}
                className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-950 dark:text-zinc-50 placeholder-gray-400 dark:placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
                placeholder={placeholder}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error && e.target.value.trim()) setError('');
                }}
                disabled={isPending}
              />
              {error && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-450 font-medium">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition duration-150 disabled:opacity-50"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition duration-150 flex items-center gap-1.5 disabled:opacity-50 ${submitButtonColor}`}
                disabled={isPending}
              >
                {isPending && (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
