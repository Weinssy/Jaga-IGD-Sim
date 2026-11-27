import React, { useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Gauge,
} from 'lucide-react';
import { EcgPattern, VitalSigns } from '../types/clinical';

interface PatientMonitorBarProps {
  monitorAttached: boolean;
  onAttachMonitor: () => void;
  vitals: VitalSigns;
  ecgPattern: EcgPattern;
  lastNibp: { sbp: number; dbp: number; map: number; timeSec: number } | null;
  onMeasureNibp: () => void;
  paused: boolean;
  onTogglePause: () => void;
  speed: 1 | 2 | 4;
  onChangeSpeed: (s: 1 | 2 | 4) => void;
  muted: boolean;
  onToggleMute: () => void;
  onQrsBeat: () => void;
}

/** Synthesizes a realistic single ECG cycle y-value for phase u in [0, 1) */
function sampleEcgWave(u: number, pattern: EcgPattern): number {
  let y = 0;
  if (u >= 0.08 && u < 0.18) {
    const t = (u - 0.08) / 0.10;
    y += 0.14 * Math.sin(t * Math.PI);
  }
  if (u >= 0.21 && u < 0.235) {
    const t = (u - 0.21) / 0.025;
    y -= 0.14 * Math.sin(t * Math.PI);
  }
  if (u >= 0.235 && u < 0.28) {
    const t = (u - 0.235) / 0.045;
    const amp = pattern === 'lvh_sinus_tachy' ? 1.18 : 0.98;
    y += amp * Math.sin(t * Math.PI);
  }
  if (u >= 0.28 && u < 0.315) {
    const t = (u - 0.28) / 0.035;
    y -= 0.26 * Math.sin(t * Math.PI);
  }
  if (u >= 0.315 && u < 0.48) {
    const t = (u - 0.315) / 0.165;
    if (pattern === 'anterior_stemi') {
      y += 0.32 * Math.sin(t * Math.PI * 0.85 + 0.2);
    } else if (pattern === 'lvh_sinus_tachy') {
      y -= 0.09 * Math.sin(t * Math.PI);
    }
  }
  if (u >= 0.44 && u < 0.64) {
    const t = (u - 0.44) / 0.20;
    const tAmp = pattern === 'anterior_stemi' ? 0.38 : 0.24;
    y += tAmp * Math.sin(t * Math.PI);
  }
  return y;
}

/** Synthesizes a realistic Plethysmograph (SpO2) pulse waveform */
function samplePlethWave(u: number): number {
  const p = (u + 0.78) % 1;
  if (p < 0.22) {
    return Math.sin((p / 0.22) * (Math.PI / 2)) * 0.85;
  }
  if (p < 0.42) {
    const t = (p - 0.22) / 0.20;
    return 0.85 - t * 0.42;
  }
  if (p < 0.54) {
    const t = (p - 0.42) / 0.12;
    return 0.43 + Math.sin(t * Math.PI) * 0.14;
  }
  const t = (p - 0.54) / 0.46;
  return 0.43 * (1 - t);
}

