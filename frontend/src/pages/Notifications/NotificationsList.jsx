import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Inbox,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteNotification,
  getNotifications,
  markAllRead,
  markRead,
} from "../../services/notificationService";
import { useNotifications } from "../../context/NotificationContext";

const PAGE_SIZE = 10;

const getNotificationIcon = (notification) => {
  const entityType = notification.entityType;
  const type = notification.type || "";

  if (entityType === "invoice") return FileText;
  if (entityType === "payment") return CreditCard;
  if (entityType === "user" || type.startsWith("user_")) return User;
  return Bell;
};

const formatDateTime = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const NotificationsList = () => {
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readFilter, setReadFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [mutatingId, setMutatingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: PAGE_SIZE,
    };
    if (readFilter === "read") params.isRead = true;
    if (readFilter === "unread") params.isRead = false;
    if (entityTypeFilter !== "all") params.entityType = entityTypeFilter;
    if (createdFrom) params.createdFrom = createdFrom;
    if (createdTo) params.createdTo = createdTo;
    return params;
  }, [createdFrom, createdTo, entityTypeFilter, page, readFilter]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotifications(queryParams);
      setNotifications(data.notifications);
      setTotal(data.total);
      setTotalPages(Math.max(data.totalPages || 1, 1));
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setError("Notifications could not be loaded. Please try again.");
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const refreshAll = useCallback(async () => {
    await loadNotifications();
    await refreshUnreadCount();
  }, [loadNotifications, refreshUnreadCount]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllRead();
      toast.success("All notifications marked as read");
      await refreshAll();
    } catch {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (notification) => {
    if (notification.isRead) return;
    try {
      setMutatingId(notification.id);
      await markRead(notification.id);
      toast.success("Notification marked as read");
      await refreshAll();
    } catch {
      toast.error("Failed to mark notification as read");
    } finally {
      setMutatingId("");
    }
  };

  const handleDismiss = async (notification) => {
    try {
      setMutatingId(notification.id);
      await deleteNotification(notification.id);
      toast.success("Notification dismissed");
      if (notifications.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await refreshAll();
      }
    } catch {
      toast.error("Failed to dismiss notification");
    } finally {
      setMutatingId("");
    }
  };

  const resetFilters = () => {
    setReadFilter("all");
    setEntityTypeFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 md:text-3xl">
            <Bell className="text-blue-600" size={28} />
            Notifications
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review workflow, account, invoice, vendor, and payment updates assigned to you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={refreshAll}
            type="button"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={markingAll || unreadCount === 0}
            onClick={handleMarkAllRead}
            type="button"
          >
            <Check size={16} />
            {markingAll ? "Updating..." : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              onChange={(event) => {
                setReadFilter(event.target.value);
                setPage(1);
              }}
              value={readFilter}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Module
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              onChange={(event) => {
                setEntityTypeFilter(event.target.value);
                setPage(1);
              }}
              value={entityTypeFilter}
            >
              <option value="all">All modules</option>
              <option value="vendor">Vendors</option>
              <option value="purchase_order">Purchase Orders</option>
              <option value="invoice">Invoices</option>
              <option value="payment">Payments</option>
              <option value="user">Users</option>
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            From
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              onChange={(event) => {
                setCreatedFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              value={createdFrom}
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            To
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
              onChange={(event) => {
                setCreatedTo(event.target.value);
                setPage(1);
              }}
              type="date"
              value={createdTo}
            />
          </label>

          <div className="flex items-end">
            <button
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={resetFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-500">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertCircle className="text-red-500" size={32} />
            <p className="font-semibold text-slate-900">{error}</p>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={refreshAll}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification);
              const isBusy = mutatingId === notification.id;

              return (
                <article
                  className={`flex gap-4 p-4 transition ${
                    notification.isRead ? "bg-white" : "bg-blue-50/50"
                  }`}
                  key={notification.id}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      notification.isRead ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h2 className={`truncate text-sm ${notification.isRead ? "font-semibold text-slate-700" : "font-bold text-slate-950"}`}>
                          {notification.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>
                      </div>

                      <time className="shrink-0 text-xs text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </time>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">

                      {notification.entityType === "payment" && notification.entityId && (
                        <Link
                          to={`/payments?id=${notification.entityId}`}
                          onClick={() => handleMarkRead(notification)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Eye size={14} />
                          View Payment Request
                        </Link>
                      )}

                      {!notification.isRead && (
                        <button
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isBusy}
                          onClick={() => handleMarkRead(notification)}
                          type="button"
                        >
                          <CheckCircle2 size={14} /> 
                          Mark read
                        </button>
                      )}

                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isBusy}
                        onClick={() => handleDismiss(notification)}
                        type="button"
                      >
                        <Trash2 size={14} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <Inbox className="text-slate-400" size={36} />
            <div>
              <p className="font-semibold text-slate-900">No notifications found</p>
              <p className="mt-1 text-sm text-slate-500">
                New workflow and account updates will appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <span>
          Showing page {page} of {totalPages} ({total} total)
        </span>

        <div className="flex items-center gap-2">
          <button
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsList;
export { NotificationsList };
