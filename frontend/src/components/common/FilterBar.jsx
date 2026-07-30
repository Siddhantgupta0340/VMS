import { Filter } from "lucide-react";
import { useState } from "react";

const FilterBar = ({ onFilterChange, filters = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const handleFilterChange = (filterKey, value) => {
    const updated = { ...activeFilters, [filterKey]: value };
    setActiveFilters(updated);
    onFilterChange(updated);
  };

  const handleClearAll = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const activeCount = Object.values(activeFilters).filter(v => v).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-900"
      >
        <Filter size={16} />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[9999] mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-lg text-slate-900 dark:text-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
            {activeCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{filter.label}</label>
                <select
                  value={activeFilters[filter.key] || ""}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="" className="dark:bg-slate-950">All</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-950">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
