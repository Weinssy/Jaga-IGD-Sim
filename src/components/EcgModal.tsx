import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { EcgPattern } from '../types/clinical';

interface EcgModalProps {
  patientName: string;
  hr: number;
  pattern: EcgPattern;
  interpretation: string;
  onChangeInterpretation: (val: string) => void;
  onClose: () => void;
}

/** Lead-specific morphological ECG wave synthesis for authentic 12-lead ECG strips */
function sampleLeadVoltage(u: number, leadName: string, pattern: EcgPattern): number {
  let y = 0;
  // Determine polarity & morphological adjustments per lead
  const isInvertedLead = leadName === 'aVR';
  const isAnterior = ['V1', 'V2', 'V3', 'V4'].includes(leadName);
  const isLateral = ['I', 'aVL', 'V5', 'V6'].includes(leadName);
  const isInferior = ['II', 'III', 'aVF'].includes(leadName);
  const isRightPrecordial = ['V1', 'V2'].includes(leadName);

  // P wave
  if (u >= 0.08 && u < 0.18) {
    const t = (u - 0.08) / 0.10;
    const pAmp = isInvertedLead ? -0.15 : leadName === 'V1' ? 0.08 : 0.15;
    y += pAmp * Math.sin(t * Math.PI);
  }

  // QRS complex
  if (u >= 0.21 && u < 0.31) {
    const t = (u - 0.21) / 0.10;
    if (isInvertedLead) {
      // Deep negative deflection in aVR
      y -= 0.85 * Math.sin(t * Math.PI);
    } else if (isRightPrecordial) {
      // Small r, deep S in V1-V2 (deeper S in LVH!)
      if (t < 0.32) {
        y += 0.25 * Math.sin((t / 0.32) * Math.PI);
      } else {
        const sDepth = pattern === 'lvh_sinus_tachy' ? 1.55 : 0.95;
        y -= sDepth * Math.sin(((t - 0.32) / 0.68) * Math.PI);
      }
    } else {
      // Normal / tall R in limb & lateral leads
      const rHeight =
        pattern === 'lvh_sinus_tachy' && isLateral
          ? 1.75
          : leadName === 'III'
            ? 0.55
            : 1.05;
      if (t < 0.2) {
        y -= 0.12 * Math.sin((t / 0.2) * Math.PI);
      } else if (t < 0.7) {
        y += rHeight * Math.sin(((t - 0.2) / 0.5) * Math.PI);
      } else {
        y -= 0.22 * Math.sin(((t - 0.7) / 0.3) * Math.PI);
      }
    }
  }

  // ST segment + T wave pathology
  if (u >= 0.31 && u < 0.66) {
    const stProgress = (u - 0.31) / 0.35;
    if (pattern === 'anterior_stemi' && isAnterior) {
      // Classic convex tombstoning ST elevation in V1-V4!
      const elev = leadName === 'V2' || leadName === 'V3' ? 0.58 : 0.42;
      y += elev * Math.sin(Math.min(1, stProgress * 1.15) * Math.PI);
    } else if (pattern === 'anterior_stemi' && isInferior) {
      // Reciprocal ST depression in II, III, aVF
      y -= 0.18 * Math.sin(stProgress * Math.PI);
    } else if (pattern === 'lvh_sinus_tachy' && isLateral) {
      // LVH strain pattern: downsloping ST depression + asymmetric T inversion
      y -= 0.28 * Math.sin(stProgress * Math.PI);
    } else {
      // Normal T wave
      if (u >= 0.44 && u < 0.64) {
        const tw = (u - 0.44) / 0.20;
        const tAmp = isInvertedLead ? -0.22 : 0.24;
        y += tAmp * Math.sin(tw * Math.PI);
      }
    }
  }

  return y;
}

const QUICK_PHRASES = [
  'Sinus takikardia',
  'Irama sinus',
  'Normoaksis',
  'LVH + strain V5-V6',
  'ST elevasi V1-V4 (STEMI Anterior)',
  'ST elevasi (-)',
];

