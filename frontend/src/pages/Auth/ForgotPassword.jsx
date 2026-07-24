import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { forgotPassword } from "../../services/authService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setSuccessNotice("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await forgotPassword({ email: trimmedEmail });

      if (result.success) {
        const msg = result.message || "If an account exists for this email address, password reset instructions have been sent.";
        setSuccessNotice(msg);
        toast.success(msg);

        setTimeout(() => {
          navigate("/reset-password", { state: { email: trimmedEmail } });
        }, 1500);
      } else {
        const errMsg = result.message || "Unable to process request. Please try again.";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      console.error("[ForgotPassword] Error:", err);
      setError("Server is temporarily unavailable. Please try again later.");
      toast.error("Unable to send reset instructions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#eef4ff_100%)] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-slate-900/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-6"
          >
            <ArrowLeft size={16} /> Back to Sign In
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-black shadow-md">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">Forgot Password</h1>
              <p className="text-xs text-slate-500">Enter email to receive reset instructions</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {successNotice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
              {successNotice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter your registered email address"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? "Sending reset instructions..." : "Send Reset Link"}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Already have an OTP?{" "}
              <Link to="/reset-password" className="font-semibold text-blue-600 hover:underline">
                Reset Password directly
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
