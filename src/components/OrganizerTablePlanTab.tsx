import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Search,
  X,
  Armchair,
} from 'lucide-react';
import {
  clearTablePlan,
  saveTablePlan,
  TablePlanData,
} from '../services/firestoreService';
import {
  ParsedTablePlanPreview,
  parseTablePlanFile,
} from '../utils/tablePlanParser';

interface OrganizerTablePlanTabProps {
  tablePlan: TablePlanData;
  accentColor: string;
}

export const OrganizerTablePlanTab: React.FC<OrganizerTablePlanTabProps> = ({
  tablePlan,
  accentColor,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedTablePlanPreview | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearingPlan, setClearingPlan] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState('');

  const hasPublishedPlan = tablePlan.entries.length > 0;

  const filteredPublishedEntries = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return tablePlan.entries;
    return tablePlan.entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.table.toLowerCase().includes(q)
    );
  }, [listFilter, tablePlan.entries]);

  const formatUpdatedTime = (ms: number | null): string => {
    if (!ms) return 'Synced';
    try {
      return new Date(ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Synced';
    }
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setParsingFile(true);
    setParseError(null);
    setActionError(null);
    setStatusBanner(null);

    try {
      const parsed = await parseTablePlanFile(file);
      setPreview(parsed);
    } catch (err) {
      setPreview(null);
      setParseError(
        err instanceof Error
          ? err.message
          : 'Unable to parse this spreadsheet.'
      );
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePublishPreview = async () => {
    if (!preview) return;
    setSavingPlan(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      await saveTablePlan({
        entries: preview.entries,
        fileName: preview.fileName,
      });
      setStatusBanner(
        `Table plan published to all devices (${preview.delegateCount} delegates across ${preview.tableCount} tables).`
      );
      setPreview(null);
      setConfirmingClear(false);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to save table plan right now.'
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const handleConfirmClear = async () => {
    setClearingPlan(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      await clearTablePlan();
      setConfirmingClear(false);
      setListFilter('');
      setStatusBanner('Table plan cleared across all devices.');
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to clear table plan right now.'
      );
    } finally {
      setClearingPlan(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-4">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-extrabold text-black">
            Seating &amp; Table Plan Upload
          </h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Upload an Excel (.xlsx, .xls) or CSV file with delegate names and table numbers. Preview before publishing live to all devices.
          </p>
        </div>
      </div>

      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-900"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-semibold">{statusBanner}</span>
        </div>
      )}

      {(parseError || actionError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{parseError || actionError}</span>
        </div>
      )}

      {/* Upload / Replace Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0] ?? null;
          void handleFileSelected(dropped);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
          isDragging
            ? 'border-black bg-neutral-100'
            : 'border-neutral-300 bg-neutral-50/80 hover:border-neutral-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-2.5">
          {parsingFile ? (
            <Loader2 className="w-5 h-5 animate-spin text-black" />
          ) : (
            <FileSpreadsheet className="w-5 h-5" style={{ color: accentColor }} />
          )}
        </div>

        <div className="text-xs font-bold text-black">
          {parsingFile
            ? 'Reading spreadsheet...'
            : hasPublishedPlan
              ? 'Upload a new spreadsheet to replace the live table plan'
              : 'Drop an Excel or CSV table plan here'}
        </div>
        <p className="text-[11px] text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed">
          Supports .xlsx, .xls, and .csv. Automatically detects columns like Name / Delegate Name / First + Last Name and Table / Table Number.
        </p>

        <div className="mt-3.5">
          <button
            type="button"
            disabled={parsingFile || savingPlan}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] px-4 py-2 rounded-full text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
            style={{ backgroundColor: accentColor }}
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>
              {hasPublishedPlan ? 'Choose Replacement File' : 'Select Spreadsheet'}
            </span>
          </button>
        </div>
      </div>

      {/* Pre-Publish Preview Panel */}
      {preview && (
        <section className="rounded-2xl border-2 border-black bg-white p-4 space-y-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-black">
                Ready to Publish · Preview
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-600 tabular-nums">
                <span className="font-bold text-black">
                  {preview.delegateCount} {preview.delegateCount === 1 ? 'delegate' : 'delegates'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-black">
                  {preview.tableCount} {preview.tableCount === 1 ? 'table' : 'tables'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[200px]">{preview.fileName}</span>
                {preview.skippedRows > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700">
                      {preview.skippedRows} incomplete {preview.skippedRows === 1 ? 'row' : 'rows'} skipped
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-neutral-500">
                Columns matched: &ldquo;{preview.detectedNameColumn}&rdquo; → Name · &ldquo;{preview.detectedTableColumn}&rdquo; → Table
              </div>
            </div>
          </div>

          {/* Sample Rows Table */}
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-neutral-50 border-b border-neutral-200 px-3 py-2 text-[11px] font-bold text-neutral-600">
              <span className="col-span-2">Delegate Name</span>
              <span className="text-right">Assigned Table</span>
            </div>
            <div className="divide-y divide-neutral-100 max-h-48 overflow-y-auto">
              {preview.entries.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-3 px-3 py-2 text-xs items-center"
                >
                  <span className="col-span-2 font-semibold text-black truncate pr-2">
                    {entry.name}
                  </span>
                  <span className="text-right font-bold text-neutral-700 tabular-nums">
                    {entry.table}
                  </span>
                </div>
              ))}
            </div>
            {preview.entries.length > 8 && (
              <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-100 text-[11px] text-neutral-500 text-center tabular-nums">
                + {preview.entries.length - 8} more delegates included
              </div>
            )}
          </div>

          {/* Publish / Discard Actions */}
          <div className="flex items-center justify-end gap-2 flex-wrap pt-1">
            <button
              type="button"
              disabled={savingPlan}
              onClick={() => setPreview(null)}
              className="min-h-[40px] px-4 py-2 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-colors whitespace-nowrap"
            >
              Discard Preview
            </button>
            <button
              type="button"
              disabled={savingPlan}
              onClick={() => void handlePublishPreview()}
              className="min-h-[40px] px-5 py-2 rounded-full text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all whitespace-nowrap"
              style={{ backgroundColor: accentColor }}
            >
              {savingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span>
                {savingPlan
                  ? 'Publishing...'
                  : hasPublishedPlan
                    ? 'Replace Live Plan'
                    : 'Save & Publish Plan'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Currently Published Table Plan Summary & Verification Filter */}
      {hasPublishedPlan ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-black">
                <Armchair className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span>Live Published Table Plan</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500 tabular-nums">
                <span className="font-semibold text-neutral-800">
                  {tablePlan.delegateCount} {tablePlan.delegateCount === 1 ? 'delegate' : 'delegates'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-neutral-800">
                  {tablePlan.tableCount} {tablePlan.tableCount === 1 ? 'table' : 'tables'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Updated {formatUpdatedTime(tablePlan.updatedAt)}</span>
                {tablePlan.fileName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-[180px]">{tablePlan.fileName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Inline Two-Step Clear Plan */}
            {confirmingClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={clearingPlan}
                  onClick={() => void handleConfirmClear()}
                  className="min-h-[36px] px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors whitespace-nowrap"
                >
                  {clearingPlan ? 'Clearing...' : 'Confirm Clear'}
                </button>
                <button
                  type="button"
                  disabled={clearingPlan}
                  onClick={() => setConfirmingClear(false)}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-full border border-neutral-300 text-neutral-700 hover:text-black text-[11px] font-semibold whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="min-h-[36px] px-3 py-1.5 rounded-full border border-neutral-200 hover:border-red-300 hover:text-red-700 text-neutral-600 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear Table Plan</span>
              </button>
            )}
          </div>

          {/* Organiser Verification Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              placeholder="Check a delegate name or table number..."
              className="w-full min-h-[40px] pl-9 pr-9 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 text-black placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-black transition-colors"
            />
            {listFilter && (
              <button
                type="button"
                onClick={() => setListFilter('')}
                aria-label="Clear filter"
                className="absolute right-1.5 p-1.5 text-neutral-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            <div className="grid grid-cols-3 bg-neutral-50 border-b border-neutral-200 px-3 py-2 text-[11px] font-bold text-neutral-600">
              <span className="col-span-2">Delegate Name</span>
              <span className="text-right">Table</span>
            </div>
            {filteredPublishedEntries.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-neutral-500">
                No delegates match &ldquo;{listFilter}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 max-h-56 overflow-y-auto">
                {filteredPublishedEntries.slice(0, 50).map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-3 px-3 py-2 text-xs items-center"
                  >
                    <span className="col-span-2 font-semibold text-black truncate pr-2">
                      {entry.name}
                    </span>
                    <span className="text-right font-bold text-neutral-700 tabular-nums">
                      {entry.table}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {filteredPublishedEntries.length > 50 && (
              <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-100 text-[11px] text-neutral-500 text-center tabular-nums">
                Showing 50 of {filteredPublishedEntries.length} matching entries
              </div>
            )}
          </div>
        </section>
      ) : (
        !preview && (
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-500">
            No table plan is published yet. Delegates will see a friendly &ldquo;Coming Soon&rdquo; message until you upload and publish a spreadsheet.
          </div>
        )
      )}
    </div>
  );
};
