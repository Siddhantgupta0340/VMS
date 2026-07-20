import { useState, useCallback } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const PRESETS = [
  { label: "Today",         value: "today" },
  { label: "Yesterday",     value: "yesterday" },
  { label: "Last 7 Days",   value: "last7" },
  { label: "Last 30 Days",  value: "last30" },
  { label: "This Month",    value: "thisMonth" },
  { label: "Last Month",    value: "lastMonth" },
  { label: "This Quarter",  value: "thisQuarter" },
  { label: "This Year",     value: "thisYear" },
  { label: "Custom Range",  value: "custom" },
];

const toISO = (d) => d.toISOString().slice(0, 10);

const computePreset = (preset) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case "today":
      return { startDate: toISO(new Date(y, m, d)), endDate: toISO(new Date(y, m, d)) };
    case "yesterday":
      return { startDate: toISO(new Date(y, m, d - 1)), endDate: toISO(new Date(y, m, d - 1)) };
    case "last7":
      return { startDate: toISO(new Date(y, m, d - 6)), endDate: toISO(new Date(y, m, d)) };
    case "last30":
      return { startDate: toISO(new Date(y, m, d - 29)), endDate: toISO(new Date(y, m, d)) };
    case "thisMonth":
      return { startDate: toISO(new Date(y, m, 1)), endDate: toISO(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { startDate: toISO(new Date(y, m - 1, 1)), endDate: toISO(new Date(y, m, 0)) };
    case "thisQuarter": {
      const qStart = Math.floor(m / 3) * 3;
      return { startDate: toISO(new Date(y, qStart, 1)), endDate: toISO(new Date(y, qStart + 3, 0)) };
    }
    case "thisYear":
      return { startDate: toISO(new Date(y, 0, 1)), endDate: toISO(new Date(y, 11, 31)) };
    default:
      return { startDate: "", endDate: "" };
  }
};

/**
 * DateRangePicker
 *
 * Props:
 *   startDate   - controlled value (YYYY-MM-DD string)
 *   endDate     - controlled value (YYYY-MM-DD string)
 *   onChange    - (startDate, endDate) => void
 */
const DateRangePicker = ({ startDate = "", endDate = "", onChange }) => {
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [dateError, setDateError] = useState("");

  const applyPreset = useCallback((preset) => {
    if (preset === "custom") {
      setActivePreset("custom");
      setShowPresets(false);
      return;
    }
    const { startDate: s, endDate: e } = computePreset(preset);
    setActivePreset(preset);
    setDateError("");
    setShowPresets(false);
    onChange?.(s, e);
  }, [onChange]);

  const handleCustomDate = (field, value) => {
    let newStart = field === "start" ? value : startDate;
    let newEnd   = field === "end"   ? value : endDate;

    if (newStart && newEnd && newStart > newEnd) {
      setDateError("Start date cannot be after end date");
      return;
    }
    setDateError("");
    onChange?.(newStart, newEnd);
  };

  const activePresetLabel = PRESETS.find((p) => p.value === activePreset)?.label;

  return (
    <div className="relative">
      {/* Preset selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
        >
          <CalendarDays size={15} className="text-blue-600" />
          {activePresetLabel || "Date Range"}
          <ChevronDown size={14} />
        </button>

        {/* Custom date inputs */}
        {(activePreset === "custom" || (!activePreset && (startDate || endDate))) && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => handleCustomDate("start", e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => handleCustomDate("end", e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => { setActivePreset(null); setDateError(""); onChange?.("", ""); }}
            className="text-xs text-slate-400 hover:text-red-500 transition"
          >
            Clear dates
          </button>
        )}
      </div>

      {dateError && <p className="mt-1 text-xs text-red-500">{dateError}</p>}

      {/* Dropdown presets */}
      {showPresets && (
        <div className="absolute top-10 left-0 z-50 w-44 rounded-2xl border border-slate-200 bg-white shadow-xl">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 transition first:rounded-t-2xl last:rounded-b-2xl ${
                activePreset === p.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
