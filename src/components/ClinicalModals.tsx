import React from 'react';
import { X, Receipt, ClipboardList, FlaskConical } from 'lucide-react';
import { ClinicalLogEntry, CostEntry, DiagnosticTest } from '../types/clinical';
import { formatClock, formatRupiah } from '../data/cases';
import { ClinicalDialog } from './ClinicalDialog';

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
    <ClinicalDialog labelledBy="budget-title" onDismiss={onClose}>
      <div>
        <div className="dialog-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <h2 id="budget-title" className="text-base font-extrabold text-slate-900">Rincian biaya pelayanan IGD</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="sim-secondary shrink-0"
            aria-label="Tutup rincian biaya"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3.5 text-xs sm:px-5">
          <div>
            <div className="text-slate-500">Terpakai dari plafon</div>
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

        <div className="px-4 py-3 sm:px-5">
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
    </ClinicalDialog>
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
    <ClinicalDialog className="max-w-xl" labelledBy="record-title" onDismiss={onClose}>
      <div>
        <div className="dialog-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <h2 id="record-title" className="text-base font-extrabold text-slate-900">
              Rekam medis {patientName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="sim-secondary shrink-0"
            aria-label="Tutup rekam medis"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 sm:px-5">
          {logs.length === 0 && <p className="py-4 text-sm text-slate-600">Belum ada catatan.</p>}
          <div className="divide-y divide-slate-100">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2.5 text-xs">
                <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-slate-500 tabular-nums">
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
    </ClinicalDialog>
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
    <ClinicalDialog labelledBy="lab-title" onDismiss={onClose}>
      <div>
        <div className="dialog-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FlaskConical className="h-4 w-4 shrink-0 text-teal-600" />
            <div className="min-w-0">
              <h2 id="lab-title" className="text-sm font-extrabold text-slate-900 sm:text-base">{test.name}</h2>
              <p className="text-xs text-slate-500">Hasil laboratorium · {patientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="sim-secondary shrink-0"
            aria-label="Tutup hasil lab"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th scope="col" className="w-2/5 pb-2 pr-2 font-semibold">Parameter</th>
                  <th scope="col" className="pb-2 pr-2 font-semibold">Hasil</th>
                  <th scope="col" className="pb-2 font-semibold">Nilai rujukan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {test.details.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="py-2.5 pr-2 font-medium text-slate-800">{row.label}</th>
                    <td
                      className={`py-2.5 pr-2 font-mono font-bold tabular-nums ${
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
    </ClinicalDialog>
  );
};
