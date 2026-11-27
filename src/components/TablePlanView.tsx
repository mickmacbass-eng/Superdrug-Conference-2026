import React, { useMemo, useState, useRef } from 'react';
import {
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Armchair,
  AlertCircle,
} from 'lucide-react';
import { TablePlanData, TablePlanEntry } from '../services/firestoreService';
import { useBrand } from '../config/BrandContext';

interface TablePlanViewProps {
  tablePlan: TablePlanData;
  syncError?: string | null;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const TablePlanView: React.FC<TablePlanViewProps> = ({
  tablePlan,
  syncError,
}) => {
  const { config } = useBrand();
  const [query, setQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasPlan = tablePlan.entries.length > 0;
  const trimmedQuery = query.trim();

  const matches = useMemo<TablePlanEntry[]>(() => {
    if (!hasPlan || !trimmedQuery) return [];

    const normQuery = normalizeSearchText(trimmedQuery);
    if (!normQuery) return [];
    const tokens = normQuery.split(' ').filter(Boolean);

    const scored: { entry: TablePlanEntry; rank: number }[] = [];

    for (const entry of tablePlan.entries) {
      const normName = normalizeSearchText(entry.name);
      const nameWords = normName.split(' ');

      const allTokensMatch = tokens.every((token) => normName.includes(token));
      if (!allTokensMatch) continue;

      let rank = 3;
      if (normName === normQuery) {
        rank = 0;
      } else if (normName.startsWith(normQuery)) {
        rank = 1;
      } else if (tokens.every((token) => nameWords.some((word) => word.startsWith(token)))) {
        rank = 2;
      }

      scored.push({ entry, rank });
    }

    scored.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.entry.name.localeCompare(b.entry.name);
    });

    return scored.map((item) => item.entry);
  }, [hasPlan, tablePlan.entries, trimmedQuery]);

  const selectedEntry = useMemo<TablePlanEntry | null>(() => {
    if (!trimmedQuery || matches.length === 0) return null;
    if (selectedEntryId) {
      return matches.find((entry) => entry.id === selectedEntryId) ?? null;
    }
    if (matches.length === 1) {
      return matches[0];
    }
    return null;
  }, [matches, selectedEntryId, trimmedQuery]);

  const handleClearSearch = () => {
    setQuery('');
    setSelectedEntryId(null);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Page Title */}
      <div className="space-y-1 px-0.5">
        <h1 className="text-xl font-black tracking-tight text-black">
          Table Plan
        </h1>
        <p className="text-xs text-neutral-500">
          {hasPlan
            ? 'Type your name below to find your assigned table.'
            : 'Seating assignments for conference sessions and dining.'}
        </p>
      </div>

      {syncError && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Empty State: No Table Plan Uploaded Yet */}
      {!hasPlan ? (
        <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto">
            <Armchair className="w-6 h-6" style={{ color: config.colors.primaryAccent }} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-black">
              Table Plan Coming Soon
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
              The seating list has not been published yet. Please check back shortly or ask a member of the welcome team.
            </p>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-4 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedEntryId(null);
              }}
              placeholder="Type your first or last name..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search your name to find your assigned table"
              className="w-full min-h-[48px] pl-11 pr-12 py-3 text-base font-medium rounded-2xl border border-neutral-300 bg-white text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear name search"
                className="absolute right-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Prompt Before Typing (keeps guest list private) */}
          {!trimmedQuery && (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 px-5 py-7 text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto">
                <Armchair className="w-5 h-5" style={{ color: config.colors.primaryAccent }} />
              </div>
              <p className="text-sm font-bold text-black">
                Find Your Seat
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Start typing your first name or surname above to see your table number instantly.
              </p>
            </div>
          )}

          {/* Selected or Single Match Spotlight Card (Strictly Name & Assigned Table Only) */}
          {trimmedQuery && selectedEntry && (
            <section
              aria-live="polite"
              className="space-y-3"
            >
              {matches.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedEntryId(null)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Back to {matches.length} matches</span>
                </button>
              )}

              <div className="bg-black text-white rounded-3xl p-6 relative overflow-hidden shadow-md space-y-5">
                <div
                  className="absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-25"
                  style={{ backgroundColor: config.colors.primaryAccent }}
                />

                <div className="relative z-10 space-y-1">
                  <div
                    className="text-xs font-bold tracking-wide"
                    style={{ color: config.colors.primaryAccent }}
                  >
                    Assigned Table
                  </div>
                  <h2 className="text-xl font-extrabold text-white leading-snug">
                    {selectedEntry.name}
                  </h2>
                </div>

                <div className="relative z-10 pt-4 border-t border-neutral-800 flex items-end justify-between gap-3">
                  <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums leading-none">
                    {selectedEntry.table}
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    <Armchair
                      className="w-5 h-5"
                      style={{ color: config.colors.primaryAccent }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearSearch}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-colors whitespace-nowrap"
              >
                Search Another Name
              </button>
            </section>
          )}

          {/* Multiple Matches List */}
          {trimmedQuery && !selectedEntry && matches.length > 1 && (
            <section aria-live="polite" className="space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
                <span className="tabular-nums">
                  {matches.length} matching names · Tap your name
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
                {matches.slice(0, 25).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedEntryId(entry.id)}
                    className="w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors tap-highlight"
                  >
                    <span className="text-sm font-bold text-black truncate">
                      {entry.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                  </button>
                ))}
              </div>

              {matches.length > 25 && (
                <p className="text-xs text-neutral-500 text-center pt-1">
                  Showing first 25 matches · Keep typing to narrow results
                </p>
              )}
            </section>
          )}

          {/* No Match State */}
          {trimmedQuery && matches.length === 0 && (
            <section
              aria-live="polite"
              className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-center space-y-3"
            >
              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-black">
                  No matching name found
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
                  We could not find a seat matching &ldquo;{trimmedQuery}&rdquo;. Try typing just your surname, or check with the registration desk.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="min-h-[40px] px-4 py-2 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors whitespace-nowrap"
              >
                Clear Search
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
