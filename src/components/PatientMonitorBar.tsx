import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Gauge,
  SlidersHorizontal,
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
  waveformPaused: boolean;
  onTogglePause: () => void;
  speed: 1 | 2 | 4;
  onChangeSpeed: (s: 1 | 2 | 4) => void;
  muted: boolean;
  audioAvailable: boolean;
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
  waveformPaused,
  onTogglePause,
  speed,
  onChangeSpeed,
  muted,
  audioAvailable,
  onToggleMute,
  onQrsBeat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const vitalsRef = useRef(vitals);
  const pausedRef = useRef(waveformPaused);
  const attachedRef = useRef(monitorAttached);
  const patternRef = useRef(ecgPattern);
  const onQrsBeatRef = useRef(onQrsBeat);

  vitalsRef.current = vitals;
  pausedRef.current = waveformPaused;
  attachedRef.current = monitorAttached;
  patternRef.current = ecgPattern;
  onQrsBeatRef.current = onQrsBeat;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let phase = 0;
    let cursorX = 0;
    let drawnState = '';
    const visibleWaveform = window.matchMedia('(min-width: 68rem)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      animId = requestAnimationFrame(render);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const attached = attachedRef.current;
      const running = attached && !pausedRef.current;
      const visible = visibleWaveform.matches;
      const moving = running && visible && !reducedMotion.matches;

      if (running) {
        const hr = Math.max(30, Math.min(200, vitalsRef.current.hr));
        const previousPhase = phase;
        phase = (phase + dt * hr / 60) % 1;
        if (previousPhase < 0.25 && phase >= 0.25) onQrsBeatRef.current();

        if (moving) {
          const stepCount = Math.max(1, Math.round(dt * 95));
          for (let step = 0; step < stepCount; step++) {
            const subPhase = (previousPhase + ((phase - previousPhase + 1) % 1) * (step / stepCount)) % 1;
            cursorX = (cursorX + 1) % width;
            ecgBuffer[cursorX] = sampleEcgWave(subPhase, patternRef.current);
            plethBuffer[cursorX] = samplePlethWave(subPhase);
          }
        }
      }

      const frameState = `${visible}-${attached}-${reducedMotion.matches}-${patternRef.current}`;
      const repaint = moving || frameState !== drawnState;
      drawnState = frameState;
      if (!visible || !repaint) return;

      if (attached && reducedMotion.matches) {
        for (let x = 0; x < width; x++) {
          const restingPhase = (x / 95) % 1;
          ecgBuffer[x] = sampleEcgWave(restingPhase, patternRef.current);
          plethBuffer[x] = samplePlethWave(restingPhase);
        }
        cursorX = width - 1;
      }

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

      if (!attached) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.5);
        ctx.lineTo(width, height * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
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
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const alarms: string[] = [];
  if (monitorAttached) {
    if (vitals.spo2 < 90) alarms.push('SpO₂ rendah');
    if (vitals.hr > 120) alarms.push('Nadi tinggi');
    if (vitals.hr < 55) alarms.push('Bradikardi');
    if (vitals.sbp >= 180) alarms.push('Krisis hipertensi');
    if (vitals.sbp < 90) alarms.push('Hipotensi / syok');
    if (vitals.rr > 28) alarms.push('Takipnea');
  }

  const displayedBp = lastNibp ?? {
    sbp: Math.round(vitals.sbp),
    dbp: Math.round(vitals.dbp),
    map: Math.round((vitals.sbp + 2 * vitals.dbp) / 3),
  };

  const metrics = [
    { label: 'Nadi', unit: 'bpm', value: Math.round(vitals.hr), tone: 'pulse', alert: vitals.hr > 120 || vitals.hr < 55 },
    { label: 'TD', unit: 'mmHg', value: `${displayedBp.sbp}/${displayedBp.dbp}`, tone: 'pressure', alert: displayedBp.sbp >= 180 || displayedBp.sbp < 90 },
    { label: 'SpO₂', unit: '%', value: Math.round(vitals.spo2), tone: 'oxygen', alert: vitals.spo2 < 90 },
    { label: 'RR', unit: '/mnt', value: Math.round(vitals.rr), tone: 'breath', alert: vitals.rr > 28 },
    { label: 'Suhu', unit: '°C', value: vitals.temp.toFixed(1), tone: 'temperature', alert: false },
  ];
  let monitorStatus = 'Belum terpasang';
  if (monitorAttached) {
    monitorStatus = alarms.length ? alarms.join(' · ') : 'Tidak ada alarm';
  }

  return (
    <section
      className="monitor-bar"
      aria-labelledby="monitor-heading"
      data-connected={monitorAttached}
      data-alarm={alarms.length > 0}
    >
      <div className="monitor-content">
        <div className="monitor-heading">
          <div className="monitor-title">
            <Activity size={17} aria-hidden="true" />
            <h2 id="monitor-heading">Monitor pasien</h2>
          </div>
          <p className="monitor-status" role="status">
            {alarms.length > 0 && <AlertTriangle size={14} aria-label="Alarm" />}
            <span>{monitorStatus}</span>
          </p>
        </div>

        <div className="monitor-quick">
          {!monitorAttached && (
            <button type="button" className="monitor-attach" onClick={onAttachMonitor}>
              Pasang monitor
            </button>
          )}
          <button
            type="button"
            className="monitor-toggle"
            aria-expanded={toolsExpanded}
            aria-controls="monitor-tools"
            onClick={() => setToolsExpanded((expanded) => !expanded)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span className="monitor-toggle-label">Kontrol</span>
          </button>
        </div>

        <dl className="monitor-vitals">
          {metrics.map((metric) => (
            <div key={metric.label} data-tone={metric.tone} data-alert={monitorAttached && metric.alert}>
              <dt>{metric.label} <span>{metric.unit}</span></dt>
              <dd>{monitorAttached ? metric.value : '·'}</dd>
              {metric.tone === 'pressure' && monitorAttached && (
                <dd className="monitor-map">MAP {displayedBp.map}</dd>
              )}
            </div>
          ))}
        </dl>

        <div className="monitor-wave">
          <canvas ref={canvasRef} width={340} height={56} aria-label="Gelombang EKG dan plethysmograph" role="img" />
          <span aria-hidden="true">II · 25 mm/s</span>
        </div>

        <div className="monitor-tools" id="monitor-tools" data-expanded={toolsExpanded}>
          <button type="button" onClick={onTogglePause} data-active={paused}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            {paused ? 'Lanjut' : 'Jeda'}
          </button>
          <div className="monitor-speeds" role="group" aria-label="Kecepatan simulasi">
            <span>Kecepatan</span>
            {([1, 2, 4] as const).map((value) => (
              <button key={value} type="button" onClick={() => onChangeSpeed(value)} aria-pressed={speed === value}>
                {value}×
              </button>
            ))}
          </div>
          <button type="button" onClick={onToggleMute} disabled={!audioAvailable}>
            {!audioAvailable || muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            Suara {audioAvailable ? (muted ? 'nonaktif' : 'aktif') : 'tidak tersedia'}
          </button>
          {monitorAttached && (
            <button type="button" onClick={onMeasureNibp}>
              <Gauge size={16} aria-hidden="true" />
              Ukur TD
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
