import React, { useState } from 'react';
import { X, SunMedium, FileCheck } from 'lucide-react';
import { CxrPattern } from '../types/clinical';
import { ClinicalDialog } from './ClinicalDialog';

interface RadiologyModalProps {
  patientName: string;
  pattern: CxrPattern;
  officialReport: string;
  onClose: () => void;
}

export const RadiologyModal: React.FC<RadiologyModalProps> = ({
  patientName,
  pattern,
  officialReport,
  onClose,
}) => {
  const [highContrast, setHighContrast] = useState(false);
  const [showExpertise, setShowExpertise] = useState(false);

  return (
    <ClinicalDialog
      className="modal-dark max-w-3xl border-slate-700 bg-slate-900 text-slate-100"
      labelledBy="radiology-title"
      onDismiss={onClose}
    >
      <div>
        <div className="dialog-heading flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="radiology-title" className="text-sm font-bold text-white sm:text-base">
              Foto toraks AP · {patientName}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Radiografi Dada Digital · Ruang Resusitasi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="flex shrink-0 items-center justify-center rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-800 hover:text-white"
            aria-label="Tutup radiologi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-end px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            aria-pressed={highContrast}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              highContrast
                ? 'border-teal-400 bg-teal-950 text-teal-200'
                : 'border-slate-500 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <SunMedium size={16} aria-hidden="true" />
            Kontras tinggi
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden bg-black p-3 sm:p-6">
          <svg
            viewBox="0 0 460 400"
            role="img"
            aria-label="Ilustrasi radiografi toraks pasien simulasi"
            className="h-auto max-h-[45dvh] sm:h-[360px] w-full max-w-[440px] rounded-lg border border-slate-800"
            style={{ filter: highContrast ? 'contrast(1.35) brightness(1.08)' : 'none' }}
          >
            <defs>
              <radialGradient id="lungField" cx="50%" cy="48%" r="55%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#090D16" />
              </radialGradient>
              <radialGradient id="batWing" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.88" />
                <stop offset="55%" stopColor="#CBD5E1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="spineBone" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#64748B" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#64748B" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <rect width="460" height="400" fill="#030712" />
            {/* Orientation Marker */}
            <text x="24" y="34" fill="#CBD5E1" fontFamily="'IBM Plex Mono', monospace" fontSize="18" fontWeight="700">
              R · AP
            </text>

            {/* Thoracic Soft Tissue Outline */}
            <path
              d="M95 72 Q230 35 365 72 L396 370 L64 370 Z"
              fill="#334155"
              opacity="0.28"
            />

            {/* Left & Right Lung Fields */}
            <path
              d="M214 78 C154 78, 102 128, 92 246 C88 296, 102 328, 134 334 C164 338, 194 316, 212 308 Z"
              fill="url(#lungField)"
            />
            <path
              d="M246 78 C306 78, 358 128, 368 246 C372 296, 358 328, 326 334 C296 338, 266 316, 248 308 Z"
              fill="url(#lungField)"
            />

            {/* Posterior Ribs */}
            {[112, 146, 182, 218, 254, 288].map((ry) => (
              <g key={ry} stroke="#CBD5E1" strokeWidth="5" opacity="0.26" fill="none">
                <path d={`M220 ${ry} Q146 ${ry - 14} 96 ${ry + 18}`} />
                <path d={`M240 ${ry} Q314 ${ry - 14} 364 ${ry + 18}`} />
              </g>
            ))}

            {/* Clavicles */}
            <path d="M214 82 Q156 64 98 86" stroke="#E2E8F0" strokeWidth="7" opacity="0.45" fill="none" strokeLinecap="round" />
            <path d="M246 82 Q304 64 362 86" stroke="#E2E8F0" strokeWidth="7" opacity="0.45" fill="none" strokeLinecap="round" />

            {/* Spine & Tracheal Air Column */}
            <rect x="214" y="40" width="32" height="330" fill="url(#spineBone)" />
            <rect x="225" y="42" width="10" height="118" rx="4" fill="#090D16" opacity="0.7" />

            {/* Pathology: Pulmonary Edema (Bat-Wing bilateral hilar alveolar infiltrate + Kerley B) */}
            {pattern === 'pulmonary_edema' && (
              <g>
                <ellipse cx="176" cy="212" rx="68" ry="82" fill="url(#batWing)" />
                <ellipse cx="288" cy="214" rx="72" ry="84" fill="url(#batWing)" />
                {/* Subtle Kerley B horizontal septal lines in lower periphery */}
                {[276, 290, 304].map((ky) => (
                  <g key={ky} stroke="#E2E8F0" strokeWidth="1.6" opacity="0.55">
                    <line x1="100" y1={ky} x2="122" y2={ky} />
                    <line x1="338" y1={ky} x2="360" y2={ky} />
                  </g>
                ))}
              </g>
            )}

            {/* Cardiac Silhouette (Enlarged CTR > 60% in pulmonary_edema!) */}
            <path
              d={
                pattern === 'pulmonary_edema'
                  ? 'M216 178 C192 204, 186 276, 206 318 L322 318 C346 280, 322 192, 248 176 Z'
                  : pattern === 'mild_cardiomegaly'
                    ? 'M218 184 C202 212, 198 278, 210 316 L298 316 C318 282, 304 202, 248 182 Z'
                    : 'M220 188 C206 214, 204 278, 214 316 L284 316 C300 282, 290 206, 246 186 Z'
              }
              fill="#CBD5E1"
              opacity="0.76"
            />

            {/* Diaphragm domes */}
            <path d="M64 334 Q146 298 220 326 L220 400 L64 400 Z" fill="#94A3B8" opacity="0.52" />
            <path d="M240 328 Q318 308 396 340 L396 400 L240 400 Z" fill="#94A3B8" opacity="0.52" />
          </svg>
        </div>

        {/* Footer / Official Radiologist Expertise */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4">
          {showExpertise ? (
            <div className="rounded-xl border border-teal-800/70 bg-teal-950/50 p-3.5 text-xs leading-relaxed text-teal-100">
              <div className="font-bold text-teal-300">Ekspertise Radiologi (Sp.Rad):</div>
              <p className="mt-1">{officialReport}</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Nilai ukuran jantung (CTR), corakan paru perihiler, dan sudut kostofrenikus sebelum membuka ekspertise.
              </p>
              <button
                type="button"
                onClick={() => setShowExpertise(true)}
                className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 whitespace-nowrap"
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Lihat Ekspertise</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </ClinicalDialog>
  );
};
