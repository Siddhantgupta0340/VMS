import { useState, useEffect } from "react";
import { Bell, Check, Eye } from "lucide-react";
import { getNotifications, markAllRead, markRead } from "../../services/notificationService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NotificationsList = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data.notifications);
      const unread = data.notifications.filter((n) => !n.isRead).length;
      setTotalUnread(unread);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update notifications");
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await markRead(n.id);
      }
      
      // Navigate depending on entity type
      if (n.entityType === "invoice") {
        navigate(`/invoices/${n.entityId}`);
      } else if (n.entityType === "vendor") {
        navigate("/vendors");
      } else if (n.entityType === "payment") {
        navigate("/payments");
      }
      
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        Loading Notifications...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-blue-600 animate-pulse" />
            In-App Notifications
          </h1>
          <p className="mt-2 text-slate-500">
            Stay updated with vendor verifications, match audits, and workflow approvals
          </p>
        </div>

        {totalUnread > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Check size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications List container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {notifications.length > 0 ? (
          <div className="divide-y">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-5 flex items-start gap-4 hover:bg-slate-50 cursor-pointer transition ${
                  !n.isRead ? "bg-blue-50/10 border-l-4 border-blue-600 pl-4" : "pl-5"
                }`}
              >
                <div className={`p-2.5 rounded-full shrink-0 ${
                  !n.isRead ? "bg-blue-100 text-blue-700 font-bold" : "bg-slate-100 text-slate-500"
                }`}>
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className={`text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 italic">
            You have no notifications at this time.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsList;
export { NotificationsList };
