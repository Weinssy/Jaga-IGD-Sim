import React from 'react';
import { Volume2, VolumeX, Play, Clock, ShieldAlert } from 'lucide-react';
import { ClinicalCase } from '../types/clinical';
import { ASSET_PATHS, formatRupiah } from '../data/cases';

interface TitleScreenProps {
  cases: ClinicalCase[];
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onStartGame: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onStartGame,
  muted,
  onToggleMute,
}) => {
  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-slate-950 text-slate-100 select-none">
      {/* Full-viewport 2D key art backdrop */}
      <img
        src={ASSET_PATHS.titleBackdrop}
        alt="Ruang Resusitasi IGD RS Nusantara"
        referrerPolicy="no-referrer"
        className="fixed inset-0 h-full w-full object-cover object-center lg:object-right opacity-80"
      />
      {/* Contrast scrims */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/85 to-slate-950/95 lg:bg-gradient-to-r lg:from-slate-950 lg:via-slate-950/90 lg:to-slate-950/35" />
      <div className="fixed inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />

      {/* Top utility bar */}
      <header className="relative z-20 mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-400">
          <span className="font-semibold text-slate-200">RS Nusantara</span>
          <span aria-hidden="true">·</span>
          <span>Instalasi Gawat Darurat</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span className="hidden sm:inline">Simulasi Klinis 2D</span>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 whitespace-nowrap"
          aria-label={muted ? 'Aktifkan suara monitor' : 'Bisukan suara monitor'}
        >
          {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-teal-400" />}
          <span>{muted ? 'Suara Nonaktif' : 'Audio Aktif'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-68px)] max-w-[1440px] items-center px-4 py-6 sm:px-8 sm:py-8">
        <div className="w-full max-w-[600px] space-y-6">
          {/* Clean Responsive Brand Lockup (no overlapping SVG text) */}
          <div className="space-y-3">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <svg
                viewBox="0 0 72 72"
                className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                role="img"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="jagaTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#0D9488" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="68" height="68" rx="16" fill="#0F172A" stroke="#14B8A6" strokeWidth="2.5" />
                <rect x="29" y="14" width="14" height="44" rx="3" fill="url(#jagaTeal)" />
                <rect x="14" y="29" width="44" height="14" rx="3" fill="url(#jagaTeal)" />
                <polyline
                  points="10,36 24,36 30,20 37,52 43,30 48,36 62,36"
                  fill="none"
                  stroke="#F8FAFC"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-none">
                  JAGA <span className="text-teal-400">IGD</span>
                </h1>
                <p className="mt-1.5 text-xs font-medium text-slate-400 sm:text-sm">
                  Simulasi Dokter Jaga · Resusitasi &amp; Tata Laksana Akut
                </p>
              </div>
            </div>

            <p className="max-w-lg text-sm leading-relaxed text-slate-300 sm:text-[15px]">
              Tangani pasien gawat darurat secara real-time: pasang monitor vital, baca EKG 12-lead, titrasi syringe pump, lakukan laringoskopi intubasi 2D, hingga kendalikan efisiensi biaya BPJS.
            </p>
          </div>

          {/* Case Selection List */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400">
              <span>Pilih Kasus Jaga ({cases.length} Pasien)</span>
              <span className="font-mono text-slate-500">Shift Malam · Ruang Resusitasi</span>
            </div>

            <div className="space-y-2.5">
              {cases.map((c) => {
                const isSelected = c.id === selectedCaseId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCase(c.id)}
                    className={`group flex w-full items-start sm:items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                      isSelected
                        ? 'border-teal-400/80 bg-slate-900/95 shadow-lg shadow-teal-950/40'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900/85'
                    }`}
                  >
                    <img
                      src={c.portraitUrl}
                      alt={c.patientName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <span>{c.patientName}</span>
                          <span className="text-slate-500 font-normal">·</span>
                          <span className="text-xs font-medium text-slate-300">
                            {c.gender === 'F' ? '♀' : '♂'} {c.age} th
                          </span>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            c.difficulty === 'Sangat Kritis' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {c.triageTag}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 sm:truncate text-xs text-slate-300">
                        {c.chiefComplaint}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                        <span>TD {c.initialVitals.sbp}/{c.initialVitals.dbp}</span>
                        <span aria-hidden="true">·</span>
                        <span>HR {c.initialVitals.hr}</span>
                        <span aria-hidden="true">·</span>
                        <span className={c.initialVitals.spo2 < 90 ? 'text-rose-400 font-semibold' : ''}>
                          SpO2 {c.initialVitals.spo2}%
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Plafon {formatRupiah(c.budgetLimit)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start CTA + Shortcut hint */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onStartGame}
                className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-teal-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all duration-150 hover:bg-teal-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Mulai Tangani {activeCase.patientName}</span>
              </button>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>{activeCase.difficulty}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-teal-400" />
                  <span>Real-time</span>
                </span>
              </div>
            </div>

            <p className="hidden sm:block text-xs text-slate-500">
              Enter Mulai · Spasi Jeda · 1–3 Kecepatan Simulasi · M Pasang Monitor · Esc Menu
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
