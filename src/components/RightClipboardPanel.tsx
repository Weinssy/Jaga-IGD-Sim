import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Syringe,
  Activity,
  Wind,
  Stethoscope,
  MessageSquare,
  Send,
  FileBarChart2,
  Eye,
} from 'lucide-react';
import {
  ActivePump,
  ActiveTestOrder,
  AdministeredDrug,
  ClinicalCase,
  OxygenDelivery,
  PatientPosture,
  SidebarTab,
} from '../types/clinical';
import { formatClock, formatRupiah } from '../data/cases';

interface RightClipboardPanelProps {
  activeTab: SidebarTab;
  clinicalCase: ClinicalCase;
  elapsedSec: number;
  askedAnamnesisIds: string[];
  onAskAnamnesis: (id: string) => void;
  doneExamIds: string[];
  onDoPhysicalExam: (id: string) => void;
  activeOrders: ActiveTestOrder[];
  onOrderDiagnostic: (testId: string) => void;
  onOpenTestResult: (testId: string) => void;
  monitorAttached: boolean;
  onAttachMonitor: () => void;
  ivAccess: boolean;
  onEstablishIv: () => void;
  urinaryCatheter: boolean;
  onPlaceCatheter: () => void;
  posture: PatientPosture;
  onChangePosture: (p: PatientPosture) => void;
  oxygen: OxygenDelivery;
  onChangeOxygen: (o: OxygenDelivery) => void;
  onStartIntubation: () => void;
  activePumps: ActivePump[];
  administeredDrugs: AdministeredDrug[];
  onAdministerDrug: (drugId: string) => void;
  primaryDiagnosisId: string | null;
  onSelectPrimaryDiagnosis: (id: string) => void;
  differentialIds: string[];
  onToggleDifferential: (id: string) => void;
  doneCommIds: string[];
  onDoCommunication: (id: string) => void;
  selectedDispositionId: string | null;
  onSelectDisposition: (id: string) => void;
  onFinishCase: () => void;
}

