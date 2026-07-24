import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Lock,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getDashboardPathForRole } from "../../config/roleDashboard";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();
  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const queryFrom = new URLSearchParams(location.search).get("from");
  const preservedRoute = location.state?.from?.pathname || queryRedirect || queryFrom;

  useEffect(() => {
    if (!bootstrapping && isAuthenticated && user) {
      navigate(preservedRoute || getDashboardPathForRole(user.role), { replace: true });
    }
  }, [bootstrapping, isAuthenticated, navigate, preservedRoute, user]);

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(formData);

      if (result.success) {
        if (result.requiresPasswordChange) {
          toast.info("Please change your temporary password to continue.");
          navigate("/change-temporary-password", { replace: true });
          return;
        }
        navigate(preservedRoute || getDashboardPathForRole(result.user?.role), { replace: true });
      } else {
        setError(result.message);
        toast.error(result.message);
      }
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
      <div className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#eef4ff_100%)]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-slate-900/10 blur-3xl" />
          <div className="absolute left-[10%] top-[18%] h-24 w-24 rounded-full border border-blue-200/70" />
          <div className="absolute right-[12%] top-[14%] h-32 w-32 rounded-full border border-slate-200/70" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[size:34px_34px] opacity-60" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
          <div className="hidden lg:flex lg:w-[58%] xl:w-[60%]">
            <div className="relative m-4 flex w-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] xl:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.15),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.25),_transparent_40%)]" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
                  <Building2 className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200/90">
                    Enterprise Suite
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Vendor Management
                  </h1>
                </div>
              </div>

              <div className="relative z-10 mt-14 max-w-xl">
                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-blue-100 backdrop-blur-sm">
                  Trusted by modern enterprises
                </div>
                <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                  Secure, intelligent procurement workflows for every team.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Centralize vendors, purchase orders, invoices, and approvals in a premium operating environment designed for scale.
                </p>
              </div>

              <div className="relative z-10 mt-10">
                <svg
                  // viewBox="0 0 520 260"
                  // className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl"
                  // aria-hidden="true"
                >
                  {/* <rect x="24" y="24" width="472" height="212" rx="26" fill="rgba(255,255,255,0.06)" />
                  <rect x="60" y="62" width="120" height="24" rx="12" fill="rgba(255,255,255,0.16)" />
                  <rect x="60" y="104" width="180" height="12" rx="6" fill="rgba(255,255,255,0.12)" />
                  <rect x="60" y="128" width="140" height="12" rx="6" fill="rgba(255,255,255,0.12)" />
                  <rect x="320" y="70" width="124" height="96" rx="20" fill="rgba(37,99,235,0.4)" />
                  <circle cx="382" cy="118" r="38" fill="rgba(255,255,255,0.19)" />
                  <path d="M120 188c24-24 56-36 96-36 42 0 72 14 118 42" stroke="rgba(255,255,255,0.46)" strokeWidth="8" strokeLinecap="round" fill="none" /> */}
                </svg>
              </div>

              <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Secure Authentication",
                    description: "Role-aware access with enterprise-grade protection.",
                  },
                  {
                    title: "Role Based Access",
                    description: "Control permissions with clarity and precision.",
                  },
                  {
                    title: "Workflow Automation",
                    description: "Accelerate approvals and streamline operations.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-100">
                      <ShieldCheck size={18} />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/20">
                  <Building2 className="text-white" size={28} />
                </div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">
                  Secure sign in
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to your enterprise workspace.
                </p>
              </div>

              {error && (
                <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <div className="group relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@company.com"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="group relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-12 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-3">
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Remember me
                  </label>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Secure login
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
                  <div className="flex items-center justify-center">
                    <ArrowRight
                      size={18}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </div>
                </button>
              </form>

              <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Protected by enterprise-grade security.
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Version 2.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
