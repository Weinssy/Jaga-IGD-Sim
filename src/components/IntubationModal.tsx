import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Wind, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface IntubationModalProps {
  patientName: string;
  initialSpo2: number;
  onSuccess: () => void;
  onCancel: (rebagged: boolean) => void;
}

type LaryngoStep = 1 | 2 | 3 | 4;

export const IntubationModal: React.FC<IntubationModalProps> = ({
  patientName,
  initialSpo2,
  onSuccess,
  onCancel,
}) => {
  const [attempt, setAttempt] = useState(1);
  const [step, setStep] = useState<LaryngoStep>(1);
  const [bladePos, setBladePos] = useState(20);      // Target optimal: 72-92 (vallecula)
  const [tongueSweep, setTongueSweep] = useState(15); // Target optimal: >= 75
  const [elevation, setElevation] = useState(10);     // Target optimal: >= 72
  const [burpActive, setBurpActive] = useState(false);
  const [ettDepth, setEttDepth] = useState(0);        // 0..100
  const [apneaSec, setApneaSec] = useState(60);
  const [spo2, setSpo2] = useState(Math.max(92, Math.min(99, Math.round(initialSpo2 + 12))));
  const [feedback, setFeedback] = useState<string>(
    'Kenali epiglotis, lalu arahkan ujung blade Macintosh ke valekula tanpa mengungkit gigi atas.'
  );
  const [teethWarning, setTeethWarning] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Live apnea countdown & SpO2 desaturation timer during laryngoscopy
  useEffect(() => {
    if (completed) return;
    const timer = window.setInterval(() => {
      setApneaSec((prev) => {
        if (prev <= 1) {
          soundEngine.playWarning();
          setFeedback('Waktu apnea habis! Hentikan percobaan dan lakukan bagging ulang untuk pre-oksigenasi.');
          return 0;
        }
        return prev - 1;
      });
      setSpo2((prev) => {
        if (apneaSec < 32 && prev > 74) {
          return Math.max(72, prev - 1);
        }
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [apneaSec, completed]);

  // Calculate anatomical exposure quality (0..100)
  const bladeInRange = bladePos >= 68 && bladePos <= 92;
  const bladeTooDeep = bladePos > 92;
  const effectiveElevation = Math.min(100, elevation + (burpActive ? 18 : 0));
  const exposureScore = Math.round(
    (bladeInRange ? 38 : bladeTooDeep ? 14 : (bladePos / 75) * 34) +
      (Math.min(100, tongueSweep) / 100) * 28 +
      (effectiveElevation / 100) * 34
  );
  const glottisVisible = bladeInRange && tongueSweep >= 70 && effectiveElevation >= 70;

  const cormackGrade = glottisVisible
    ? 'Grade I (Pita suara terbuka jelas!)'
    : exposureScore >= 58
      ? 'Grade IIb (Hanya aritenoid terlihat — tingkatkan elevasi/BURP)'
      : bladeTooDeep
        ? 'Terlalu dalam — blade menekan epiglotis, tarik sedikit!'
        : 'Paparan belum memadai (Grade III)';

  const handleBladeAdjust = (delta: number) => {
    soundEngine.playClick();
    setTeethWarning(false);
    setBladePos((v) => {
      const next = Math.max(0, Math.min(100, v + delta));
      if (next > 92) {
        soundEngine.playWarning();
        setFeedback('Ujung blade terlalu dalam melewati valekula dan menutup kembali pandangan! Tarik sedikit.');
      } else if (next >= 68 && next <= 92) {
        setFeedback('Posisi ujung blade tepat di valekula! Lanjutkan ke langkah 2: Sapu lidah ke kiri.');
      }
      return next;
    });
  };

  const handleTongueSweep = (delta: number) => {
    soundEngine.playClick();
    setTongueSweep((v) => {
      const next = Math.max(0, Math.min(100, v + delta));
      if (next >= 75) {
        setFeedback('Lidah tersapu rapi ke kiri! Lanjutkan ke langkah 3: Elevasi sejajar gagang laringoskop.');
      }
      return next;
    });
  };

  const handleElevate = (delta: number) => {
    soundEngine.playClick();
    if (delta > 0 && bladePos < 50) {
      soundEngine.playWarning();
      setTeethWarning(true);
      setFeedback('Jangan mengungkit gigi atas sebelum ujung blade mencapai valekula!');
      return;
    }
    setTeethWarning(false);
    setElevation((v) => {
      const next = Math.max(0, Math.min(100, v + delta));
      if (bladeInRange && tongueSweep >= 70 && next + (burpActive ? 18 : 0) >= 70) {
        setFeedback('Rima glotidis dan pita suara tampak jelas (Cormack-Lehane I)! Lanjut ke langkah 4: Masukkan ETT.');
      }
      return next;
    });
  };

  const handleAdvanceEtt = () => {
    if (!glottisVisible) {
      soundEngine.playWarning();
      setFeedback('Paparan pita suara belum memadai! Pastikan posisi blade, sapuan lidah, dan elevasi hijau sebelum memasukkan ETT.');
      return;
    }
    soundEngine.playClick();
    setEttDepth((prev) => {
      const next = Math.min(100, prev + 35);
      if (next >= 100) {
        setCompleted(true);
        soundEngine.playSuccessChord();
        setFeedback('ETT berhasil masuk trakea! Balon cuff dikembangkan dan ventilasi mekanik terhubung.');
      } else {
        setFeedback('ETT melewati rima glotidis... dorong lagi hingga kedalaman 20 cm dan kembangkan cuff.');
      }
      return next;
    });
  };

  const handleRebag = () => {
    soundEngine.playConfirm();
    if (attempt >= 3) {
      onCancel(true);
      return;
    }
    setAttempt((a) => a + 1);
    setStep(1);
    setBladePos(20);
    setTongueSweep(15);
    setElevation(10);
    setEttDepth(0);
    setBurpActive(false);
    setApneaSec(60);
    setSpo2(98);
    setTeethWarning(false);
    setFeedback('Pre-oksigenasi dengan Bag-Valve Mask selesai (SpO2 98%). Mulai percobaan laringoskopi baru.');
  };

  // Visual transforms derived from procedure state
  const tongueShiftX = -(tongueSweep / 100) * 62;
  const epiglottisLiftY = -(effectiveElevation / 100) * 46;
  const bladeShiftY = -48 + (bladePos / 100) * 62 - (effectiveElevation / 100) * 26;
  const vocalCordOpacity = glottisVisible ? 1 : Math.max(0.15, (exposureScore - 35) / 65);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Prosedur Intubasi Endotrakeal"
    >
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col lg:flex-row lg:h-[90vh] lg:max-h-[680px] overflow-y-auto lg:overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Left: First-Person Modern 2D Anatomical Laryngoscopy Canvas */}
        <div className="flex shrink-0 lg:flex-1 flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
          {/* Non-overlapping Top Header Strip */}
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-800/80 bg-slate-950/80 px-3.5 sm:px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10.5px] sm:text-[11px] font-semibold text-slate-400">
                KEPALA PASIEN · {patientName}
              </div>
              <div className="truncate text-sm sm:text-base font-bold text-white">
                Pandangan Laringoskopi Langsung
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-right">
                <div>
                  <div className="text-[9px] font-semibold leading-none text-slate-400">SpO₂</div>
                  <div
                    className={`font-mono text-base sm:text-xl font-extrabold leading-tight tabular-nums ${
                      spo2 < 90 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {spo2}%
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-700" />
                <div className={`font-mono text-[11px] tabular-nums ${apneaSec < 15 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                  Apnea {apneaSec}d
                </div>
              </div>

              <button
                type="button"
                onClick={() => onCancel(false)}
                className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Tutup jendela intubasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {teethWarning && (
            <div className="shrink-0 border-b border-rose-500/50 bg-rose-950/95 px-4 py-2 text-center text-xs font-bold text-rose-200">
              Peringatan: Risiko cedera gigi seri atas! Angkat searah sumbu gagang, jangan mengungkit.
            </div>
          )}

          {/* Crisp Modern 2D First-Person Oral Cavity, Epiglottis, Vocal Cords & Macintosh Blade */}
          <div className="relative h-[240px] sm:h-[320px] lg:h-auto lg:flex-1 overflow-hidden">
            <svg
              viewBox="0 0 720 560"
              className="h-full w-full"
              role="img"
              aria-label="Anatomi jalan napas laringoskopi 2D"
            >
              <defs>
                <radialGradient id="skinFace" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#EAC1A2" />
                  <stop offset="75%" stopColor="#D4A17E" />
                  <stop offset="100%" stopColor="#B88462" />
                </radialGradient>
                <radialGradient id="oralDepth" cx="50%" cy="52%" r="55%">
                  <stop offset="0%" stopColor="#2A0A10" />
                  <stop offset="60%" stopColor="#5C1A26" />
                  <stop offset="100%" stopColor="#8A2C3B" />
                </radialGradient>
                <linearGradient id="metalBlade" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F8FAFC" />
                  <stop offset="40%" stopColor="#CBD5E1" />
                  <stop offset="75%" stopColor="#94A3B8" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
                <linearGradient id="ettTubeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E0F2FE" />
                  <stop offset="50%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#7DD3FC" />
                </linearGradient>
              </defs>

              {/* Blue surgical drape around head */}
              <rect width="720" height="560" fill="#172536" />
              <ellipse cx="360" cy="480" rx="340" ry="180" fill="#0F172A" opacity="0.5" />

              {/* Patient Chin, Cheeks & Nose (Inverted sniffing position from head of bed!) */}
              <path
                d="M150 560 C155 310, 210 150, 360 146 C510 150, 565 310, 570 560 Z"
                fill="url(#skinFace)"
                stroke="#8C5D41"
                strokeWidth="2.5"
              />
              {/* Nose contour at top */}
              <ellipse cx="360" cy="172" rx="44" ry="26" fill="#D29E7A" opacity="0.55" />

              {/* Outer Lips */}
              <ellipse cx="360" cy="346" rx="158" ry="152" fill="#C9737B" opacity="0.7" />
              {/* Open Oral Cavity */}
              <ellipse cx="360" cy="346" rx="132" ry="128" fill="url(#oralDepth)" stroke="#7F1D2C" strokeWidth="4" />

              {/* Deep Pharynx & Glottic Opening */}
              <g opacity={vocalCordOpacity} style={{ transition: 'opacity 180ms ease' }}>
                <path d="M360 278 L334 364 L386 364 Z" fill="#090407" />
                <path d="M360 278 L335 360" stroke="#F8FAFC" strokeWidth="7" strokeLinecap="round" />
                <path d="M360 278 L385 360" stroke="#F8FAFC" strokeWidth="7" strokeLinecap="round" />
                <ellipse cx="342" cy="364" rx="12" ry="9" fill="#E17F8E" stroke="#9F3B4A" strokeWidth="1.8" />
                <ellipse cx="378" cy="364" rx="12" ry="9" fill="#E17F8E" stroke="#9F3B4A" strokeWidth="1.8" />
                <path d="M348 318 Q360 323 372 318" stroke="#475569" strokeWidth="2.2" fill="none" opacity="0.6" />
                <path d="M344 334 Q360 340 376 334" stroke="#475569" strokeWidth="2.2" fill="none" opacity="0.6" />
                {glottisVisible && (
                  <text
                    x="360"
                    y="392"
                    textAnchor="middle"
                    fill="#5EEAD4"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    fontSize="12"
                    fontWeight="700"
                  >
                    Pita Suara Terlihat (Rima Glotidis)
                  </text>
                )}
              </g>

              {/* Epiglottis */}
              <g
                style={{
                  transform: `translateY(${epiglottisLiftY}px)`,
                  transition: 'transform 160ms ease-out',
                }}
              >
                <path
                  d="M312 318 C314 278, 406 278, 408 318 C396 340, 324 340, 312 318 Z"
                  fill="#D97B86"
                  stroke="#882936"
                  strokeWidth="2.5"
                />
                <path
                  d="M332 288 Q360 278 388 288"
                  fill="none"
                  stroke={bladeInRange ? '#2DD4BF' : '#FDA4AF'}
                  strokeWidth="3"
                  strokeDasharray="4 3"
                />
              </g>

              {/* Tongue */}
              <g
                style={{
                  transform: `translateX(${tongueShiftX}px)`,
                  transition: 'transform 160ms ease-out',
                }}
              >
                <path
                  d="M276 266 C276 232, 444 232, 444 266 C444 316, 412 344, 360 344 C308 344, 276 316, 276 266 Z"
                  fill="#DF8B90"
                  stroke="#9F3F49"
                  strokeWidth="2.5"
                />
                <line x1="360" y1="248" x2="360" y2="322" stroke="#B55862" strokeWidth="2" opacity="0.5" />
              </g>

              {/* Uvula */}
              <path
                d="M348 456 C346 420, 374 420, 372 456 C370 468, 350 468, 348 456 Z"
                fill="#D47480"
                stroke="#8A2C3B"
                strokeWidth="2"
              />

              {/* Upper Incisor Teeth */}
              <g>
                {[298, 318, 338, 360, 382, 402].map((tx, idx) => (
                  <rect
                    key={tx}
                    x={tx}
                    y={222 + Math.abs(idx - 2.5) * 4}
                    width="19"
                    height="26"
                    rx="4"
                    fill={teethWarning ? '#FECACA' : '#F8FAFC'}
                    stroke={teethWarning ? '#DC2626' : '#CBD5E1'}
                    strokeWidth="1.6"
                  />
                ))}
              </g>

              {/* Lower Teeth */}
              <g>
                {[318, 336, 354, 372, 390].map((tx) => (
                  <rect
                    key={tx}
                    x={tx}
                    y={452}
                    width="16"
                    height="18"
                    rx="3"
                    fill="#F1F5F9"
                    stroke="#CBD5E1"
                    strokeWidth="1.4"
                  />
                ))}
              </g>

              {/* Metallic Curved Macintosh Laryngoscope Blade */}
              <g
                style={{
                  transform: `translate(${-(tongueSweep / 100) * 18}px, ${bladeShiftY}px)`,
                  transition: 'transform 160ms ease-out',
                }}
              >
                <path
                  d="M-20 120 C80 210, 210 278, 356 292 C368 293, 370 308, 352 314 C195 334, 70 318, -20 290 Z"
                  fill="url(#metalBlade)"
                  stroke="#475569"
                  strokeWidth="2.8"
                />
                <circle cx="348" cy="300" r="16" fill="#FEF08A" opacity="0.32" />
                <circle cx="350" cy="300" r="4.5" fill="#FEF9C3" />
                <path
                  d="M12 182 C110 245, 224 292, 344 300"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  opacity="0.7"
                  strokeLinecap="round"
                />
              </g>

              {/* Endotracheal Tube */}
              {ettDepth > 0 && (
                <g
                  style={{
                    transform: `translate(${(100 - ettDepth) * 1.9}px, ${(100 - ettDepth) * 0.75}px)`,
                    transition: 'transform 220ms ease-out',
                  }}
                >
                  <path
                    d="M720 430 C560 400, 440 368, 360 326"
                    fill="none"
                    stroke="url(#ettTubeGrad)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    opacity="0.92"
                  />
                  <path
                    d="M720 430 C560 400, 440 368, 360 326"
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.2"
                    strokeDasharray="6 6"
                  />
                  {completed && (
                    <ellipse cx="364" cy="330" rx="18" ry="12" fill="#38BDF8" fillOpacity="0.45" stroke="#0EA5E9" strokeWidth="2" />
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Bottom instruction caption bar (in normal flow so it never covers anatomy) */}
          <div className="shrink-0 border-t border-slate-700/80 bg-slate-950/90 px-4 sm:px-5 py-2.5 text-xs leading-relaxed text-slate-200">
            {feedback}
          </div>
        </div>

        {/* Right / Bottom: Guided Procedural Controls Panel */}
        <div className="flex w-full lg:w-80 shrink-0 flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950 p-4 sm:p-5 lg:overflow-y-auto dark-scroll">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold text-slate-400">
                PERCOBAAN {attempt} / 3
              </span>
              <button
                type="button"
                onClick={() => onCancel(false)}
                className="hidden lg:flex rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Tutup jendela intubasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">Manuver &amp; Pengamatan</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Ikuti 4 tahap laringoskopi hingga pita suara terlihat jelas.
              </p>
            </div>

            {/* 4-Step Selector Grid */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [1, '1 · Blade'],
                  [2, '2 · Lidah'],
                  [3, '3 · Elevasi'],
                  [4, '4 · ETT'],
                ] as const
              ).map(([num, label]) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setStep(num)}
                  className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                    step === num
                      ? 'border-teal-400 bg-teal-500 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Active Step Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5">
              {step === 1 && (
                <>
                  <div className="text-xs font-semibold text-slate-200">
                    Arahkan ujung blade ke valekula (target zona hijau 70–90%).
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleBladeAdjust(-14)}
                      className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      Tarik Mundur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBladeAdjust(16)}
                      className="min-h-[42px] rounded-lg bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-500"
                    >
                      Majukan Blade
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="text-xs font-semibold text-slate-200">
                    Sapu lidah sepenuhnya ke sisi kiri untuk membuka lapang pandang.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTongueSweep(-20)}
                      className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      Kendurkan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTongueSweep(25)}
                      className="min-h-[42px] rounded-lg bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-500"
                    >
                      Sapu ke Kiri
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="text-xs font-semibold text-slate-200">
                    Angkat gagang 45° ke atas-depan (jangan mengungkit gigi!).
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleElevate(-18)}
                      className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      Turunkan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleElevate(22)}
                      className="min-h-[42px] rounded-lg bg-teal-600 py-2 text-xs font-bold text-white hover:bg-teal-500"
                    >
                      Elevasikan
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setBurpActive((v) => !v);
                    }}
                    className={`min-h-[40px] w-full rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      burpActive
                        ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {burpActive ? 'Bantuan asisten: BURP Aktif' : 'Bantuan asisten: BURP'}
                  </button>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="text-xs font-semibold text-slate-200">
                    Masukkan pipa ETT 7.5 mm melewati pita suara secara terkontrol.
                  </div>
                  {!completed ? (
                    <button
                      type="button"
                      onClick={handleAdvanceEtt}
                      className="min-h-[44px] w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      {ettDepth === 0 ? 'Masukkan ETT ke Trakea' : `Dorong ETT (${ettDepth}%)`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onSuccess}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-400 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-teal-300"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Konfirmasi ETT &amp; Sambung Ventilator</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* 3 Live Alignment Meters */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-400">Posisi blade</span>
                  <span className={`font-mono font-semibold ${bladeTooDeep ? 'text-rose-400' : bladeInRange ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {bladePos}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${
                      bladeTooDeep ? 'bg-rose-500' : bladeInRange ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${bladePos}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-400">Sapuan lidah</span>
                  <span className={`font-mono font-semibold ${tongueSweep >= 70 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {tongueSweep}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${tongueSweep >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${tongueSweep}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-400">Elevasi (+BURP)</span>
                  <span className={`font-mono font-semibold ${effectiveElevation >= 70 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {effectiveElevation}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${effectiveElevation >= 70 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${effectiveElevation}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Cormack-Lehane Exposure Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                {glottisVisible ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>{glottisVisible ? 'Paparan Memadai' : 'Paparan Belum Memadai'}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{cormackGrade}</p>
            </div>
          </div>

          {/* Safety Re-bagging / Abort Button */}
          <button
            type="button"
            onClick={handleRebag}
            disabled={completed}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-amber-700/70 bg-amber-950/60 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            {attempt < 3 ? <Wind className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
            <span>
              {attempt < 3 ? 'Hentikan percobaan · bagging ulang' : 'Batalkan & Kembali ke BVM'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