export const PatientMonitorBar: React.FC<PatientMonitorBarProps> = ({
  monitorAttached,
  onAttachMonitor,
  vitals,
  ecgPattern,
  lastNibp,
  onMeasureNibp,
  paused,
  onTogglePause,
  speed,
  onChangeSpeed,
  muted,
  onToggleMute,
  onQrsBeat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vitalsRef = useRef(vitals);
  const pausedRef = useRef(paused);
  const attachedRef = useRef(monitorAttached);
  const patternRef = useRef(ecgPattern);
  const onQrsBeatRef = useRef(onQrsBeat);

  vitalsRef.current = vitals;
  pausedRef.current = paused;
  attachedRef.current = monitorAttached;
  patternRef.current = ecgPattern;
  onQrsBeatRef.current = onQrsBeat;

  // Isolated 60fps canvas animation loop for live ECG & Pleth waveforms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let phase = 0;
    let prevPhase = 0;
    let cursorX = 0;

    const ecgBuffer: number[] = [];
    const plethBuffer: number[] = [];
    const width = 340;
    const height = 56;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    for (let i = 0; i < width; i++) {
      ecgBuffer.push(0);
      plethBuffer.push(0);
    }

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!attachedRef.current) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.5);
        ctx.lineTo(width, height * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        animId = requestAnimationFrame(render);
        return;
      }

      if (!pausedRef.current) {
        const hr = Math.max(30, Math.min(200, vitalsRef.current.hr));
        const bps = hr / 60;
        prevPhase = phase;
        phase = (phase + dt * bps) % 1;

        if (prevPhase < 0.25 && phase >= 0.25) {
          onQrsBeatRef.current();
        }

        const pxStep = Math.max(1, Math.round(dt * 95));
        for (let s = 0; s < pxStep; s++) {
          const subPhase = (prevPhase + ((phase - prevPhase + 1) % 1) * (s / pxStep)) % 1;
          cursorX = (cursorX + 1) % width;
          ecgBuffer[cursorX] = sampleEcgWave(subPhase, patternRef.current);
          plethBuffer[cursorX] = samplePlethWave(subPhase);
        }
      }

      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < width; x++) {
        const distAhead = (x - cursorX + width) % width;
        if (distAhead > 0 && distAhead < 14) {
          started = false;
          continue;
        }
        const y = 22 - ecgBuffer[x] * 14;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      started = false;
      for (let x = 0; x < width; x++) {
        const distAhead = (x - cursorX + width) % width;
        if (distAhead > 0 && distAhead < 14) {
          started = false;
          continue;
        }
        const y = 50 - plethBuffer[x] * 13;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      const headY = 22 - ecgBuffer[cursorX] * 14;
      ctx.fillStyle = '#A7F3D0';
      ctx.beginPath();
      ctx.arc(cursorX, headY, 2.2, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const alarms: string[] = [];
  if (monitorAttached) {
    if (vitals.spo2 < 90) alarms.push('SpO2 Rendah');
    if (vitals.hr > 120) alarms.push('HR Tinggi');
    if (vitals.hr < 55) alarms.push('Bradikardi');
    if (vitals.sbp >= 180) alarms.push('Krisis Hipertensi');
    if (vitals.sbp < 90) alarms.push('Hipotensi / Syok');
    if (vitals.rr > 28) alarms.push('Takipnea');
  }

  const displayedBp = lastNibp ?? {
    sbp: Math.round(vitals.sbp),
    dbp: Math.round(vitals.dbp),
    map: Math.round((vitals.sbp + 2 * vitals.dbp) / 3),
  };

  const hrAlarm = monitorAttached && (vitals.hr > 120 || vitals.hr < 55);
  const hrSevere = monitorAttached && (vitals.hr > 135 || vitals.hr < 45);
  const bpAlarm = monitorAttached && (displayedBp.sbp >= 180 || displayedBp.sbp < 90);
  const bpSevere = monitorAttached && (displayedBp.sbp >= 195 || displayedBp.sbp < 85);
  const spo2Alarm = monitorAttached && vitals.spo2 < 90;
  const spo2Severe = monitorAttached && vitals.spo2 < 86;
  const rrAlarm = monitorAttached && vitals.rr > 28;
  const hasCriticalAlarm = alarms.length > 0;
  const hasSevereAlarm = spo2Severe || bpSevere || hrSevere || (monitorAttached && vitals.rr >= 32);

  return (
    <div
      className={`relative shrink-0 border-t bg-slate-950 text-slate-100 transition-colors ${
        hasCriticalAlarm ? 'border-rose-500/80' : 'border-slate-800'
      }`}
    >
      {/* Top Pulsing Critical Alarm Strip (high visibility on mobile & desktop) */}
      {hasCriticalAlarm && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-alarm-glow"
        />
      )}

      {/* Main Telemetry Row */}
      <div
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 px-3 sm:px-4 py-2 ${
          hasCriticalAlarm ? 'bg-rose-950/20' : ''
        }`}
      >
        {/* Mobile compact top row OR Desktop left monitor actions */}
        <div className="flex items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Activity
              className={`h-4 w-4 shrink-0 ${
                hasCriticalAlarm
                  ? 'text-rose-400 animate-alarm-pulse'
                  : monitorAttached
                    ? 'text-emerald-400'
                    : 'text-slate-500'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-200 whitespace-nowrap">
                <span>Monitor Pasien</span>
                {hasCriticalAlarm && (
                  <span className="inline-flex md:hidden items-center gap-1 rounded bg-rose-600/90 px-1.5 py-0.5 text-[9.5px] font-extrabold text-white animate-alarm-pulse">
                    KRITIS
                  </span>
                )}
              </div>
              {!monitorAttached && (
                <div className="hidden md:block text-[11px] text-slate-400 truncate">
                  Belum terpasang — angka vital belum terbaca
                </div>
              )}
            </div>
          </div>

          {monitorAttached ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMute}
                className="inline-flex min-h-[32px] md:min-h-[26px] items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white whitespace-nowrap"
                title="Suara Monitor"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5 text-slate-500" /> : <Volume2 className="h-3.5 w-3.5 text-teal-400" />}
                <span>{muted ? 'Bisu' : 'Suara'}</span>
              </button>
              <button
                type="button"
                onClick={onMeasureNibp}
                className="inline-flex min-h-[32px] md:min-h-[26px] items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-200 hover:border-teal-500/60 hover:bg-slate-800 whitespace-nowrap"
              >
                <Gauge className="h-3.5 w-3.5 text-amber-400" />
                <span>Tensi</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAttachMonitor}
              className="min-h-[34px] rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-400 whitespace-nowrap"
            >
              Pasang Monitor
            </button>
          )}
        </div>

        {/* Center Numeric Vitals Telemetry (Mobile 6-col grid prevents any left clipping; Desktop inline strip) */}
        <div
          className={`grid grid-cols-6 items-center gap-x-1.5 md:flex md:flex-1 md:items-center md:justify-center md:gap-4 lg:gap-5 ${
            hasSevereAlarm ? 'animate-alarm-shake' : ''
          }`}
        >
          {/* HR (1 col) */}
          <div
            className={`col-span-1 min-w-0 md:min-w-[66px] rounded-md px-1 py-0.5 transition-colors ${
              hrAlarm ? 'bg-amber-500/15 ring-1 ring-amber-400/50 animate-alarm-pulse' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400">
              <span>HR</span>
              <span className="hidden sm:inline">bpm</span>
            </div>
            <div
              className={`font-mono text-base sm:text-xl md:text-2xl font-bold leading-tight tabular-nums ${
                !monitorAttached
                  ? 'text-slate-600'
                  : hrAlarm
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {monitorAttached ? Math.round(vitals.hr) : '--'}
            </div>
          </div>

          <div className="hidden md:block h-9 w-px bg-slate-800" />

          {/* TD / NIBP (2 cols on mobile) */}
          <div
            className={`col-span-2 min-w-0 md:min-w-[112px] rounded-md px-1.5 py-0.5 transition-colors ${
              bpAlarm ? 'bg-rose-500/18 ring-1 ring-rose-500/60 animate-alarm-pulse' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400">
              <span>TD</span>
              <span className="hidden sm:inline">mmHg</span>
            </div>
            <div
              className={`font-mono text-base sm:text-xl md:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap ${
                !monitorAttached
                  ? 'text-slate-600'
                  : bpAlarm
                    ? 'text-rose-400'
                    : 'text-slate-100'
              }`}
            >
              {monitorAttached ? `${displayedBp.sbp}/${displayedBp.dbp}` : '---/--'}
            </div>
            <div className="hidden md:block font-mono text-[10px] text-slate-400 tabular-nums">
              {monitorAttached ? `MAP ${displayedBp.map}` : 'MAP --'}
            </div>
          </div>

          <div className="hidden md:block h-9 w-px bg-slate-800" />

          {/* SpO2 (1 col) */}
          <div
            className={`col-span-1 min-w-0 md:min-w-[62px] rounded-md px-1 py-0.5 transition-colors ${
              spo2Alarm ? 'bg-rose-500/20 ring-1 ring-rose-500/70 animate-alarm-pulse' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400">
              <span>SpO₂</span>
              <span className="hidden sm:inline">%</span>
            </div>
            <div
              className={`font-mono text-base sm:text-xl md:text-2xl font-bold leading-tight tabular-nums ${
                !monitorAttached
                  ? 'text-slate-600'
                  : vitals.spo2 < 90
                    ? 'text-rose-400'
                    : vitals.spo2 < 94
                      ? 'text-amber-400'
                      : 'text-sky-400'
              }`}
            >
              {monitorAttached ? Math.round(vitals.spo2) : '--'}
            </div>
          </div>

          <div className="hidden md:block h-9 w-px bg-slate-800" />

          {/* RR (1 col) */}
          <div
            className={`col-span-1 min-w-0 md:min-w-[58px] rounded-md px-1 py-0.5 transition-colors ${
              rrAlarm ? 'bg-amber-500/15 ring-1 ring-amber-400/50 animate-alarm-pulse' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400">
              <span>RR</span>
              <span className="hidden sm:inline">/m</span>
            </div>
            <div
              className={`font-mono text-base sm:text-xl md:text-2xl font-bold leading-tight tabular-nums ${
                !monitorAttached
                  ? 'text-slate-600'
                  : vitals.rr > 26
                    ? 'text-amber-300'
                    : 'text-teal-300'
              }`}
            >
              {monitorAttached ? Math.round(vitals.rr) : '--'}
            </div>
          </div>

          <div className="hidden md:block h-9 w-px bg-slate-800" />

          {/* SUHU (1 col) */}
          <div className="col-span-1 min-w-0 md:min-w-[58px] px-1 py-0.5">
            <div className="flex items-baseline justify-between gap-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400">
              <span>SUHU</span>
              <span className="hidden sm:inline">°C</span>
            </div>
            <div className={`font-mono text-sm sm:text-lg md:text-xl font-bold leading-tight tabular-nums ${monitorAttached ? 'text-slate-200' : 'text-slate-600'}`}>
              {monitorAttached ? vitals.temp.toFixed(1) : '--.-'}
            </div>
          </div>
        </div>

        {/* Live Scrolling ECG + Pleth Canvas (desktop xl+) */}
        <div className="hidden xl:flex flex-col items-end shrink-0">
          <div
            className={`relative overflow-hidden rounded-lg border bg-slate-900/90 ${
              hasCriticalAlarm ? 'border-rose-500/60' : 'border-slate-800'
            }`}
          >
            <canvas
              ref={canvasRef}
              className="block h-[56px] w-[340px]"
              aria-label="Gelombang EKG dan Plethysmograph Real-Time"
            />
            {monitorAttached && (
              <div className="pointer-events-none absolute left-2 top-1 flex items-center gap-2 font-mono text-[9px] text-emerald-400/90">
                <span>II · 25mm/s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Simulation Controls & Active Clinical Alarms */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-t px-3 sm:px-4 py-1.5 text-xs ${
          hasCriticalAlarm
            ? 'border-rose-500/40 bg-rose-950/35'
            : 'border-slate-800/80 bg-slate-900/80'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onTogglePause}
            className={`inline-flex min-h-[32px] sm:min-h-[28px] shrink-0 items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 font-semibold transition-colors whitespace-nowrap ${
              paused
                ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {paused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{paused ? 'Lanjut' : 'Jeda'}</span>
          </button>

          {alarms.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex min-w-0 items-center gap-1.5 rounded-md bg-rose-500/15 px-2 py-0.5 ring-1 ring-rose-500/40 animate-alarm-shake"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400 animate-alarm-pulse" />
              <span className="truncate font-bold text-rose-200">
                Alarm: {alarms.slice(0, 2).join(' · ')}
              </span>
            </div>
          )}
          {monitorAttached && alarms.length === 0 && (
            <span className="truncate font-medium text-emerald-400">
              Stabil
            </span>
          )}
        </div>

        {/* Speed Selector */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline text-[11px] font-medium text-slate-400">Kecepatan</span>
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950 p-0.5">
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                className={`min-h-[26px] rounded px-2 sm:px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  speed === s
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