export const RightClipboardPanel: React.FC<RightClipboardPanelProps> = ({
  activeTab,
  clinicalCase,
  elapsedSec,
  askedAnamnesisIds,
  onAskAnamnesis,
  doneExamIds,
  onDoPhysicalExam,
  activeOrders,
  onOrderDiagnostic,
  onOpenTestResult,
  monitorAttached,
  onAttachMonitor,
  ivAccess,
  onEstablishIv,
  urinaryCatheter,
  onPlaceCatheter,
  posture,
  onChangePosture,
  oxygen,
  onChangeOxygen,
  onStartIntubation,
  activePumps,
  administeredDrugs,
  onAdministerDrug,
  primaryDiagnosisId,
  onSelectPrimaryDiagnosis,
  differentialIds,
  onToggleDifferential,
  doneCommIds,
  onDoCommunication,
  selectedDispositionId,
  onSelectDisposition,
  onFinishCase,
}) => {
  const [diagSearch, setDiagSearch] = useState('');
  const [diagCategory, setDiagCategory] = useState<'Semua' | 'Lab' | 'Radiologi' | 'EKG'>('Semua');
  const [drugFilter, setDrugFilter] = useState<string>('Semua');

  const tabTitles: Record<SidebarTab, { title: string; subtitle: string }> = {
    pasien: { title: 'Profil Pasien', subtitle: 'Identitas & keluhan utama triase' },
    anamnesis: { title: 'Anamnesis', subtitle: 'Gali riwayat penyakit & faktor risiko' },
    pemeriksaan_fisik: { title: 'Pemeriksaan Fisik', subtitle: 'Penilaian primer ABCDE sistematis' },
    penunjang: { title: 'Pemeriksaan Penunjang', subtitle: 'Order laboratorium, radiologi & EKG' },
    stabilisasi: { title: 'Stabilisasi ABCDE', subtitle: 'Jalan napas, oksigenasi, posisi & akses IV' },
    obat: { title: 'Tindakan & Obat', subtitle: 'Farmakoterapi bolus, oral & syringe pump' },
    diagnosis: { title: 'Diagnosis Klinis', subtitle: 'Tetapkan diagnosis kerja & banding' },
    komunikasi: { title: 'Komunikasi & Konsul', subtitle: 'Informed consent keluarga & spesialis' },
    disposisi: { title: 'Disposisi Pasien', subtitle: 'Keputusan tindak lanjut & akhiri kasus' },
  };

  const currentMeta = tabTitles[activeTab];
  const query = diagSearch.trim().toLowerCase();
  const diagnostics = clinicalCase.diagnostics.filter((test) =>
    (diagCategory === 'Semua' || test.category === diagCategory) && test.name.toLowerCase().includes(query)
  );
  const drugs = clinicalCase.drugs.filter((drug) => drugFilter === 'Semua' || drug.category === drugFilter);

  return (
    <section id="clipboard-section" aria-labelledby="clipboard-heading">
      <div className="clipboard-header">
        <h2 id="clipboard-heading">
          {currentMeta.title}
        </h2>
        <p>{currentMeta.subtitle}</p>
      </div>

      <div className="clipboard-body">
        {/* === 1. PASIEN === */}
        {activeTab === 'pasien' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <img
                src={clinicalCase.portraitUrl}
                alt=""
                width={192}
                height={192}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900">
                  {clinicalCase.patientName}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Usia {clinicalCase.age} tahun · {clinicalCase.gender === 'F' ? 'Perempuan' : 'Laki-laki'}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                  {clinicalCase.weightKg} kg · {clinicalCase.heightCm} cm · BMI {clinicalCase.bmi}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-500">Jaminan &amp; Lokasi</div>
              <div className="text-sm font-semibold text-slate-800">
                {clinicalCase.insurance} · {clinicalCase.hospitalName}
              </div>
              <div className="text-xs font-medium text-rose-600">{clinicalCase.triageTag}</div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Keluhan Utama</div>
              <p className="text-[13.5px] leading-relaxed text-slate-800">
                {clinicalCase.chiefComplaint}
              </p>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Pendamping / Wali</div>
              <div className="text-sm font-semibold text-slate-900">
                {clinicalCase.guardianName} ({clinicalCase.guardianRelation})
              </div>
              <p className="text-xs text-slate-600">{clinicalCase.consentNote}</p>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Alergi yang Diketahui</div>
              <p className="text-xs font-medium text-slate-700">{clinicalCase.knownAllergies}</p>
            </div>
          </div>
        )}

        {/* === 2. ANAMNESIS === */}
        {activeTab === 'anamnesis' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Pilih pertanyaan klinis terarah untuk menggali informasi dari pasien atau keluarga.
            </p>
            <div className="divide-y divide-slate-100">
              {clinicalCase.anamnesis.map((item) => {
                const asked = askedAnamnesisIds.includes(item.id);
                return (
                  <div key={item.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-semibold text-teal-700">
                        {item.category} · {item.speaker}
                      </div>
                      {asked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ditanyakan
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-900">
                      {item.question}
                    </div>
                    {asked ? (
                      <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 border border-slate-200/80">
                        <span className="font-bold text-slate-900">{item.speaker}: </span>
                        &ldquo;{item.answer}&rdquo;
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAskAnamnesis(item.id)}
                        className="mt-2 inline-flex min-h-[38px] sm:min-h-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 whitespace-nowrap"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Tanyakan</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === 3. PEMERIKSAAN FISIK === */}
        {activeTab === 'pemeriksaan_fisik' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Lakukan pemeriksaan primer ABCDE untuk menemukan tanda bahaya klinis secara sistematis.
            </p>
            <div className="divide-y divide-slate-100">
              {clinicalCase.physicalExams.map((exam) => {
                const done = doneExamIds.includes(exam.id);
                return (
                  <div key={exam.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-slate-500">{exam.system}</span>
                        <h3 className="text-[13.5px] font-bold text-slate-900">{exam.label}</h3>
                      </div>
                      {!done ? (
                        <button
                          type="button"
                          onClick={() => onDoPhysicalExam(exam.id)}
                          className="inline-flex min-h-[38px] sm:min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap"
                        >
                          <Stethoscope className="h-3.5 w-3.5" />
                          <span>Periksa</span>
                        </button>
                      ) : (
                        <span
                          className={`shrink-0 text-xs font-bold ${
                            exam.abnormal ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {exam.abnormal ? 'Abnormal' : 'Normal'}
                        </span>
                      )}
                    </div>
                    {done && (
                      <p className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                        {exam.finding}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === 4. PEMERIKSAAN PENUNJANG === */}
        {activeTab === 'penunjang' && (
          <div className="space-y-3.5">
            <div>
              <label htmlFor="diagnostic-search" className="mb-1.5 block text-xs font-bold">Cari pemeriksaan</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
                <input
                  id="diagnostic-search"
                  type="search"
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  placeholder="Contoh EKG atau BGA"
                  className="w-full rounded-lg border border-slate-400 bg-slate-50 py-2 pl-9 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Kategori pemeriksaan">
              {(['Semua', 'Lab', 'Radiologi', 'EKG'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDiagCategory(cat)}
                  aria-pressed={diagCategory === cat}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                    diagCategory === cat
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {diagnostics.length === 0 && (
                <p className="py-3 text-sm text-slate-600" role="status">Tidak ada pemeriksaan yang cocok.</p>
              )}
              {diagnostics.map((test) => {
                  const order = activeOrders.find((o) => o.testId === test.id);
                  const rem = order && !order.completed
                    ? Math.max(0, Math.ceil(order.completesAtSec - elapsedSec))
                    : 0;

                  return (
                    <div key={test.id} className="py-3 first:pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-slate-900">{test.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                            <span>{test.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-medium text-slate-700 tabular-nums">
                              {formatRupiah(test.cost)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>~{test.durationSec} dtk</span>
                          </div>
                        </div>

                        {!order ? (
                          <button
                            type="button"
                            onClick={() => onOrderDiagnostic(test.id)}
                            className="min-h-[38px] sm:min-h-0 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 whitespace-nowrap"
                          >
                            Pesan
                          </button>
                        ) : !order.completed ? (
                          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-amber-600 tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            Diproses {formatClock(rem)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenTestResult(test.id)}
                            className="inline-flex min-h-[38px] sm:min-h-0 shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 whitespace-nowrap"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Lihat Hasil</span>
                          </button>
                        )}
                      </div>

                      {order?.completed && (
                        <p className="mt-2 rounded-lg bg-teal-50/70 border border-teal-100 p-2 text-[11.5px] leading-relaxed text-slate-700">
                          {test.summary}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* === 5. STABILISASI ABCDE === */}
        {activeTab === 'stabilisasi' && (
          <div className="space-y-5">
            {/* Monitoring & Vascular Access */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500">Pemantauan &amp; Akses</div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onAttachMonitor}
                  disabled={monitorAttached}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                    monitorAttached
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      : 'border-slate-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Activity className="h-4 w-4 shrink-0 text-teal-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold">Pasang Monitor Vital &amp; SpO2</div>
                      <div className="text-[11px] text-slate-500">EKG 3-lead kontinu, NIBP, pulse oximeter · Rp 25.000</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {monitorAttached ? 'Terpasang' : 'Pasang'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onEstablishIv}
                  disabled={ivAccess}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                    ivAccess
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      : 'border-slate-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Syringe className="h-4 w-4 shrink-0 text-sky-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold">Pasang Akses IV Perifer (18G/20G)</div>
                      <div className="text-[11px] text-slate-500">Syarat obat IV bolus &amp; syringe pump · Rp 35.000</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {ivAccess ? 'Terpasang' : 'Pasang'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onPlaceCatheter}
                  disabled={urinaryCatheter}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                    urinaryCatheter
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      : 'border-slate-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <FileBarChart2 className="h-4 w-4 shrink-0 text-slate-600" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold">Pasang Kateter Urin (Pantau Diuresis)</div>
                      <div className="text-[11px] text-slate-500">Evaluasi output urin pasca diuretik / syok · Rp 45.000</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {urinaryCatheter ? 'Terpasang' : 'Pasang'}
                  </span>
                </button>
              </div>
            </div>

            {/* Patient Posture */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Posisi Pasien</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['high_fowler', 'Duduk 75° (High-Fowler)', 'Ortopnea / edema paru'],
                    ['semi_fowler', 'Semi-Fowler 40°', 'Nyeri dada / umum'],
                    ['supine', 'Supinasi Datar', 'Pemeriksaan / resusitasi'],
                    ['trendelenburg', 'Elevasi Tungkai', 'Syok / hipotensi'],
                  ] as const
                ).map(([pKey, label, note]) => (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => onChangePosture(pKey)}
                    aria-pressed={posture === pKey}
                    className={`rounded-xl border p-2.5 text-left transition-colors ${
                      posture === pKey
                        ? 'border-teal-600 bg-teal-50 text-teal-950'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{label}</div>
                    <div className="mt-0.5 text-[10.5px] text-slate-500">{note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Oxygen Therapy & Endotracheal Intubation */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Terapi Oksigen &amp; Jalan Napas</div>
              <div className="space-y-2">
                {(
                  [
                    ['nasal_cannula', 'Nasal Kanul 3–4 L/mnt', 'Hipoksemia ringan (SpO2 90–93%) · Rp 20.000'],
                    ['nrm', 'Non-Rebreathing Mask (NRM) 15 L/mnt', 'Hipoksemia berat / gawat napas · Rp 45.000'],
                    ['bvm', 'Bag-Valve Mask (Pre-oksigenasi)', 'Bantuan ventilasi manual · Rp 35.000'],
                  ] as const
                ).map(([oKey, label, desc]) => (
                  <button
                    key={oKey}
                    type="button"
                    onClick={() => onChangeOxygen(oKey)}
                    aria-pressed={oxygen === oKey}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      oxygen === oKey
                        ? 'border-teal-600 bg-teal-50 text-teal-950'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Wind className="h-4 w-4 shrink-0 text-teal-600" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[11px] text-slate-500">{desc}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-teal-700">
                      {oxygen === oKey ? 'Aktif' : 'Pilih'}
                    </span>
                  </button>
                ))}

                {/* Launch Interactive 2D Laryngoscopy Minigame */}
                <button
                  type="button"
                  onClick={onStartIntubation}
                  disabled={oxygen === 'ett'}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                    oxygen === 'ett'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">
                      {oxygen === 'ett' ? 'Intubasi ETT Terpasang + Ventilator' : 'Intubasi Endotrakeal (Laringoskopi 2D)'}
                    </div>
                    <div className={`text-[11px] ${oxygen === 'ett' ? 'text-emerald-700' : 'text-slate-300'}`}>
                      {oxygen === 'ett'
                        ? 'Jalan napas definitif aman terhubung ventilator'
                        : 'Buka prosedur interaktif laringoskopi · Rp 180.000'}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold ${oxygen === 'ett' ? 'text-emerald-800' : 'text-teal-300'}`}>
                    {oxygen === 'ett' ? 'Selesai' : 'Mulai'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === 6. TINDAKAN DAN OBAT === */}
        {activeTab === 'obat' && (
          <div className="space-y-3.5">
            {!ivAccess && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Akses IV belum terpasang. Obat jalur IV &amp; Syringe Pump memerlukan pemasangan infus di menu Stabilisasi.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategori obat">
              {['Semua', 'Syringe Pump', 'Bolus IV', 'Oral / SL', 'IM / Inhalasi', 'Cairan IV'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDrugFilter(cat)}
                  aria-pressed={drugFilter === cat}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    drugFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-100">
              {drugs.length === 0 && (
                <p className="py-3 text-sm text-slate-600" role="status">Tidak ada obat dalam kategori ini.</p>
              )}
              {drugs.map((drug) => {
                  const pumpRunning = activePumps.some((p) => p.drugId === drug.id);
                  const timesGiven = administeredDrugs.filter((a) => a.drugId === drug.id).length;
                  const blockedByIv = Boolean(drug.requiresIv && !ivAccess);

                  return (
                    <div key={drug.id} className="py-3 first:pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-slate-900">{drug.name}</div>
                          <div className="text-[11px] font-medium text-teal-700">
                            {drug.doseLabel} · {drug.route}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={blockedByIv || pumpRunning}
                          onClick={() => onAdministerDrug(drug.id)}
                          className={`min-h-[38px] sm:min-h-0 shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                            pumpRunning
                              ? 'bg-emerald-100 text-emerald-800'
                              : blockedByIv
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-teal-600 text-white hover:bg-teal-500'
                          }`}
                        >
                          {pumpRunning
                            ? 'Pump Aktif'
                            : drug.isPump
                              ? 'Mulai Drip'
                              : timesGiven > 0
                                ? `Beri Lagi (${timesGiven}x)`
                                : 'Berikan'}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">
                        {drug.indication}
                      </p>
                      <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                        Tarif: {formatRupiah(drug.cost)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* === 7. DIAGNOSIS === */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500">Diagnosis Kerja Utama (Pilih 1)</div>
              <div className="space-y-2">
                {clinicalCase.diagnoses.map((diag) => {
                  const selected = primaryDiagnosisId === diag.id;
                  return (
                    <button
                      key={diag.id}
                      type="button"
                      onClick={() => onSelectPrimaryDiagnosis(diag.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-teal-600 bg-teal-50 text-teal-950'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold leading-snug">{diag.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          ICD-10: {diag.icd10}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                          selected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="text-xs font-bold text-slate-500">Diagnosis Banding (Opsional)</div>
              <div className="space-y-1.5">
                {clinicalCase.diagnoses
                  .filter((d) => d.id !== primaryDiagnosisId)
                  .map((diag) => {
                    const checked = differentialIds.includes(diag.id);
                    return (
                      <button
                        key={diag.id}
                        type="button"
                        onClick={() => onToggleDifferential(diag.id)}
                        aria-pressed={checked}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          checked
                            ? 'border-slate-800 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-medium">{diag.name}</span>
                        <span className="font-mono text-[10px] opacity-75">{diag.icd10}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* === 8. KOMUNIKASI === */}
        {activeTab === 'komunikasi' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Lakukan edukasi, permintaan informed consent, serta konsultasi dokter spesialis sesuai kebutuhan kasus.
            </p>
            <div className="divide-y divide-slate-100">
              {clinicalCase.communications.map((comm) => {
                const done = doneCommIds.includes(comm.id);
                return (
                  <div key={comm.id} className="py-3.5 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-teal-700">{comm.target}</div>
                        <h3 className="text-[13px] font-bold text-slate-900">{comm.title}</h3>
                      </div>
                      {done && (
                        <span className="shrink-0 text-xs font-bold text-emerald-700">Selesai</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{comm.description}</p>

                    {done ? (
                      <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                        <div className="font-bold text-slate-900">{comm.responseSpeaker}:</div>
                        <p className="mt-0.5">&ldquo;{comm.responseText}&rdquo;</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDoCommunication(comm.id)}
                        className="mt-2.5 inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-white hover:bg-teal-700 whitespace-nowrap"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Lakukan Komunikasi</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === 9. DISPOSISI === */}
        {activeTab === 'disposisi' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Setelah pasien stabil dan diagnosis kerja ditetapkan, pilih disposisi tindak lanjut untuk mengakhiri sesi jaga dan melihat evaluasi klinis.
            </p>

            <div className="space-y-2.5">
              {clinicalCase.dispositions.map((disp) => {
                const selected = selectedDispositionId === disp.id;
                return (
                  <button
                    key={disp.id}
                    type="button"
                    onClick={() => onSelectDisposition(disp.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                      selected
                        ? 'border-teal-600 bg-teal-50 text-teal-950'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{disp.title}</div>
                    <div className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                      {disp.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={!selectedDispositionId}
                onClick={onFinishCase}
                className="w-full rounded-xl bg-teal-600 py-3 text-xs font-extrabold text-white transition-colors hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-600"
              >
                Selesaikan Kasus &amp; Lihat Evaluasi Klinis
              </button>
              {!primaryDiagnosisId && (
                <p className="mt-2 text-center text-[11px] text-amber-700">
                  Tips: Pastikan Anda sudah memilih Diagnosis Kerja sebelum menyelesaikan kasus.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
