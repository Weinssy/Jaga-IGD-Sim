import React from 'react';
import { X, Receipt, ClipboardList, FlaskConical } from 'lucide-react';
import { ClinicalLogEntry, CostEntry, DiagnosticTest } from '../types/clinical';
import { formatClock, formatRupiah } from '../data/cases';

interface BudgetModalProps {
  budgetLimit: number;
  costs: CostEntry[];
  onClose: () => void;
}

export const BudgetBreakdownModal: React.FC<BudgetModalProps> = ({
  budgetLimit,
  costs,
  onClose,
}) => {
  const totalSpent = costs.reduce((acc, c) => acc + c.cost, 0);
  const diff = budgetLimit - totalSpent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rincian Biaya BPJS"
    >
      <div className="flex max-h-[84vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-extrabold text-slate-900">Rincian Biaya Pelayanan IGD</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup rincian biaya"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-xs">
          <div>
            <div className="text-slate-500">Total Terpakai / Plafon</div>
            <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalSpent)} / {formatRupiah(budgetLimit)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500">{diff >= 0 ? 'Sisa Plafon BPJS' : 'Melebihi Plafon'}</div>
            <div
              className={`mt-0.5 font-mono text-sm font-extrabold tabular-nums ${
                diff >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {diff >= 0 ? formatRupiah(diff) : `- ${formatRupiah(Math.abs(diff))}`}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 clinical-scroll">
          {costs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Belum ada biaya tindakan, pemeriksaan, atau obat yang tercatat.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {costs.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.category} · {formatClock(item.timeSec)}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono font-bold text-slate-800 tabular-nums">
                    {formatRupiah(item.cost)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MedicalRecordModalProps {
  patientName: string;
  logs: ClinicalLogEntry[];
  onClose: () => void;
}

export const MedicalRecordModal: React.FC<MedicalRecordModalProps> = ({
  patientName,
  logs,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rekam Medis IGD"
    >
      <div className="flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Catatan Rekam Medis — {patientName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup rekam medis"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 clinical-scroll">
          <div className="divide-y divide-slate-100">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2.5 text-xs">
                <span className="mt-0.5 shrink-0 font-mono text-[11px] font-semibold text-slate-400 tabular-nums">
                  {formatClock(entry.timeSec)}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`font-bold ${
                      entry.category === 'Peringatan'
                        ? 'text-rose-600'
                        : entry.category === 'Obat'
                          ? 'text-teal-700'
                          : 'text-slate-700'
                    }`}
                  >
                    {entry.category}:{' '}
                  </span>
                  <span className="text-slate-700">{entry.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LabResultModalProps {
  patientName: string;
  test: DiagnosticTest;
  onClose: () => void;
}

export const LabResultModal: React.FC<LabResultModalProps> = ({
  patientName,
  test,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Hasil ${test.name}`}
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 sm:px-5 py-3.5 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0 text-teal-600" />
            <div className="min-w-0">
              <h2 className="truncate text-sm sm:text-base font-extrabold text-slate-900">{test.name}</h2>
              <p className="truncate text-xs text-slate-500">Hasil Laboratorium · {patientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup hasil lab"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 clinical-scroll">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 pr-2 font-semibold">Parameter</th>
                  <th className="pb-2 pr-2 font-semibold">Hasil</th>
                  <th className="pb-2 font-semibold">Nilai Rujukan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {test.details.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 pr-2 font-medium text-slate-800">{row.label}</td>
                    <td
                      className={`py-2.5 pr-2 font-mono font-bold tabular-nums whitespace-nowrap ${
                        row.abnormal ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {row.value} {row.abnormal ? '(!)' : ''}
                    </td>
                    <td className="py-2.5 font-mono text-slate-500 tabular-nums">{row.normal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <span className="font-bold text-slate-900">Ringkasan: </span>
            {test.summary}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            Tutup Hasil
          </button>
        </div>
      </div>
    </div>
  );
};
