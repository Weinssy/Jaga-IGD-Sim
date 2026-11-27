import React from 'react';
import { Award, CheckCircle2, RotateCcw, Home, AlertTriangle } from 'lucide-react';
import {
  ActivePump,
  ActiveTestOrder,
  AdministeredDrug,
  ClinicalCase,
  CostEntry,
  OxygenDelivery,
  PatientPosture,
  VitalSigns,
} from '../types/clinical';
import { formatClock, formatRupiah } from '../data/cases';
import { ClinicalDialog } from './ClinicalDialog';

interface CaseSummaryModalProps {
  clinicalCase: ClinicalCase;
  elapsedSec: number;
  vitals: VitalSigns;
  posture: PatientPosture;
  monitorAttached: boolean;
  ivAccess: boolean;
  oxygen: OxygenDelivery;
  activePumps: ActivePump[];
  administeredDrugs: AdministeredDrug[];
  activeOrders: ActiveTestOrder[];
  ecgInterpretation: string;
  doneExamIds: string[];
  askedAnamnesisIds: string[];
  doneCommIds: string[];
  primaryDiagnosisId: string | null;
  selectedDispositionId: string | null;
  costs: CostEntry[];
  onReplayCase: () => void;
  onReturnToTitle: () => void;
}

export const CaseSummaryModal: React.FC<CaseSummaryModalProps> = ({
  clinicalCase,
  elapsedSec,
  vitals,
  posture,
  monitorAttached,
  ivAccess,
  oxygen,
  activePumps,
  administeredDrugs,
  activeOrders,
  ecgInterpretation,
  doneExamIds,
  askedAnamnesisIds,
  doneCommIds,
  primaryDiagnosisId,
  selectedDispositionId,
  costs,
  onReplayCase,
  onReturnToTitle,
}) => {
  // Compute 5-axis authentic clinical rubric (100 points max)
  const feedbackGood: string[] = [];
  const feedbackImprove: string[] = [];

  // 1. Stabilisasi ABCDE (25 pts)
  let stabScore = 0;
  if (monitorAttached) {
    stabScore += 7;
    feedbackGood.push('Monitor tanda vital terpasang untuk pemantauan hemodinamik real-time.');
  } else {
    feedbackImprove.push('Monitor pasien belum terpasang selama penanganan.');
  }
  if (ivAccess) {
    stabScore += 6;
  } else {
    feedbackImprove.push('Akses IV perifer belum dipasang.');
  }
  if (clinicalCase.recommendedOxygen.includes(oxygen)) {
    stabScore += 8;
    feedbackGood.push(`Terapi oksigen tepat (${oxygen.toUpperCase()}) dengan SpO2 akhir ${Math.round(vitals.spo2)}%.`);
  } else {
    feedbackImprove.push('Pilihan terapi oksigen belum optimal untuk tingkat hipoksemia pasien.');
  }
  if (posture === clinicalCase.preferredPosture) {
    stabScore += 4;
  } else if (posture === clinicalCase.harmfulPosture) {
    feedbackImprove.push('Posisi pasien sempat membahayakan hemodinamik/pernapasan.');
  }

  // 2. Penilaian & Penunjang (20 pts)
  let diagScore = 0;
  if (askedAnamnesisIds.length >= 2) diagScore += 4;
  if (doneExamIds.length >= 2) diagScore += 4;
  const essentialTests = clinicalCase.diagnostics.filter((d) => d.essential);
  const completedIds = activeOrders.filter((o) => o.completed).map((o) => o.testId);
  const essentialDone = essentialTests.filter((t) => completedIds.includes(t.id)).length;
  diagScore += Math.round((essentialDone / Math.max(1, essentialTests.length)) * 8);

  const ecgLower = ecgInterpretation.toLowerCase();
  const ecgMatched = clinicalCase.ecgExpectedKeywords.some((kw) => ecgLower.includes(kw));
  if (ecgMatched) {
    diagScore += 4;
    feedbackGood.push('Interpretasi EKG 12-lead mencerminkan temuan patologis utama.');
  } else if (completedIds.some((id) => id.includes('ekg'))) {
    feedbackImprove.push('Interpretasi EKG tertulis belum mencantumkan kata kunci klinis utama.');
  }

  // 3. Farmakoterapi & Stabilitas Hemodinamik (25 pts)
  let pharmaScore = 0;
  const givenIds = new Set([
    ...administeredDrugs.map((d) => d.drugId),
    ...activePumps.map((p) => p.drugId),
  ]);
  const critHit = clinicalCase.criticalDrugIds.filter((id) => givenIds.has(id)).length;
  const critTarget = Math.min(2, clinicalCase.criticalDrugIds.length);
  pharmaScore += Math.min(18, Math.round((critHit / Math.max(1, critTarget)) * 18));

  const harmfulGiven = clinicalCase.harmfulDrugIds.filter((id) => givenIds.has(id));
  if (harmfulGiven.length > 0) {
    pharmaScore = Math.max(0, pharmaScore - 12);
    feedbackImprove.push('Diberikan obat/cairan yang dikontraindikasikan pada kondisi klinis ini.');
  } else if (critHit > 0) {
    feedbackGood.push('Pemilihan farmakoterapi lini pertama tepat tanpa obat kontraindikasi.');
  }

  if (vitals.spo2 >= 94 && vitals.sbp >= 95 && vitals.sbp <= 185) {
    pharmaScore += 7;
    feedbackGood.push(
      `Pasien berhasil distabilkan (TD ${Math.round(vitals.sbp)}/${Math.round(vitals.dbp)}, SpO2 ${Math.round(vitals.spo2)}%).`
    );
  } else {
    feedbackImprove.push(
      `Hemodinamik akhir belum sepenuhnya stabil (TD ${Math.round(vitals.sbp)}/${Math.round(vitals.dbp)}, SpO2 ${Math.round(vitals.spo2)}%).`
    );
  }

  // 4. Diagnosis, Komunikasi & Disposisi (20 pts)
  let decisionScore = 0;
  const chosenDiag = clinicalCase.diagnoses.find((d) => d.id === primaryDiagnosisId);
  if (chosenDiag?.isPrimaryCorrect) {
    decisionScore += 8;
    feedbackGood.push(`Diagnosis kerja utama tepat: ${chosenDiag.name}.`);
  } else {
    feedbackImprove.push('Diagnosis kerja utama belum tepat.');
  }

  const essentialComms = clinicalCase.communications.filter((c) => c.essential);
  const doneEssentialComms = essentialComms.filter((c) => doneCommIds.includes(c.id)).length;
  if (doneEssentialComms >= essentialComms.length) {
    decisionScore += 5;
    feedbackGood.push('Edukasi/Informed Consent keluarga dan konsultasi spesialis terlaksana.');
  } else {
    feedbackImprove.push('Komunikasi Informed Consent atau konsultasi spesialis belum lengkap.');
  }

  const chosenDisp = clinicalCase.dispositions.find((d) => d.id === selectedDispositionId);
  if (chosenDisp?.isCorrect) {
    decisionScore += 7;
    feedbackGood.push(chosenDisp.feedback);
  } else if (chosenDisp) {
    feedbackImprove.push(chosenDisp.feedback);
  }

  // 5. Efisiensi Biaya BPJS (10 pts)
  const totalCost = costs.reduce((acc, c) => acc + c.cost, 0);
  const budgetRatio = totalCost / clinicalCase.budgetLimit;
  let budgetScore = 10;
  if (budgetRatio > 1.45) {
    budgetScore = 4;
    feedbackImprove.push(`Total biaya (${formatRupiah(totalCost)}) melampaui plafon BPJS secara signifikan.`);
  } else if (budgetRatio > 1.0) {
    budgetScore = 7;
    feedbackImprove.push(`Total biaya (${formatRupiah(totalCost)}) sedikit melewati plafon ${formatRupiah(clinicalCase.budgetLimit)}.`);
  } else {
    feedbackGood.push(`Efisiensi biaya terjaga dalam plafon BPJS (${formatRupiah(totalCost)} / ${formatRupiah(clinicalCase.budgetLimit)}).`);
  }

  const totalScore = Math.min(100, stabScore + diagScore + pharmaScore + decisionScore + budgetScore);
  const grade =
    totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 55 ? 'C' : 'D';
  const gradeLabel =
    grade === 'A'
      ? 'Kompeten unggul · Resusitasi dan klinis optimal'
      : grade === 'B'
        ? 'Baik · Pasien tertangani aman'
        : grade === 'C'
          ? 'Cukup · Ketepatan klinis perlu diperbaiki'
          : 'Perlu evaluasi · Risiko keselamatan pasien';

  const pillars = [
    { label: 'Stabilisasi ABCDE', score: stabScore, max: 25 },
    { label: 'Penilaian & Penunjang', score: diagScore, max: 20 },
    { label: 'Farmakoterapi & Hemodinamik', score: pharmaScore, max: 25 },
    { label: 'Diagnosis, Komunikasi & Disposisi', score: decisionScore, max: 20 },
    { label: 'Efisiensi Biaya BPJS', score: budgetScore, max: 10 },
  ];

  return (
    <ClinicalDialog className="max-w-3xl" labelledBy="summary-title" onDismiss={onReturnToTitle}>
      <div>
        {/* Header Banner */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-900 px-4 sm:px-6 py-4 sm:py-5 text-white">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <div
              className={`flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl font-mono text-2xl sm:text-3xl font-extrabold ${
                grade === 'A'
                  ? 'bg-emerald-500 text-slate-950'
                  : grade === 'B'
                    ? 'bg-teal-400 text-slate-950'
                    : grade === 'C'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-rose-700 text-white'
              }`}
            >
              {grade}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs font-medium text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                  <span>Evaluasi · {clinicalCase.patientName}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Durasi {formatClock(elapsedSec)}</span>
              </div>
              <h2
                id="summary-title"
                tabIndex={-1}
                ref={(heading) => { if (heading) heading.autofocus = true; }}
                className="mt-0.5 text-base font-extrabold leading-snug text-white [--focus-color:var(--mint)] sm:text-xl"
              >
                {gradeLabel}
              </h2>
              <div className="mt-1 font-mono text-xs sm:text-sm font-bold text-teal-300 tabular-nums">
                Skor Total: {totalScore} / 100
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Breakdown */}
        <div className="space-y-5 px-4 py-5 sm:px-6">
          {/* 5-Axis Rubric Bars */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{p.label}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {p.score}/{p.max}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${Math.round((p.score / p.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Good & Improvement Points */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Tindakan Tepat</span>
              </h3>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                {feedbackGood.length > 0 ? (
                  feedbackGood.map((txt, idx) => (
                    <li key={idx} className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-100">
                      {txt}
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">Belum ada poin utama yang terpenuhi.</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-rose-800">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Catatan Perbaikan Klinis</span>
              </h3>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                {feedbackImprove.length > 0 ? (
                  feedbackImprove.map((txt, idx) => (
                    <li key={idx} className="rounded-lg bg-rose-50/70 p-2.5 border border-rose-100">
                      {txt}
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-slate-600">
                    Luar biasa! Tidak ada kesalahan klinis mayor pada kasus ini.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Official ECG & Case Key Takeaway */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900">Pembahasan EKG 12-Lead Resmi</div>
            <p className="leading-relaxed text-slate-700">{clinicalCase.ecgOfficialInterpretation}</p>
            {ecgInterpretation && (
              <div className="pt-1 text-slate-600">
                <span className="font-semibold text-slate-800">Interpretasi Anda: </span>
                {ecgInterpretation}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2.5 border-t border-slate-200 bg-slate-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onReturnToTitle}
            className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            <Home className="h-4 w-4" />
            <span>Pilih Kasus Lain</span>
          </button>
          <button
            type="button"
            onClick={onReplayCase}
            className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-500 whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Ulangi Kasus Ini</span>
          </button>
        </div>
      </div>
    </ClinicalDialog>
  );
};
