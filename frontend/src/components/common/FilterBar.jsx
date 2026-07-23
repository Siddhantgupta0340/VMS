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
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
        <div className="absolute z-[9999] mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Filters</h3>
            {activeCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="text-xs font-medium text-slate-600">{filter.label}</label>
                <select
                  value={activeFilters[filter.key] || ""}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">All</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
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
