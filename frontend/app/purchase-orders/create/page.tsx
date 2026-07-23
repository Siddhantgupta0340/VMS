'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import type { CreatePurchaseOrderPayload, Currency } from '@/types/purchase-order';

/**
 * Form field types — all strings because HTML inputs always return strings.
 * Numeric conversion is done in the submit handler before sending to the API.
 */
interface POFormValues {
  vendorId: string;
  poNumber: string;
  amount: string;
  currency: Currency;
  description: string;
  orderDate: string;
  expectedDeliveryDate: string;
}

const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const mutation = useCreatePurchaseOrder();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<POFormValues>({
    defaultValues: {
      currency: 'INR',
    },
  });

  /**
   * Called by React Hook Form only when all fields pass client-side validation.
   * Converts form strings to the correct types before sending to the API.
   */
  const onSubmit = async (formData: POFormValues) => {
    // ── Build the API payload ────────────────────────────────────────────────
    const payload: CreatePurchaseOrderPayload = {
      vendorId: formData.vendorId.trim(),
      amount: parseFloat(formData.amount),           // string → number
      currency: formData.currency || 'INR',
      ...(formData.poNumber?.trim() && { poNumber: formData.poNumber.trim() }),
      ...(formData.description?.trim() && { description: formData.description.trim() }),
      ...(formData.orderDate && { orderDate: formData.orderDate }),
      ...(formData.expectedDeliveryDate && { expectedDeliveryDate: formData.expectedDeliveryDate }),
    };

    // Log the payload for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CreatePO] Submitting payload:', payload);
    }

    await mutation.mutateAsync(payload);
    reset();
    router.push('/purchase-orders');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below to create a new purchase order for an approved vendor.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

            {/* Vendor ID */}
            <div>
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
                Vendor ID <span className="text-red-500">*</span>
              </label>
              <input
                id="vendorId"
                type="text"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                {...register('vendorId', {
                  required: 'Vendor ID is required',
                  pattern: {
                    value: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                    message: 'Vendor ID must be a valid UUID',
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.vendorId && (
                <p className="mt-1 text-xs text-red-500">{errors.vendorId.message}</p>
              )}
            </div>

            {/* Amount + Currency Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 50000"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' },
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  {...register('currency')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PO Number (optional) */}
            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                PO Number{' '}
                <span className="text-gray-400 font-normal">(auto-generated if left blank)</span>
              </label>
              <input
                id="poNumber"
                type="text"
                placeholder="e.g. PO-2024-001"
                {...register('poNumber')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Optional description or notes for this purchase order"
                {...register('description')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Order Date
                </label>
                <input
                  id="orderDate"
                  type="date"
                  {...register('orderDate')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery
                </label>
                <input
                  id="expectedDeliveryDate"
                  type="date"
                  {...register('expectedDeliveryDate')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* API Error Display */}
            {mutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700 font-medium">
                  {(mutation.error as any)?.response?.data?.message ||
                    mutation.error?.message ||
                    'Something went wrong. Please try again.'}
                </p>
                {/* Show field-level errors if the backend returns them */}
                {((mutation.error as any)?.response?.data?.errors ?? []).length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-red-600 space-y-1">
                    {((mutation.error as any)?.response?.data?.errors as any[]).map(
                      (e: any, i: number) => (
                        <li key={i}>{e.field ? `${e.field}: ${e.message}` : e.message}</li>
                      )
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting || mutation.isPending}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  'Create Purchase Order'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Debug Panel (dev only) */}
        {process.env.NODE_ENV === 'development' && mutation.data && (
          <details className="mt-6 rounded-lg bg-gray-100 border border-gray-200 p-4">
            <summary className="text-xs font-mono text-gray-500 cursor-pointer">
              [Debug] Last API Response
            </summary>
            <pre className="mt-2 text-xs text-gray-700 overflow-auto">
              {JSON.stringify(mutation.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
