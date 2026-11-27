import React, { useState } from 'react';
import {
  Activity,
  FileText,
  Minus,
  Plus,
  Pause,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Syringe,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ActivePump,
  ActiveTestOrder,
  ClinicalCase,
  NurseDialogue,
  OxygenDelivery,
  PatientPosture,
  VitalSigns,
} from '../types/clinical';
import { ASSET_PATHS, formatClock } from '../data/cases';

interface ErBayStageProps {
  clinicalCase: ClinicalCase;
  vitals: VitalSigns;
  posture: PatientPosture;
  monitorAttached: boolean;
  ivAccess: boolean;
  oxygen: OxygenDelivery;
  activePumps: ActivePump[];
  activeOrders: ActiveTestOrder[];
  elapsedSec: number;
  nurseDialogue: NurseDialogue | null;
  onDismissDialogue: () => void;
  onAttachMonitor: () => void;
  onAdjustPump: (drugId: string, delta: number) => void;
  onTogglePumpPause: (drugId: string) => void;
  onStopPump: (drugId: string) => void;
  onOpenTestResult: (testId: string) => void;
  onOpenMedicalRecord: () => void;
}

export const ErBayStage: React.FC<ErBayStageProps> = ({
  clinicalCase,
  vitals,
  posture,
  monitorAttached,
  ivAccess,
  oxygen,
  activePumps,
  activeOrders,
  elapsedSec,
  nurseDialogue,
  onDismissDialogue,
  onAttachMonitor,
  onAdjustPump,
  onTogglePumpPause,
  onStopPump,
  onOpenTestResult,
  onOpenMedicalRecord,
}) => {
  const [selectedPumpId, setSelectedPumpId] = useState<string | null>(null);
  const [showRunningPanel, setShowRunningPanel] = useState(true);
  const [pumpPanelOpen, setPumpPanelOpen] = useState(true);
  // Mobile-only collapsible overlay selector ('none' | 'pump' | 'running')
  const [mobileOverlay, setMobileOverlay] = useState<'none' | 'pump' | 'running'>('none');

  const activePump =
    activePumps.find((p) => p.drugId === selectedPumpId) || activePumps[0] || null;

  const isHypoxic = vitals.spo2 < 89;
  const isDiaphoretic = vitals.hr > 115 || vitals.pain >= 7;
  const breathCycleSec = Math.max(1.2, Math.min(4.5, 60 / Math.max(10, vitals.rr)));

  // Backrest rotation angle depending on posture
  const backrestAngle =
    posture === 'high_fowler'
      ? -66
      : posture === 'semi_fowler'
        ? -38
        : posture === 'trendelenburg'
          ? -6
          : -8;

  const bedTiltDeg = posture === 'trendelenburg' ? -4 : 0;

  const pendingOrders = activeOrders.filter((o) => !o.completed);
  const completedOrders = activeOrders.filter((o) => o.completed);
  const runningCount = activePumps.length + pendingOrders.length;

  const app = clinicalCase.appearance;

  const renderPumpCard = (onCloseCard: () => void, isMobile = false) => {
    if (!activePump) return null;
    return (
      <div className="pointer-events-auto rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Syringe className="h-4 w-4 shrink-0 text-teal-400" />
            <span className="truncate text-xs font-bold tracking-wide text-white">Syringe Pump</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {activePumps.length > 1 && (
              <select
                value={activePump.drugId}
                onChange={(e) => setSelectedPumpId(e.target.value)}
                className="max-w-[115px] rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200"
              >
                {activePumps.map((p) => (
                  <option key={p.drugId} value={p.drugId}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onCloseCard}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Sembunyikan panel pump"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{activePump.name}</div>
            <div className="truncate text-[11px] text-slate-400">{activePump.route}</div>
          </div>
          <span
            className={`shrink-0 text-[11px] font-semibold ${
              activePump.paused ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {activePump.paused ? 'Dijeda' : 'Berjalan'}
          </span>
        </div>

        {/* Titration Controls */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-950/90 px-3 py-2">
          <button
            type="button"
            onClick={() => onAdjustPump(activePump.drugId, -activePump.step)}
            disabled={activePump.rate <= activePump.min}
            className={`flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 ${
              isMobile ? 'h-10 w-10' : 'h-8 w-8'
            }`}
            aria-label="Turunkan dosis"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="px-2 text-center">
            <div className="font-mono text-xl font-bold text-teal-300 tabular-nums">
              {activePump.rate}
            </div>
            <div className="font-mono text-[10px] text-slate-400">{activePump.unit}</div>
          </div>
          <button
            type="button"
            onClick={() => onAdjustPump(activePump.drugId, activePump.step)}
            disabled={activePump.rate >= activePump.max}
            className={`flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 ${
              isMobile ? 'h-10 w-10' : 'h-8 w-8'
            }`}
            aria-label="Naikkan dosis"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTogglePumpPause(activePump.drugId)}
            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
          >
            {activePump.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{activePump.paused ? 'Lanjut' : 'Jeda'}</span>
          </button>
          <button
            type="button"
            onClick={() => onStopPump(activePump.drugId)}
            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/60 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/70 whitespace-nowrap"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    );
  };

  const renderRunningListBody = () => (
    <div className="space-y-2 overflow-y-auto px-3.5 py-2.5 text-xs dark-scroll">
      {activePumps.map((pump) => (
        <button
          key={pump.drugId}
          type="button"
          onClick={() => {
            setSelectedPumpId(pump.drugId);
            setPumpPanelOpen(true);
            setMobileOverlay('pump');
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-800/80 px-2.5 py-2 text-left hover:bg-slate-800"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-teal-300">{pump.name}</div>
            <div className="truncate font-mono text-[10px] text-slate-400">
              Drip {pump.rate} {pump.unit}
            </div>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-semibold text-emerald-400">
            {pump.paused ? 'Jeda' : 'Kontinu'}
          </span>
        </button>
      ))}

      {pendingOrders.map((order) => {
        const test = clinicalCase.diagnostics.find((d) => d.id === order.testId);
        if (!test) return null;
        const rem = Math.max(0, Math.ceil(order.completesAtSec - elapsedSec));
        return (
          <div
            key={order.testId}
            className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-slate-200">{test.name}</div>
              <div className="text-[10px] text-slate-400">{test.category}</div>
            </div>
            <span className="shrink-0 font-mono text-[11px] font-semibold text-amber-300 tabular-nums">
              T-{formatClock(rem)}
            </span>
          </div>
        );
      })}

      {completedOrders.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-800 pt-1.5">
          <div className="text-[10px] font-semibold text-slate-400">Hasil Selesai (Klik buka)</div>
          {completedOrders.map((order) => {
            const test = clinicalCase.diagnostics.find((d) => d.id === order.testId);
            if (!test) return null;
            return (
              <button
                key={order.testId}
                type="button"
                onClick={() => onOpenTestResult(test.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-teal-800/60 bg-teal-950/60 px-2.5 py-2 text-left hover:bg-teal-900/60"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-teal-200">{test.name}</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-200 select-none">
      {/* Modern 2D ER Bay Backdrop */}
      <img
        src={ASSET_PATHS.erBayBackdrop}
        alt="Ruang Resusitasi IGD"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/25" />

      {/* Top-center status summary ribbon (wraps cleanly on narrow screens, zero overlap) */}
      <div className="pointer-events-none absolute inset-x-3 top-2.5 z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-medium text-slate-700">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-slate-200/90 bg-white/92 px-3 py-1.5 shadow-sm">
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-slate-900">Posisi:</span>
            <span>
              {posture === 'high_fowler'
                ? 'Duduk 75° (High-Fowler)'
                : posture === 'semi_fowler'
                  ? 'Semi-Fowler 40°'
                  : posture === 'trendelenburg'
                    ? 'Berbaring + Elevasi Tungkai'
                    : 'Supinasi (Datar)'}
            </span>
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-slate-900">O₂:</span>
            <span className={oxygen === 'none' ? 'text-slate-500' : 'font-semibold text-teal-700'}>
              {oxygen === 'none'
                ? 'Udara ruangan'
                : oxygen === 'nasal_cannula'
                  ? 'Nasal Kanul 4 L/m'
                  : oxygen === 'nrm'
                    ? 'NRM 15 L/m'
                    : oxygen === 'bvm'
                      ? 'Bag-Valve Mask'
                      : 'Intubasi ETT + Vent'}
            </span>
          </span>
        </div>

        {/* Desktop clickable Pump Badge if pump exists and panel is collapsed */}
        {activePumps.length > 0 && !pumpPanelOpen && (
          <button
            type="button"
            onClick={() => setPumpPanelOpen(true)}
            className="pointer-events-auto hidden md:inline-flex items-center gap-2 rounded-lg border border-teal-500/60 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-teal-300 shadow-md hover:bg-slate-800 whitespace-nowrap"
          >
            <Syringe className="h-3.5 w-3.5" />
            <span>Syringe Pump ({activePumps.length})</span>
          </button>
        )}
      </div>

      {/* Interactive Layered 2D Vector ER Scene */}
      <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4 pt-12 sm:pt-8 pb-14 sm:pb-10">
        <svg
          viewBox="0 0 880 480"
          className="h-full max-h-[540px] w-full max-w-[920px] drop-shadow-sm"
          role="img"
          aria-label={`Ilustrasi 2D pasien ${clinicalCase.patientName} di ruang resusitasi IGD`}
        >
          <defs>
            <linearGradient id="bedMetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="mattressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="railBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E3A5F" />
              <stop offset="100%" stopColor="#2B5282" />
            </linearGradient>
            <linearGradient id="o2TankGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="45%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="blanketGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <filter id="floorShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Ground Contact Shadows */}
          <ellipse cx="470" cy="414" rx="245" ry="20" fill="#0F172A" opacity="0.16" filter="url(#floorShadow)" />
          {ivAccess && <ellipse cx="182" cy="404" rx="46" ry="9" fill="#0F172A" opacity="0.14" />}
          {oxygen !== 'none' && <ellipse cx="115" cy="406" rx="34" ry="8" fill="#0F172A" opacity="0.14" />}
          {monitorAttached && <ellipse cx="754" cy="408" rx="44" ry="9" fill="#0F172A" opacity="0.14" />}

          {/* === OXYGEN CYLINDER & HUMIDIFIER === */}
          {oxygen !== 'none' && (
            <g className="transition-opacity duration-200">
              <path d="M90 398 L140 398 L136 406 L94 406 Z" fill="#475569" stroke="#1E293B" strokeWidth="1.8" />
              <circle cx="96" cy="406" r="5" fill="#1E293B" />
              <circle cx="134" cy="406" r="5" fill="#1E293B" />
              <rect x="97" y="246" width="36" height="152" rx="16" fill="url(#o2TankGrad)" stroke="#1E293B" strokeWidth="2.2" />
              <path d="M98 264 Q115 256 132 264 L132 284 L98 284 Z" fill="#059669" stroke="#1E293B" strokeWidth="1.5" />
              <rect x="110" y="226" width="10" height="22" rx="2" fill="#94A3B8" stroke="#1E293B" strokeWidth="1.8" />
              <circle cx="129" cy="233" r="9" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.8" />
              <line x1="129" y1="233" x2="134" y2="229" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
              <rect x="136" y="248" width="18" height="32" rx="4" fill="#E0F2FE" stroke="#1E293B" strokeWidth="1.6" />
              <rect x="138" y="262" width="14" height="16" rx="2" fill="#38BDF8" opacity="0.5" />
              <circle cx="143" cy="272" r="2" fill="#FFFFFF" className="animate-bubble" />
              <circle cx="148" cy="274" r="1.5" fill="#FFFFFF" className="animate-bubble" style={{ animationDelay: '0.6s' }} />
              <path
                d="M154 256 C205 260, 225 235, 326 218"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.88"
              />
            </g>
          )}

          {/* === IV POLE + INFUSION BAG + SYRINGE PUMP === */}
          <g>
            <path d="M150 398 L214 398" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <path d="M182 390 L160 402 M182 390 L204 402" stroke="#475569" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="156" cy="404" r="4.5" fill="#1E293B" />
            <circle cx="208" cy="404" r="4.5" fill="#1E293B" />
            <circle cx="182" cy="406" r="4.5" fill="#1E293B" />
            <rect x="179" y="108" width="6" height="288" rx="3" fill="#CBD5E1" stroke="#334155" strokeWidth="1.6" />
            <path d="M156 122 C156 110, 178 110, 182 118 C186 110, 208 110, 208 122" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

            {ivAccess && (
              <g>
                <rect x="150" y="126" width="24" height="44" rx="6" fill="#E0F2FE" stroke="#1E293B" strokeWidth="1.8" />
                <rect x="152" y="142" width="20" height="25" rx="3" fill="#38BDF8" opacity="0.45" />
                <line x1="154" y1="138" x2="170" y2="138" stroke="#0284C7" strokeWidth="1.2" />
                <rect x="159" y="170" width="6" height="24" rx="3" fill="#F8FAFC" stroke="#334155" strokeWidth="1.4" />
                <circle cx="162" cy="174" r="1.8" fill="#0284C7" className="animate-drip" />
                <path
                  d="M162 194 C162 290, 255 312, 392 280"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.4"
                  opacity="0.85"
                />
              </g>
            )}

            {activePumps.length > 0 && (
              <g
                onClick={() => {
                  setPumpPanelOpen((v) => !v);
                  setMobileOverlay((prev) => (prev === 'pump' ? 'none' : 'pump'));
                }}
                className="cursor-pointer"
              >
                <rect
                  x="158"
                  y="214"
                  width="64"
                  height="38"
                  rx="7"
                  fill="#0F172A"
                  stroke={activePumps.some((p) => !p.paused) ? '#14B8A6' : '#F59E0B'}
                  strokeWidth="2.2"
                />
                <rect x="166" y="206" width="38" height="8" rx="2" fill="#E2E8F0" stroke="#334155" strokeWidth="1.2" />
                <rect x="174" y="208" width="20" height="4" fill="#2DD4BF" opacity="0.8" />
                <rect x="164" y="221" width="36" height="17" rx="3" fill="#134E4A" />
                <text
                  x="182"
                  y="233"
                  textAnchor="middle"
                  fill="#5EEAD4"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize="9"
                  fontWeight="700"
                >
                  {activePump ? activePump.rate : 'ON'}
                </text>
                <circle
                  cx="211"
                  cy="226"
                  r="3.5"
                  fill={activePumps.some((p) => !p.paused) ? '#10B981' : '#F59E0B'}
                />
                <text
                  x="190"
                  y="247"
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontSize="7"
                  fontWeight="600"
                >
                  PUMP
                </text>
              </g>
            )}
          </g>

          {/* === BEDSIDE MULTI-PARAMETER MONITOR STAND (Strict left-wave / right-numerals split so text NEVER overlaps) === */}
          {monitorAttached && (
            <g>
              <path d="M722 400 L790 400" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <circle cx="728" cy="405" r="5" fill="#1E293B" />
              <circle cx="784" cy="405" r="5" fill="#1E293B" />
              <rect x="752" y="216" width="8" height="184" rx="3" fill="#CBD5E1" stroke="#334155" strokeWidth="1.8" />
              {/* Wider Monitor Chassis */}
              <rect x="690" y="130" width="132" height="88" rx="10" fill="#1E293B" stroke="#0F172A" strokeWidth="2.4" />
              <rect x="698" y="138" width="116" height="70" rx="5" fill="#090F1B" />
              {/* Vertical divider separating traces (left) from numeric telemetry (right) */}
              <line x1="762" y1="144" x2="762" y2="202" stroke="#1E293B" strokeWidth="1.2" />
              {/* Mini glowing ECG wave & Pleth strictly within x=703..757 */}
              <polyline
                points="703,160 711,160 715,149 719,169 723,160 735,160 739,150 743,168 747,160 757,160"
                fill="none"
                stroke="#34D399"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="703,186 713,179 722,188 733,179 743,188 757,183"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              {/* Right Numeric Readouts cleanly isolated in x=766..809 */}
              <text x="808" y="158" textAnchor="end" fill="#34D399" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="700">
                {Math.round(vitals.hr)}
              </text>
              <text x="808" y="177" textAnchor="end" fill="#38BDF8" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700">
                {Math.round(vitals.spo2)}%
              </text>
              <text x="808" y="196" textAnchor="end" fill={vitals.sbp >= 180 || vitals.sbp < 90 ? '#FB7185' : '#E2E8F0'} fontFamily="'IBM Plex Mono', monospace" fontSize="8.5" fontWeight="600">
                {Math.round(vitals.sbp)}/{Math.round(vitals.dbp)}
              </text>
              {/* ECG Lead Cable to Patient */}
              <path
                d="M690 196 C648 210, 622 268, 430 250"
                fill="none"
                stroke="#475569"
                strokeWidth="2.2"
                strokeDasharray="4 2"
                opacity="0.7"
              />
            </g>
          )}

          {/* === MODERN 2D MOTORIZED HOSPITAL BED & ANIMATED PATIENT === */}
          <g transform={`rotate(${bedTiltDeg}, 470, 325)`}>
            <rect x="330" y="346" width="280" height="18" rx="5" fill="#475569" stroke="#1E293B" strokeWidth="2" />
            <rect x="372" y="364" width="30" height="32" rx="4" fill="#64748B" stroke="#1E293B" strokeWidth="2" />
            <rect x="536" y="364" width="30" height="32" rx="4" fill="#64748B" stroke="#1E293B" strokeWidth="2" />
            <rect x="310" y="388" width="320" height="10" rx="5" fill="#334155" stroke="#1E293B" strokeWidth="2" />
            <circle cx="326" cy="404" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
            <circle cx="614" cy="404" r="10" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />

            {/* Headboard */}
            <path
              d="M254 218 Q254 202 270 202 L286 202 L286 350 L254 350 Z"
              fill="url(#bedMetal)"
              stroke="#1E293B"
              strokeWidth="2.4"
            />
            <rect x="260" y="218" width="18" height="44" rx="5" fill="url(#railBlue)" />

            {/* Main Mattress Base */}
            <rect x="278" y="312" width="390" height="36" rx="10" fill="url(#bedMetal)" stroke="#1E293B" strokeWidth="2.2" />
            <rect x="382" y="286" width="280" height="30" rx="10" fill="url(#mattressGrad)" stroke="#334155" strokeWidth="2" />

            {/* Articulating Backrest */}
            <g transform={`translate(392, 312) rotate(${backrestAngle + 90})`}>
              <rect x="-14" y="-122" width="28" height="122" rx="9" fill="url(#mattressGrad)" stroke="#334155" strokeWidth="2" />
              <ellipse cx="14" cy="-96" rx="15" ry="26" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="1.6" />
            </g>

            {/* Patient Character */}
            <g>
              <path
                d="M396 276 L588 276 Q604 276 604 292 L604 304 Q604 312 588 312 L396 312 Z"
                fill={app.pantsColor}
                stroke="#0F172A"
                strokeWidth="2.2"
              />
              <path
                d="M454 268 Q526 260 612 274 L616 312 L446 312 Z"
                fill="url(#blanketGrad)"
                stroke="#0369A1"
                strokeWidth="2"
              />
              <ellipse cx="624" cy="294" rx="13" ry="18" fill={app.skinTone} stroke="#1E293B" strokeWidth="2" />

              <g
                style={{
                  transformOrigin: '402px 294px',
                  transform: `rotate(${backrestAngle + 86}deg)`,
                  transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <g>
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1 1; 1.045 1.015; 1 1"
                    dur={`${breathCycleSec}s`}
                    repeatCount="indefinite"
                    additive="sum"
                  />
                  <path
                    d="M380 296 L380 212 Q380 194 404 194 L424 194 Q444 194 446 218 L442 296 Z"
                    fill={app.topColor}
                    stroke="#0F172A"
                    strokeWidth="2.4"
                  />
                  <path
                    d="M398 194 L412 214 L426 194"
                    fill="none"
                    stroke={app.topAccent}
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                  />
                  {vitals.pain >= 7 ? (
                    <path
                      d="M432 214 Q454 238 424 252 Q408 258 402 246"
                      fill="none"
                      stroke={app.topColor}
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M428 214 Q456 248 456 286"
                      fill="none"
                      stroke={app.topColor}
                      strokeWidth="15"
                      strokeLinecap="round"
                    />
                  )}
                  <circle
                    cx={vitals.pain >= 7 ? 404 : 456}
                    cy={vitals.pain >= 7 ? 248 : 288}
                    r="8"
                    fill={app.skinTone}
                    stroke="#0F172A"
                    strokeWidth="1.8"
                  />
                  {ivAccess && (
                    <rect
                      x={vitals.pain >= 7 ? 426 : 446}
                      y={vitals.pain >= 7 ? 242 : 272}
                      width="12"
                      height="6"
                      rx="2"
                      fill="#F8FAFC"
                      stroke="#0284C7"
                      strokeWidth="1.4"
                    />
                  )}
                </g>

                <rect x="401" y="176" width="18" height="22" rx="6" fill={app.skinTone} stroke="#0F172A" strokeWidth="2" />

                <g>
                  {app.hasBun && (
                    <circle cx="378" cy="148" r="15" fill={app.hairColor} stroke="#0F172A" strokeWidth="2.2" />
                  )}
                  {app.hasHijab && (
                    <path
                      d="M380 154 C380 118, 438 118, 440 156 L444 198 Q412 208 378 196 Z"
                      fill={app.hijabColor || '#5B6E3A'}
                      stroke="#0F172A"
                      strokeWidth="2.4"
                    />
                  )}
                  <ellipse cx="414" cy="154" rx="25" ry="29" fill={app.skinTone} stroke="#0F172A" strokeWidth="2.3" />
                  {!app.hasHijab && (
                    <path
                      d="M388 150 C388 122, 438 120, 440 146 C432 136, 404 134, 392 152 Z"
                      fill={app.hairColor}
                      stroke="#0F172A"
                      strokeWidth="2.2"
                    />
                  )}
                  <path d="M405 144 Q411 141 415 145" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                  <path d="M423 145 Q428 141 433 144" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="411" cy="152" r="2.4" fill="#0F172A" />
                  <circle cx="427" cy="152" r="2.4" fill="#0F172A" />

                  <ellipse
                    cx="420"
                    cy="168"
                    rx={vitals.rr > 26 ? 5.5 : 4.5}
                    ry={vitals.rr > 26 ? 3.8 : 2}
                    fill={isHypoxic ? '#6366F1' : '#B91C1C'}
                    opacity="0.75"
                    stroke="#0F172A"
                    strokeWidth="1.4"
                  />

                  {isDiaphoretic && (
                    <g className="animate-sweat">
                      <path d="M398 140 Q401 146 398 148 Q395 146 398 140 Z" fill="#38BDF8" />
                      <path d="M434 148 Q437 154 434 156 Q431 154 434 148 Z" fill="#38BDF8" />
                    </g>
                  )}

                  {oxygen === 'nasal_cannula' && (
                    <g>
                      <path d="M392 158 Q408 164 422 162" fill="none" stroke="#10B981" strokeWidth="2.4" />
                      <circle cx="422" cy="161" r="2.2" fill="#059669" />
                    </g>
                  )}
                  {(oxygen === 'nrm' || oxygen === 'bvm') && (
                    <g>
                      <path
                        d="M412 156 Q434 156 436 172 Q424 180 412 174 Z"
                        fill="#BAE6FD"
                        fillOpacity="0.65"
                        stroke="#0284C7"
                        strokeWidth="1.8"
                      />
                      <line x1="390" y1="160" x2="413" y2="164" stroke="#10B981" strokeWidth="2" />
                      {oxygen === 'nrm' && (
                        <ellipse cx="436" cy="190" rx="10" ry="14" fill="#E0F2FE" fillOpacity="0.7" stroke="#0284C7" strokeWidth="1.5" />
                      )}
                    </g>
                  )}
                  {oxygen === 'ett' && (
                    <g>
                      <path d="M420 168 Q444 170 462 184" fill="none" stroke="#E2E8F0" strokeWidth="5.5" strokeLinecap="round" />
                      <path d="M420 168 Q444 170 462 184" fill="none" stroke="#0D9488" strokeWidth="2" strokeDasharray="3 3" />
                      <rect x="415" y="164" width="12" height="7" rx="2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.2" />
                    </g>
                  )}
                </g>
              </g>
            </g>

            {/* Bed Safety Rail */}
            <path
              d="M360 302 L560 302 Q570 302 570 312 L570 338 L350 338 L350 312 Q350 302 360 302 Z"
              fill="#F8FAFC"
              fillOpacity="0.55"
              stroke="#475569"
              strokeWidth="2.4"
            />
            <line x1="395" y1="302" x2="395" y2="338" stroke="#64748B" strokeWidth="2" />
            <line x1="460" y1="302" x2="460" y2="338" stroke="#64748B" strokeWidth="2" />
            <line x1="525" y1="302" x2="525" y2="338" stroke="#64748B" strokeWidth="2" />

            {/* Footboard */}
            <path
              d="M652 246 L672 246 Q682 246 682 256 L682 350 L652 350 Z"
              fill="url(#bedMetal)"
              stroke="#1E293B"
              strokeWidth="2.4"
            />
            <rect x="658" y="260" width="16" height="40" rx="4" fill="url(#railBlue)" />
          </g>
        </svg>
      </div>

      {/* === DESKTOP (md:+): SINGLE NON-OVERLAPPING LEFT DOCK FOR SYRINGE PUMP & SEDANG BERJALAN === */}
      {!nurseDialogue && (
        <div className="pointer-events-none absolute bottom-3 left-3 top-14 z-20 hidden md:flex w-64 lg:w-72 flex-col justify-between gap-2.5 overflow-hidden">
          {/* Syringe Pump Panel */}
          {activePump && pumpPanelOpen ? (
            <div className="shrink-0">
              {renderPumpCard(() => setPumpPanelOpen(false), false)}
            </div>
          ) : (
            <div />
          )}

          {/* Sedang Berjalan Panel */}
          {(runningCount > 0 || completedOrders.length > 0) && (
            <div className="pointer-events-auto flex min-h-0 flex-col rounded-xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-xl">
              <button
                type="button"
                onClick={() => setShowRunningPanel((v) => !v)}
                className="flex w-full shrink-0 items-center justify-between px-3.5 py-2.5 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="truncate text-xs font-bold text-white">
                    Sedang Berjalan ({runningCount})
                  </span>
                </div>
                {showRunningPanel ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>

              {showRunningPanel && (
                <div className="min-h-0 max-h-44 overflow-y-auto border-t border-slate-800 dark-scroll">
                  {renderRunningListBody()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === MOBILE (< md): EXPANDABLE SINGLE OVERLAY SHEET SO SCENE REMAINS CLEAN === */}
      {!nurseDialogue && mobileOverlay !== 'none' && (
        <div className="md:hidden absolute inset-x-3 bottom-16 z-30 max-w-sm">
          {mobileOverlay === 'pump' && activePump && renderPumpCard(() => setMobileOverlay('none'), true)}
          {mobileOverlay === 'running' && (runningCount > 0 || completedOrders.length > 0) && (
            <div className="flex max-h-56 flex-col rounded-xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Sedang Berjalan ({runningCount})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOverlay('none')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Tutup daftar berjalan"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto dark-scroll">
                {renderRunningListBody()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === BOTTOM ACTION BAR (Mobile left toggles + Quick Actions bottom-right) === */}
      {!nurseDialogue && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-wrap items-center justify-between gap-2">
          {/* Mobile left toggles for Pump / Sedang Berjalan */}
          <div className="pointer-events-auto flex md:hidden items-center gap-1.5">
            {activePump && (
              <button
                type="button"
                onClick={() => setMobileOverlay((m) => (m === 'pump' ? 'none' : 'pump'))}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-md whitespace-nowrap ${
                  mobileOverlay === 'pump'
                    ? 'border-teal-400 bg-teal-600 text-white'
                    : 'border-teal-500/60 bg-slate-900/95 text-teal-300'
                }`}
              >
                <Syringe className="h-3.5 w-3.5" />
                <span>Pump {activePump.rate}</span>
              </button>
            )}
            {(runningCount > 0 || completedOrders.length > 0) && (
              <button
                type="button"
                onClick={() => setMobileOverlay((m) => (m === 'running' ? 'none' : 'running'))}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-md whitespace-nowrap ${
                  mobileOverlay === 'running'
                    ? 'border-amber-400 bg-amber-500 text-slate-950'
                    : 'border-slate-700 bg-slate-900/95 text-slate-100'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Berjalan ({runningCount})</span>
              </button>
            )}
          </div>

          {/* Right Quick Actions (Pasang Monitor / Rekam Medis) */}
          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            {!monitorAttached && (
              <button
                type="button"
                onClick={onAttachMonitor}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-500 px-3 sm:px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Pasang Monitor</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenMedicalRecord}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white/95 px-3 sm:px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-white whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5 text-teal-700" />
              <span>Rekam Medis</span>
            </button>
          </div>
        </div>
      )}

      {/* === TRIAGE NURSE KAK ADI DIALOGUE OVERLAY === */}
      {nurseDialogue && (
        <div className="absolute inset-x-3 bottom-3 z-30 mx-auto flex max-h-[82%] max-w-xl items-end gap-3">
          <div className="hidden sm:block shrink-0 overflow-hidden rounded-xl border-2 border-white bg-slate-800 shadow-xl">
            <img
              src={ASSET_PATHS.nursePortrait}
              alt="Kak Adi — Perawat Triase"
              referrerPolicy="no-referrer"
              className="h-28 w-24 object-cover object-top"
            />
          </div>
          <div className="flex max-h-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={ASSET_PATHS.nursePortrait}
                  alt="Kak Adi"
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-full object-cover object-top sm:hidden"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">Kak Adi</div>
                  <div className="truncate text-[11px] font-medium text-slate-500">
                    {nurseDialogue.title}
                  </div>
                </div>
              </div>
              {nurseDialogue.isUrgent && (
                <span className="shrink-0 text-xs font-bold text-rose-600">Laporan Penting</span>
              )}
            </div>
            <p className="mt-2.5 overflow-y-auto text-[13px] sm:text-[13.5px] leading-relaxed text-slate-700 clinical-scroll">
              {nurseDialogue.message}
            </p>
            <button
              type="button"
              onClick={onDismissDialogue}
              className="mt-3 min-h-[44px] w-full shrink-0 rounded-lg bg-teal-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-500 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {nurseDialogue.buttonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
