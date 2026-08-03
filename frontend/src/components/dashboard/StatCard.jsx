import React from "react";
import { TrendingUp, TrendingDown, ArrowRight, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

const StatCard = ({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  actionLink,
  actionText = "View details",
  color = "bg-[#0090B8]",
  icon: Icon,
  variant = "default", // 'default' | 'hero' | 'progress' | 'gauge'
  progressPercent = 65,
  progressLabel = "Checking totally",
  progressSubtext = "+210 today",
  gaugeValue = 145,
  gaugeSubtext = "Your customer volume has increased +25%",
}) => {
  // Hero Dark Navy Card (Matching Screenshot Card 1: Total Sales)
  if (variant === "hero") {
    return (
      <div className="group relative flex flex-col justify-between rounded-[24px] bg-gradient-to-br from-[#1E3A5F] via-[#162E4C] to-[#0F1D30] p-6 text-white shadow-xl shadow-[#1E3A5F]/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {title}
            </span>
            <button
              type="button"
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-heading">
              {value}
            </h2>
            {change && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-200 backdrop-blur-md border border-white/20">
                <TrendingUp size={13} className="text-sky-300" />
                {change}
              </span>
            )}
          </div>
        </div>

        {subtitle && (
          <p className="mt-4 text-xs font-medium text-slate-300/80">
            {subtitle}
          </p>
        )}

        {actionLink && (
          <div className="mt-5 border-t border-white/10 pt-3">
            <Link
              to={actionLink}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-white transition-colors"
            >
              <span>{actionText}</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Progress Bar Card (Matching Screenshot Card 2: User Growth)
  if (variant === "progress") {
    return (
      <div className="group relative flex flex-col justify-between rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </span>

            {/* Time Pill Tabs */}
            <div className="flex items-center gap-1 rounded-full bg-slate-100/80 dark:bg-slate-800 p-1 text-[10px] font-bold">
              <span className="rounded-full bg-[#1E3A5F] text-white px-2 py-0.5 shadow-xs">24h</span>
              <span className="text-slate-500 px-1.5 hover:text-slate-800 cursor-pointer">30h</span>
              <span className="text-slate-500 px-1.5 hover:text-slate-800 cursor-pointer">Week</span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              {value}
            </h2>
            {change && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                +{change}
              </span>
            )}
          </div>
        </div>

        {/* Cyan-Teal Horizontal Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0090B8] via-[#0EA5E9] to-[#2DD4BF] transition-all duration-500 shadow-sm"
              style={{ width: `${Math.min(100, Math.max(10, progressPercent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{progressLabel}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{progressSubtext}</span>
          </div>
        </div>
      </div>
    );
  }

  // Semi-Gauge Radial Card (Matching Screenshot Card 3: Customers Volume)
  if (variant === "gauge") {
    return (
      <div className="group relative flex flex-col justify-between rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Semi-Arc Gauge SVG Visualization */}
        <div className="relative my-2 flex flex-col items-center justify-center">
          <svg className="w-44 h-24" viewBox="0 0 100 50">
            {/* Background Track Arc */}
            <path
              d="M 10 45 A 35 35 0 0 1 90 45"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Cyan Gradient Progress Arc */}
            <path
              d="M 10 45 A 35 35 0 0 1 80 20"
              fill="none"
              stroke="url(#gaugeCyanGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
            <defs>
              <linearGradient id="gaugeCyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0090B8" />
                <stop offset="50%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Value */}
          <div className="absolute top-10 flex flex-col items-center">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              {gaugeValue}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">New Customers</span>
          </div>
        </div>

        {/* Bottom Callout Badge */}
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-center">
            {gaugeSubtext}
          </span>
        </div>
      </div>
    );
  }

  // Default Crisp White Card
  return (
    <div className="group relative flex flex-col justify-between rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#0090B8]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}

          {change && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isPositive ? (
                <TrendingUp size={14} className="shrink-0" />
              ) : (
                <TrendingDown size={14} className="shrink-0 text-red-500" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color} text-white shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={22} />
          </div>
        )}
      </div>

      {actionLink && (
        <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
          <Link
            to={actionLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0090B8] hover:text-[#007799] transition-colors"
          >
            <span>{actionText}</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default StatCard;