export const EcgModal: React.FC<EcgModalProps> = ({
  patientName,
  hr,
  pattern,
  interpretation,
  onChangeInterpretation,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseW = 1040;
    const baseH = 560;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = baseW * dpr;
    canvas.height = baseH * dpr;
    ctx.scale(dpr, dpr);

    // Classic pale pink medical ECG thermal paper
    ctx.fillStyle = '#FFF5F7';
    ctx.fillRect(0, 0, baseW, baseH);

    // Small 1mm grid (every 5px)
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.20)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 0; x <= baseW; x += 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, baseH);
    }
    for (let y = 0; y <= baseH; y += 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(baseW, y);
    }
    ctx.stroke();

    // Large 5mm grid (every 25px)
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.34)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= baseW; x += 25) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, baseH);
    }
    for (let y = 0; y <= baseH; y += 25) {
      ctx.moveTo(0, y);
      ctx.lineTo(baseW, y);
    }
    ctx.stroke();

    // Header metadata printed on paper
    ctx.fillStyle = '#334155';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(`25 mm/s   10 mm/mV   12-LEAD ECG   PASIEN: ${patientName.toUpperCase()}   HR: ~${Math.round(hr)} BPM`, 20, 22);

    const rows = [
      ['I', 'aVR', 'V1', 'V4'],
      ['II', 'aVL', 'V2', 'V5'],
      ['III', 'aVF', 'V3', 'V6'],
    ];

    // Pixels per cardiac cycle at 25mm/s (25px = 0.20s -> 125px = 1.0s)
    const cyclePx = (60 / Math.max(45, hr)) * 125;

    const drawRowCalibration = (yBase: number) => {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(18, yBase);
      ctx.lineTo(24, yBase);
      ctx.lineTo(24, yBase - 38);
      ctx.lineTo(36, yBase - 38);
      ctx.lineTo(36, yBase);
      ctx.lineTo(42, yBase);
      ctx.stroke();
    };

    // Draw 3x4 standard 12-lead matrix
    const colW = 240;
    const startX = 46;
    rows.forEach((rowLeads, rIdx) => {
      const yBase = 104 + rIdx * 124;
      drawRowCalibration(yBase);

      rowLeads.forEach((leadName, cIdx) => {
        const x0 = startX + cIdx * colW;
        // Lead label
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 13px "IBM Plex Mono", monospace';
        ctx.fillText(leadName, x0 + 6, yBase - 42);

        // Separator notch
        if (cIdx > 0) {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0, yBase - 12);
          ctx.lineTo(x0, yBase + 12);
          ctx.stroke();
        }

        // Waveform trace
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.45;
        ctx.beginPath();
        for (let dx = 0; dx < colW - 4; dx += 1) {
          const u = ((x0 + dx) % cyclePx) / cyclePx;
          const v = sampleLeadVoltage(u, leadName, pattern);
          const py = yBase - v * 36;
          if (dx === 0) ctx.moveTo(x0 + dx, py);
          else ctx.lineTo(x0 + dx, py);
        }
        ctx.stroke();
      });
    });

    // Bottom full-width Lead II Rhythm Strip
    const rhythmY = 486;
    drawRowCalibration(rhythmY);
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 13px "IBM Plex Mono", monospace';
    ctx.fillText('II (Rhythm Strip)', startX + 6, rhythmY - 40);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let dx = 0; dx < 960; dx += 1) {
      const u = ((startX + dx) % cyclePx) / cyclePx;
      const v = sampleLeadVoltage(u, 'II', pattern);
      const py = rhythmY - v * 36;
      if (dx === 0) ctx.moveTo(startX + dx, py);
      else ctx.lineTo(startX + dx, py);
    }
    ctx.stroke();
  }, [hr, patientName, pattern]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setDragging(true);
    dragStartRef.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    setPan({
      x: dragStartRef.current.panX + (t.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (t.clientY - dragStartRef.current.y),
    });
  };

  const appendPhrase = (phrase: string) => {
    const trimmed = interpretation.trim();
    if (trimmed.toLowerCase().includes(phrase.toLowerCase())) return;
    onChangeInterpretation(trimmed ? `${trimmed}, ${phrase}` : phrase);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="EKG 12-Lead"
    >
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base sm:text-lg font-extrabold text-slate-900">
              EKG 12-Lead — {patientName}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Geser slider untuk zoom · seret kertas EKG untuk menggeser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup EKG"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Zoomable & Pannable ECG Canvas Viewport (mouse + touch) */}
        <div
          className={`relative h-[220px] sm:h-[320px] lg:h-[380px] w-full shrink-0 overflow-hidden border-b border-slate-200 bg-rose-50/40 touch-none ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              className="h-[300px] w-[560px] sm:h-[460px] sm:w-[855px] rounded border border-rose-200 shadow-sm"
            />
          </div>
        </div>

        {/* Zoom Controls + Clinical Interpretation Input */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 sm:px-6 py-3.5 sm:py-4 clinical-scroll">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.85, +(z - 0.2).toFixed(2)))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              aria-label="Perkecil"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={0.85}
              max={2.4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="min-w-[110px] flex-1 accent-teal-600"
              aria-label="Tingkat Zoom EKG"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              aria-label="Perbesar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="w-10 text-right font-mono text-xs font-semibold text-slate-600 tabular-nums">
              {zoom.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => {
                setZoom(1.15);
                setPan({ x: 0, y: 0 });
              }}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
            >
              Reset Posisi
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="ecg-interpretation" className="block text-xs font-semibold text-slate-700">
              Tulis interpretasi EKG Anda (irama, laju, aksis, segmen ST/T, dan kesan):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => appendPhrase(phrase)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 sm:py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-teal-500 hover:text-teal-700"
                >
                  + {phrase}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="ecg-interpretation"
                type="text"
                value={interpretation}
                onChange={(e) => onChangeInterpretation(e.target.value)}
                placeholder="Contoh: Sinus takikardia, HR 124x/mnt, LVH dengan strain, ST elevasi (-)"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-500 whitespace-nowrap"
              >
                <Check className="h-4 w-4" />
                <span>Simpan &amp; Tutup</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
