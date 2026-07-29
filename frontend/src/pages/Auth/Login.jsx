import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Lock,
  Building2,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { getDashboardPathForRole } from "../../config/roleDashboard";
import authBgLight from "../../assets/auth-bg-light.png";

// Generate static positions for background floating stars/particles
const generateStars = (count = 28) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 4 + 2, // 2px to 6px
      duration: Math.random() * 3 + 2, // 2s to 5s
      delay: Math.random() * 3,
      driftX: (Math.random() - 0.5) * 40,
      driftY: (Math.random() - 0.5) * 40,
    });
  }
  return stars;
};

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

  const stars = useMemo(() => generateStars(32), []);

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
    <div className="min-h-screen w-full font-sans bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100 text-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Animated Background Floating Objects & Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated Gradient Light Spheres */}
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-300/40 to-blue-400/30 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-20 -right-20 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-blue-300/35 to-indigo-300/30 blur-[130px]"
        />

        {/* Floating Twinkling Stars / Particles */}
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ opacity: 0.2 }}
            animate={{
              opacity: [0.2, 0.9, 0.2],
              scale: [0.8, 1.4, 0.8],
              x: [0, star.driftX, 0],
              y: [0, star.driftY, 0],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: star.delay,
            }}
            style={{
              position: "absolute",
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
            }}
            className="rounded-full bg-sky-400/80 shadow-[0_0_10px_#38bdf8]"
          />
        ))}

        {/* Shooting Light Streak Shimmer */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
            y: ["-100%", "200%"],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 4,
          }}
          className="absolute top-0 left-0 w-72 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent transform -rotate-45"
        />
      </div>

      {/* Main Card Modal with Entrance Animation */}
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/80 bg-white/90 shadow-2xl shadow-blue-900/10 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 min-h-[520px]"
      >
        {/* Left Side Presentation with Light Architectural Background Image */}
        <div
          className="lg:col-span-6 relative p-8 sm:p-10 flex flex-col justify-between overflow-hidden bg-cover bg-center border-b lg:border-b-0 lg:border-r border-slate-200/80"
          style={{ backgroundImage: `url(${authBgLight})` }}
        >
          {/* Subtle Light Gradient Overlay for crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/35 to-slate-900/60" />

          {/* Top Brand Header */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/40 text-white shadow-md">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200 block">Enterprise SaaS</span>
              <h2 className="text-lg font-bold tracking-tight text-white font-heading leading-none" style={{ color: "#ffffff" }}>
                VMS Portal
              </h2>
            </div>
          </motion.div>

          {/* Bottom Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative z-10 mt-12 space-y-3"
          >
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug drop-shadow-md"
              style={{ color: "#ffffff" }}
            >
              Manage Smarter. <br />
              Approve Faster. <br />
              Work Anywhere.
            </h1>
            <p className="text-xs text-slate-100 leading-relaxed max-w-sm drop-shadow-sm font-medium">
              Centralize vendor lifecycle, purchase orders, automated three-way matching, and multi-tier approval workflows in one unified dashboard.
            </p>

            {/* Animated Slider Indicator Dots */}
            <div className="flex items-center gap-2 pt-2">
              <motion.span
                animate={{ width: ["24px", "32px", "24px"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="h-1 bg-white rounded-full shadow-sm"
              />
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full"></span>
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full"></span>
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full"></span>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Light Form Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center bg-white text-slate-900 relative"
        >
          <div className="relative z-10">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                Sign in to workspace
              </h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Enter your organizational credentials to continue
              </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600 flex items-center gap-2 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@company.com"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/90 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••••••"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/90 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Keep me signed in Checkbox */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  Keep me signed in
                </label>
              </div>

              {/* Animated Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-bold text-sm text-white shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? "Authenticating..." : "Sign in to Dashboard"}</span>
                <ArrowRight size={16} />
              </motion.button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400 font-medium">
              Powered by VMS Enterprise Engine v2.0
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
