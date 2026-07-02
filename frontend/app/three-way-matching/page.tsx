'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  useInvoices,
  useInvoiceMatching,
  useStartMatching,
  useAdminApproveInvoice,
  useAdminRejectInvoice,
} from '@/hooks/useInvoices';
import { useGRNsByPurchaseOrder } from '@/hooks/useInvoices';
import {
  Scale,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import RemarksDialog from '@/components/invoice/RemarksDialog';
import { toast } from 'sonner';
import type { MatchFieldResult } from '@/types/invoice';

interface RowData {
  field: string;
  label: string;
  po_value: string | number;
  grn_value: string | number;
  invoice_value: string | number;
  status: 'MATCHED' | 'UNMATCHED' | 'WARNING';
  mandatory: boolean;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function ThreeWayMatchingBoard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedGRNId, setSelectedGRNId] = useState<string>('');
  const [showOnlyMismatches, setShowOnlyMismatches] = useState<boolean>(false);
  const [isAdminApproveOpen, setIsAdminApproveOpen] = useState(false);
  const [isAdminRejectOpen, setIsAdminRejectOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('vms_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setTimeout(() => {
          setUser(parsed);
        }, 0);
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
  }, []);

  // Fetch invoices currently in pending matching or other active states
  const { data: invoicesData } = useInvoices({
    limit: 100,
  });

  const invoices = invoicesData?.invoices || [];

  // Filter invoices that need matching
  const matchingInvoices = invoices.filter(
    (inv) =>
      inv.status === 'PENDING_THREE_WAY_MATCH' ||
      inv.status === 'PENDING_ADMIN_REVIEW' ||
      inv.three_way_match_status !== null
  );

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // Fetch GRNs associated with the selected invoice's purchase order
  const poId = selectedInvoice?.purchase_order_id || '';
  const { data: grnsData } = useGRNsByPurchaseOrder(poId);
  const grns = grnsData?.data || [];

  // Fetch existing matching reports for selected invoice
  const { data: matchingReportsData, refetch: refetchMatching } = useInvoiceMatching(selectedInvoiceId);
  const matchingReports = matchingReportsData?.data || [];
  const activeReport = matchingReports[0]; // Get the latest matching report

  const startMatchingMutation = useStartMatching();
  const adminApproveMutation = useAdminApproveInvoice();
  const adminRejectMutation = useAdminRejectInvoice();

  const handleStartMatching = () => {
    if (!selectedInvoiceId) {
      toast.error('Please select an invoice first.');
      return;
    }
    startMatchingMutation.mutate(
      { invoiceId: selectedInvoiceId, grnId: selectedGRNId || undefined },
      {
        onSuccess: (res: unknown) => {
          const response = res as { message?: string };
          toast.success(response.message || 'Three-way matching completed successfully.');
          refetchMatching();
        },
        onError: (err: unknown) => {
          const error = err as ApiErrorResponse;
          toast.error(error.response?.data?.message || 'Failed to complete matching.');
        },
      }
    );
  };

  const handleAdminApprove = (remarks: string) => {
    if (!selectedInvoiceId) return;
    adminApproveMutation.mutate(
      { id: selectedInvoiceId, remarks },
      {
        onSuccess: () => {
          toast.success('Matching report approved. Invoice advanced to Team Lead.');
          setIsAdminApproveOpen(false);
          router.push('/invoices/pending');
        },
        onError: (err: unknown) => {
          const error = err as ApiErrorResponse;
          toast.error(error.response?.data?.message || 'Failed to approve report.');
        },
      }
    );
  };

  const handleAdminReject = (remarks: string) => {
    if (!selectedInvoiceId) return;
    adminRejectMutation.mutate(
      { id: selectedInvoiceId, remarks },
      {
        onSuccess: () => {
          toast.success('Matching report rejected. Returned to Case Manager.');
          setIsAdminRejectOpen(false);
          router.push('/invoices/pending');
        },
        onError: (err: unknown) => {
          const error = err as ApiErrorResponse;
          toast.error(error.response?.data?.message || 'Failed to reject report.');
        },
      }
    );
  };

  // Export comparison table to Excel
  const exportToExcel = () => {
    if (!activeReport) return;
    const poSnap = (activeReport.po_snapshot as Record<string, unknown>) || {};
    const grnSnap = (activeReport.grn_snapshot as Record<string, unknown>) || {};
    const invSnap = (activeReport.invoice_snapshot as Record<string, unknown>) || {};

    const rows = (activeReport.unmatched_fields as unknown as RowData[] || []).concat(
      (activeReport.matched_fields as string[] || []).map((f: string) => ({
        field: f,
        label: f.replace(/_/g, ' ').toUpperCase(),
        po_value: poSnap[f] !== undefined ? String(poSnap[f]) : 'N/A',
        grn_value: grnSnap[f] !== undefined ? String(grnSnap[f]) : 'N/A',
        invoice_value: invSnap[f] !== undefined ? String(invSnap[f]) : 'N/A',
        status: 'MATCHED' as const,
        mandatory: true,
      }))
    );

    const worksheetData = rows.map((r) => ({
      Field: r.label,
      'Purchase Order Value': r.po_value,
      'Goods Receipt Value': r.grn_value,
      'Invoice Value': r.invoice_value,
      Status: r.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparison Report');
    XLSX.writeFile(workbook, `3WM_Report_${selectedInvoice?.invoice_number}.xlsx`);
    toast.success('Report exported to Excel successfully.');
  };

  // Export comparison report to PDF
  const exportToPDF = () => {
    if (!activeReport || !selectedInvoice) return;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('VMS Enterprise AP Control Room', 20, 20);
    doc.setFontSize(14);
    doc.text(`Three-Way Matching Report - Invoice ${selectedInvoice.invoice_number}`, 20, 30);

    doc.setFontSize(10);
    doc.text(`Match Percentage: ${activeReport.match_percentage}%`, 20, 45);
    doc.text(`Overall Status: ${activeReport.status}`, 20, 52);
    doc.text(`PO Number: ${selectedInvoice.purchase_order?.po_number}`, 20, 59);
    doc.text(`Vendor: ${selectedInvoice.vendor?.name}`, 20, 66);
    doc.text(`Date of Report: ${new Date().toLocaleDateString()}`, 20, 73);

    let y = 90;
    doc.setFontSize(12);
    doc.text('Discrepancy Details Table', 20, y);
    y += 10;

    doc.setFontSize(9);
    doc.text('Field Name', 20, y);
    doc.text('PO Value', 70, y);
    doc.text('GRN Value', 110, y);
    doc.text('Invoice Value', 150, y);
    doc.text('Status', 180, y);
    doc.line(20, y + 2, 195, y + 2);
    y += 8;

    const poSnap = (activeReport.po_snapshot as Record<string, unknown>) || {};
    const grnSnap = (activeReport.grn_snapshot as Record<string, unknown>) || {};
    const invSnap = (activeReport.invoice_snapshot as Record<string, unknown>) || {};

    const allFields = (activeReport.unmatched_fields as unknown as RowData[] || []).concat(
      (activeReport.matched_fields as string[] || []).map((f: string) => ({
        field: f,
        label: f.replace(/_/g, ' ').toUpperCase(),
        po_value: poSnap[f] !== undefined ? String(poSnap[f]) : 'N/A',
        grn_value: grnSnap[f] !== undefined ? String(grnSnap[f]) : 'N/A',
        invoice_value: invSnap[f] !== undefined ? String(invSnap[f]) : 'N/A',
        status: 'MATCHED' as const,
        mandatory: true,
      }))
    );

    allFields.forEach((r) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(r.label || r.field || ''), 20, y);
      doc.text(String(r.po_value || ''), 70, y);
      doc.text(String(r.grn_value || ''), 110, y);
      doc.text(String(r.invoice_value || ''), 150, y);
      doc.text(String(r.status || ''), 180, y);
      y += 6;
    });

    doc.save(`3WM_Report_${selectedInvoice.invoice_number}.pdf`);
    toast.success('Report exported to PDF successfully.');
  };

  const isCaseManager = user?.role === 'CASE_MANAGER';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Filters results
  const unmatchedList = (activeReport?.unmatched_fields as unknown as MatchFieldResult[] || []).map((f) => ({
    field: f.field,
    label: f.label || f.field.replace(/_/g, ' ').toUpperCase(),
    po_value: f.po_value,
    grn_value: f.grn_value,
    invoice_value: f.invoice_value,
    status: f.status,
    mandatory: f.mandatory,
  }));

  const poSnap = (activeReport?.po_snapshot as Record<string, unknown>) || {};
  const grnSnap = (activeReport?.grn_snapshot as Record<string, unknown>) || {};
  const invSnap = (activeReport?.invoice_snapshot as Record<string, unknown>) || {};

  const matchedList = (activeReport?.matched_fields as string[] || []).map((f: string) => ({
    field: f,
    label: f.replace(/_/g, ' ').toUpperCase(),
    po_value: poSnap[f] !== undefined ? String(poSnap[f]) : 'N/A',
    grn_value: grnSnap[f] !== undefined ? String(grnSnap[f]) : 'N/A',
    invoice_value: invSnap[f] !== undefined ? String(invSnap[f]) : 'N/A',
    status: 'MATCHED' as const,
    mandatory: true,
  }));

  const allFieldsToDisplay: RowData[] = unmatchedList.concat(matchedList);
  const displayedFields = showOnlyMismatches
    ? allFieldsToDisplay.filter((f) => f.status !== 'MATCHED')
    : allFieldsToDisplay;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Sidebar user={user} />
      <div className="flex-1 overflow-y-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-55 flex items-center gap-2">
                <Scale className="h-8 w-8 text-indigo-650 dark:text-indigo-400" />
                Three-Way Matching Board
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                Ensure compliance by validating values across purchase orders, goods receipt notes, and invoices.
              </p>
            </div>
          </div>

          {/* Config Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-6 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-55 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
              Match Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-450 uppercase tracking-wide mb-2">
                  Select Active Invoice
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    setSelectedGRNId('');
                  }}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Invoice --</option>
                  {matchingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.vendor?.name} (INR {Number(inv.amount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-455 uppercase tracking-wide mb-2">
                  Select Associated GRN (Optional)
                </label>
                <select
                  value={selectedGRNId}
                  onChange={(e) => setSelectedGRNId(e.target.value)}
                  disabled={!selectedInvoiceId}
                  className="w-full rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-sm text-gray-955 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Choose GRN (Default Snapshot otherwise) --</option>
                  {grns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grn_number} - {g.delivery_challan_no || 'No Challan'} ({new Date(g.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleStartMatching}
                  disabled={!selectedInvoiceId || startMatchingMutation.isPending || (!isCaseManager && !isSuperAdmin)}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-705 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10"
                >
                  {startMatchingMutation.isPending ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Scale className="h-4.5 w-4.5" />
                  )}
                  Calculate Match Report
                </button>
              </div>
            </div>
            {!isCaseManager && !isSuperAdmin && selectedInvoiceId && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-955/20 px-3 py-2 rounded-lg border border-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Only Case Managers can initiate three-way matching calculations. You can view the report below.
              </p>
            )}
          </div>

          {/* Results dashboard area */}
          {activeReport && selectedInvoice && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary widget */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-55 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                    Comparison Summary
                  </h3>
                  <div className="flex flex-col items-center py-6">
                    <div className="relative flex items-center justify-center">
                      {/* Round percentage display */}
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-zinc-50">
                        {String(activeReport.match_percentage)}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 mt-2 font-semibold">
                      Fields Match Accuracy
                    </span>

                    <div className="mt-6 w-full space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Overall status</span>
                        <span
                          className={`font-bold uppercase ${
                            activeReport.status === 'MATCHED'
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {activeReport.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Recommendation</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {activeReport.approval_recommendation}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-550">Admin Match status</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {activeReport.admin_review_status || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Admin Review */}
                  {isSuperAdmin && activeReport.admin_review_status === 'PENDING' && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                      <button
                        type="button"
                        onClick={() => setIsAdminApproveOpen(true)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Match
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdminRejectOpen(true)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject & Terminate
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF/Excel Downloads */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-55 border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                    Export Reports
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={exportToPDF}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-zinc-750 text-gray-750 dark:text-zinc-350 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 rounded-lg text-xs font-bold transition"
                    >
                      <Download className="h-4 w-4 text-rose-500" />
                      PDF Report
                    </button>
                    <button
                      type="button"
                      onClick={exportToExcel}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-zinc-750 text-gray-750 dark:text-zinc-350 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 rounded-lg text-xs font-bold transition"
                    >
                      <Download className="h-4 w-4 text-emerald-500" />
                      Excel Sheets
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-855 p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-55">
                      Comparison Table
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="mismatches-only"
                        checked={showOnlyMismatches}
                        onChange={(e) => setShowOnlyMismatches(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                      />
                      <label htmlFor="mismatches-only" className="text-xs text-gray-500 font-bold">
                        Only Mismatches
                      </label>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-zinc-800 text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-zinc-900/50">
                          <th className="py-2.5 px-3">Field Name</th>
                          <th className="py-2.5 px-3">PO Value</th>
                          <th className="py-2.5 px-3">GRN Value</th>
                          <th className="py-2.5 px-3">Invoice Value</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {displayedFields.map((f) => (
                          <tr
                            key={f.field}
                            className={`hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors ${
                              f.status !== 'MATCHED' ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-semibold text-gray-900 dark:text-zinc-50">
                              {f.label}
                            </td>
                            <td className="py-3 px-3 text-gray-600 dark:text-zinc-350 truncate max-w-xs">
                              {String(f.po_value || '-')}
                            </td>
                            <td className="py-3 px-3 text-gray-600 dark:text-zinc-350 truncate max-w-xs">
                              {String(f.grn_value || '-')}
                            </td>
                            <td className="py-3 px-3 text-gray-600 dark:text-zinc-350 truncate max-w-xs">
                              {String(f.invoice_value || '-')}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  f.status === 'MATCHED'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                    : f.status === 'WARNING'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                                }`}
                              >
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!activeReport && selectedInvoiceId && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-855 p-8 rounded-2xl text-center">
              <Search className="h-12 w-12 text-zinc-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">No Matching Report Calculated</h3>
              <p className="text-xs text-gray-505 mt-2">
                Click &quot;Calculate Match Report&quot; to fetch document snapshots and calculate match accuracy.
              </p>
            </div>
          )}
        </div>
      </div>

      <RemarksDialog
        isOpen={isAdminApproveOpen}
        onClose={() => setIsAdminApproveOpen(false)}
        onSubmit={handleAdminApprove}
        title="Approve Match Report"
        placeholder="Enter optional remarks for authorizing this three-way match..."
        submitButtonText="Approve Report"
        submitButtonColor="bg-emerald-600 hover:bg-emerald-700"
      />

      <RemarksDialog
        isOpen={isAdminRejectOpen}
        onClose={() => setIsAdminRejectOpen(false)}
        onSubmit={handleAdminReject}
        title="Reject Match Report"
        placeholder="Provide the mandatory rejection remarks (e.g. Price difference mismatch)..."
        submitButtonText="Reject Report"
        submitButtonColor="bg-rose-600 hover:bg-rose-700"
        isRequired={true}
      />
    </div>
  );
}
