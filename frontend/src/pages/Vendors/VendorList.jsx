import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

import ConfirmationModal from "../../components/common/ConfirmationModal";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import VendorDocumentsPanel from "../../components/vendors/VendorDocumentsPanel";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, PERMISSIONS, ROLES } from "../../config/permissions";
import { getErrorMessage, notify } from "../../utils/feedback";
import {
  approveVendor,
  blockVendor,
  getVendors,
  holdVendor,
  rejectVendor,
  returnVendorToPending,
} from "../../services/vendorService";
import { emitNotificationsChanged } from "../../services/notificationService";

const inputClass = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending Review", value: "pending" },
  { label: "On Hold / Blocked", value: "blocked" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const initialReviewForm = {
  reason: "",
  correctiveAction: "",
  followUpDate: "",
  blockCategory: "",
  remarks: "",
};

const actionRequiresReason = (type) => ["reject", "hold", "block", "pending"].includes(type);

const buildActionPayload = (type, form) => ({
  ...(actionRequiresReason(type) && { reason: form.reason.trim() }),
  ...(type === "hold" && { correctiveAction: form.correctiveAction.trim() }),
  ...(type === "hold" && form.followUpDate && { followUpDate: form.followUpDate }),
  ...(type === "block" && form.blockCategory.trim() && { blockCategory: form.blockCategory.trim() }),
  ...(form.remarks.trim() && { remarks: form.remarks.trim() }),
});

const canShowReviewActions = (vendor) => vendor.status === "pending";
const canShowApproveAction = (vendor) => canShowReviewActions(vendor) && Boolean(vendor.approvalReadiness?.ready);
const canShowReturnPending = (vendor) => ["blocked", "rejected"].includes(vendor.status);
const canShowBlockAction = (vendor) => ["pending", "active", "approved"].includes(vendor.status);
const getReadinessReasons = (readiness = {}) => {
  const reasons = readiness.reasons?.length
    ? readiness.reasons
    : [
        ...(readiness.missing || []).map((field) => `Missing ${field}`),
        ...(readiness.missingDocuments || []).map((document) => `Missing ${document}`),
        ...(readiness.invalid || []),
      ];
  return reasons.length ? reasons : ["No blocking issues reported."];
};

const StatCard = ({ title, value, tone = "blue" }) => {
  const tones = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    green: "text-emerald-700 bg-emerald-50 border-emerald-100",
    red: "text-red-700 bg-red-50 border-red-100",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-3 inline-flex rounded-xl border px-3 py-2 text-2xl font-bold ${tones[tone]}`}>
        {value}
      </p>
    </section>
  );
};

const VendorReviewDrawer = ({ vendor, onClose, canManageDocuments = false }) => {
  if (!vendor) return null;

  const details = [
    ["Vendor Code", vendor.vendorCode],
    ["Legal / Display Name", vendor.companyName],
    ["Category", vendor.category],
    ["Status", vendor.status],
    ["Tax ID / GST", vendor.gst],
    ["Contact Person", vendor.contactPerson],
    ["Email", vendor.email],
    ["Phone", vendor.phone],
    ["Address", vendor.address],
    ["City", vendor.city],
    ["State", vendor.state],
    ["Postal Code", vendor.postalCode],
    ["Bank Account", vendor.maskedBankAccountNo || "Not provided"],
    ["IFSC", vendor.ifscCode],
    ["Payment Terms", vendor.paymentTerms],
    ["Created By", vendor.createdBy],
    ["Approved By", vendor.approvedBy],
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Close vendor review"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-4xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Finance Review</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{vendor.companyName}</h2>
            <p className="mt-1 text-sm text-slate-500">{vendor.vendorCode}</p>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{value || "Not provided"}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <VendorDocumentsPanel vendorId={vendor.id} initialDocuments={vendor.documents || []} readOnly={!canManageDocuments} />
          </div>
        </div>
      </aside>
    </div>
  );
};

const VendorList = () => {
  const { user } = useAuth();
  const isFinanceHead = user?.role === ROLES.FINANCE_HEAD;
  const canReviewVendors = hasPermission(user, PERMISSIONS.REVIEW_VENDORS);
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, blocked: 0, onHold: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 10, sortField: "created_at", sortOrder: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [actionLoading, setActionLoading] = useState(false);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getVendors(filters);
      setVendors(result.vendors);
      setSummary(result.summary);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      setError(getErrorMessage(err, "Vendor review data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const openAction = (type, vendor) => {
    setPendingAction({ type, vendor });
    setReviewForm(initialReviewForm);
  };

  const closeAction = () => {
    if (actionLoading) return;
    setPendingAction(null);
    setReviewForm(initialReviewForm);
  };

  const submitAction = async () => {
    if (!pendingAction) return;
    if (actionRequiresReason(pendingAction.type) && !reviewForm.reason.trim()) {
      notify.error("A reason is required for this Finance review action.");
      return;
    }
    if (pendingAction.type === "hold" && !reviewForm.correctiveAction.trim()) {
      notify.error("Corrective action is required before placing a vendor on hold.");
      return;
    }

    try {
      setActionLoading(true);
      const payload = buildActionPayload(pendingAction.type, reviewForm);
      if (pendingAction.type === "approve") {
        await approveVendor(pendingAction.vendor.id, payload);
        notify.success("Vendor approved successfully.");
      } else if (pendingAction.type === "reject") {
        await rejectVendor(pendingAction.vendor.id, payload);
        notify.success("Vendor rejected successfully.");
      } else if (pendingAction.type === "hold") {
        await holdVendor(pendingAction.vendor.id, payload);
        notify.success("Vendor placed on hold.");
      } else if (pendingAction.type === "block") {
        await blockVendor(pendingAction.vendor.id, payload);
        notify.success("Vendor blocked successfully.");
      } else if (pendingAction.type === "pending") {
        await returnVendorToPending(pendingAction.vendor.id, payload);
        notify.success("Vendor returned to pending review.");
      }
      setPendingAction(null);
      setReviewForm(initialReviewForm);
      await loadVendors();
      emitNotificationsChanged();
    } catch (err) {
      notify.error(getErrorMessage(err, "Vendor review action failed."));
    } finally {
      setActionLoading(false);
    }
  };

  const actionTitle = {
    approve: "Approve Vendor",
    reject: "Reject Vendor",
    hold: "Place Vendor On Hold",
    block: "Block Vendor",
    pending: "Return Vendor To Pending",
  }[pendingAction?.type] || "Vendor Review";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendor Finance Review</h1>
          <p className="mt-2 text-slate-500">Review vendor identity, compliance, banking, and approval status from database records.</p>
        </div>
        {!isFinanceHead && (
          <Link to="/vendors/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700">
            <Plus size={18} />
            Add Vendor
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pending Review" value={summary.pending} />
        <StatCard title="On Hold / Blocked" value={summary.onHold} tone="amber" />
        <StatCard title="Approved" value={summary.approved} tone="green" />
        <StatCard title="Rejected" value={summary.rejected} tone="red" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            className={`${inputClass} lg:w-96`}
            placeholder="Search vendor name, code, email, or tax ID"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
          <select className={inputClass} value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={loadVendors}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Loading vendor reviews...
          </div>
        ) : vendors.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created By</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{vendor.companyName}</p>
                      <p className="mt-1 text-xs text-slate-500">{vendor.vendorCode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-900">{vendor.contactPerson || "Not provided"}</p>
                      <p className="mt-1 text-xs text-slate-500">{vendor.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{vendor.category || "Not provided"}</td>
                    <td className="px-5 py-4"><StatusBadge status={vendor.status === "blocked" ? "on hold" : vendor.status} /></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{vendor.createdBy}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isFinanceHead ? (
                          <Link
                            to={`/finance-head/vendors/${vendor.id}/review`}
                            aria-label={`View details for ${vendor.companyName}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            View Details
                          </Link>
                        ) : (
                          <button
                            type="button"
                            aria-label={`View details for ${vendor.companyName}`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                            onClick={() => setSelectedVendor(vendor)}
                          >
                            View Details
                          </button>
                        )}
                        {!isFinanceHead && (
                          <Link
                            to={`/vendors/${vendor.id}/edit`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            Edit
                          </Link>
                        )}
                        {canReviewVendors && canShowReviewActions(vendor) && (
                          <>
                            {canShowApproveAction(vendor) && (
                              <button type="button" className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700" onClick={() => openAction("approve", vendor)} title="Approve" aria-label={`Approve ${vendor.companyName}`}>
                                <Check size={16} />
                              </button>
                            )}
                            <button type="button" className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700" onClick={() => openAction("reject", vendor)} title="Reject">
                              <X size={16} />
                            </button>
                            <button type="button" className="rounded-lg bg-amber-600 p-2 text-white hover:bg-amber-700" onClick={() => openAction("hold", vendor)} title="Place on hold">
                              <AlertTriangle size={16} />
                            </button>
                          </>
                        )}
                        {canReviewVendors && canShowBlockAction(vendor) && (
                            <button type="button" className="rounded-lg bg-slate-800 p-2 text-white hover:bg-slate-900" onClick={() => openAction("block", vendor)} title="Block vendor">
                              <AlertTriangle size={16} />
                            </button>
                        )}
                        {canReviewVendors && canShowReturnPending(vendor) && (
                          <button type="button" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" onClick={() => openAction("pending", vendor)} title="Return to pending">
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No vendor reviews found" description="No database records match the current filters." />
        )}
      </section>

      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} - {pagination.total} records
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: Math.min(pagination.totalPages, current.page + 1) }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <VendorReviewDrawer vendor={selectedVendor} onClose={() => setSelectedVendor(null)} canManageDocuments={canReviewVendors} />

      <ConfirmationModal
        open={Boolean(pendingAction)}
        title={actionTitle}
        description={pendingAction ? `${pendingAction.vendor.companyName} (${pendingAction.vendor.vendorCode})` : ""}
        confirmLabel={pendingAction?.type === "approve" ? "Approve" : "Confirm"}
        variant={["reject", "block"].includes(pendingAction?.type) ? "destructive" : pendingAction?.type === "hold" ? "warning" : "default"}
        loading={actionLoading}
        disabled={
          Boolean(pendingAction) &&
          (
            (actionRequiresReason(pendingAction.type) && !reviewForm.reason.trim()) ||
            (pendingAction.type === "hold" && !reviewForm.correctiveAction.trim())
          )
        }
        onCancel={closeAction}
        onConfirm={submitAction}
      >
        <div className="space-y-4">
          {pendingAction?.type === "approve" && pendingAction.vendor.approvalReadiness && (
            <div className={`rounded-xl border p-3 text-sm ${pendingAction.vendor.approvalReadiness.ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <p className="font-semibold">
                {pendingAction.vendor.approvalReadiness.ready
                  ? "Legal, tax, contact, banking, and required document checks are complete."
                  : "Approval is blocked by incomplete vendor readiness."}
              </p>
              <p className="mt-2">Bank verification: {pendingAction.vendor.approvalReadiness.bankVerification?.status || "not provided"}</p>
              <p className="mt-1">Documents: {(pendingAction.vendor.approvalReadiness.documents?.uploaded || 0)} uploaded</p>
              {!pendingAction.vendor.approvalReadiness.ready && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {getReadinessReasons(pendingAction.vendor.approvalReadiness).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {actionRequiresReason(pendingAction?.type) && (
            <label className="block text-sm font-semibold text-slate-700">
              Reason *
              <textarea
                className="mt-2 h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={reviewForm.reason}
                onChange={(event) => setReviewForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Enter the decision reason"
              />
            </label>
          )}

          {pendingAction?.type === "hold" && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                Corrective action *
                <textarea
                  className="mt-2 h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={reviewForm.correctiveAction}
                  onChange={(event) => setReviewForm((current) => ({ ...current, correctiveAction: event.target.value }))}
                  placeholder="Describe what the vendor must correct"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Follow-up date
                <input
                  type="date"
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                  value={reviewForm.followUpDate}
                  onChange={(event) => setReviewForm((current) => ({ ...current, followUpDate: event.target.value }))}
                />
              </label>
            </>
          )}

          {pendingAction?.type === "block" && (
            <label className="block text-sm font-semibold text-slate-700">
              Block category
              <input
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                value={reviewForm.blockCategory}
                onChange={(event) => setReviewForm((current) => ({ ...current, blockCategory: event.target.value }))}
                placeholder="Compliance, banking, legal, or operational"
              />
            </label>
          )}

          <label className="block text-sm font-semibold text-slate-700">
            Comments
            <textarea
              className="mt-2 h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={reviewForm.remarks}
              onChange={(event) => setReviewForm((current) => ({ ...current, remarks: event.target.value }))}
              placeholder="Add optional Finance review comments"
            />
          </label>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default VendorList;
