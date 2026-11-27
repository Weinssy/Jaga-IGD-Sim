import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  MessageSquareText,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Pill,
  ClipboardCheck,
  PhoneCall,
  LogOut,
  Receipt,
  Clock,
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  BedDouble,
  ClipboardList,
} from 'lucide-react';
import {
  ActivePump,
  ActiveTestOrder,
  AdministeredDrug,
  ClinicalCase,
  ClinicalLogEntry,
  CostEntry,
  GamePhase,
  NurseDialogue,
  OxygenDelivery,
  PatientPosture,
  SidebarTab,
  VitalSigns,
} from './types/clinical';
import { CLINICAL_CASES, formatClock, formatRupiah } from './data/cases';
import { soundEngine } from './audio/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { ErBayStage } from './components/ErBayStage';
import { PatientMonitorBar } from './components/PatientMonitorBar';
import { RightClipboardPanel } from './components/RightClipboardPanel';
import { EcgModal } from './components/EcgModal';
import { RadiologyModal } from './components/RadiologyModal';
import { IntubationModal } from './components/IntubationModal';
import {
  BudgetBreakdownModal,
  LabResultModal,
  MedicalRecordModal,
} from './components/ClinicalModals';
import { CaseSummaryModal } from './components/CaseSummaryModal';

const SIDEBAR_GROUPS: {
  group: string;
  items: { id: SidebarTab; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    group: 'Penilaian',
    items: [
      { id: 'pasien', label: 'Pasien', sub: 'Identitas & keluhan utama', icon: User },
      { id: 'anamnesis', label: 'Anamnesis', sub: 'Riwayat & faktor risiko', icon: MessageSquareText },
      { id: 'pemeriksaan_fisik', label: 'Pemeriksaan Fisik', sub: 'Penilaian ABCDE', icon: Stethoscope },
      { id: 'penunjang', label: 'Penunjang', sub: 'Lab, radiologi & EKG', icon: FlaskConical },
    ],
  },
  {
    group: 'Tatalaksana',
    items: [
      { id: 'stabilisasi', label: 'Stabilisasi', sub: 'ABCDE & resusitasi', icon: HeartPulse },
      { id: 'obat', label: 'Tindakan & Obat', sub: 'Prosedur & farmakoterapi', icon: Pill },
    ],
  },
  {
    group: 'Keputusan',
    items: [
      { id: 'diagnosis', label: 'Diagnosis', sub: 'Kerja & banding', icon: ClipboardCheck },
      { id: 'komunikasi', label: 'Komunikasi', sub: 'Edukasi, consent, konsul', icon: PhoneCall },
      { id: 'disposisi', label: 'Disposisi', sub: 'ICU, rujuk, rawat, pulang', icon: LogOut },
    ],
  },
];

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CLINICAL_CASES[0].id);
  const [muted, setMuted] = useState<boolean>(false);

  const clinicalCase: ClinicalCase =
    CLINICAL_CASES.find((c) => c.id === selectedCaseId) || CLINICAL_CASES[0];

  // Active Clinical Simulation State
  const [activeTab, setActiveTab] = useState<SidebarTab>('pasien');
  const [mobileView, setMobileView] = useState<'stage' | 'clipboard'>('stage');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  const [vitals, setVitals] = useState<VitalSigns>(clinicalCase.initialVitals);
  const [lastNibp, setLastNibp] = useState<{ sbp: number; dbp: number; map: number; timeSec: number } | null>(null);
  const [stabilizationLevel, setStabilizationLevel] = useState<number>(0); // 0..1

  const [posture, setPosture] = useState<PatientPosture>(clinicalCase.initialPosture);
  const [monitorAttached, setMonitorAttached] = useState<boolean>(false);
  const [ivAccess, setIvAccess] = useState<boolean>(false);
  const [urinaryCatheter, setUrinaryCatheter] = useState<boolean>(false);
  const [oxygen, setOxygen] = useState<OxygenDelivery>('none');

  const [activePumps, setActivePumps] = useState<ActivePump[]>([]);
  const [administeredDrugs, setAdministeredDrugs] = useState<AdministeredDrug[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveTestOrder[]>([]);
  const [askedAnamnesisIds, setAskedAnamnesisIds] = useState<string[]>([]);
  const [doneExamIds, setDoneExamIds] = useState<string[]>([]);
  const [doneCommIds, setDoneCommIds] = useState<string[]>([]);

  const [primaryDiagnosisId, setPrimaryDiagnosisId] = useState<string | null>(null);
  const [differentialIds, setDifferentialIds] = useState<string[]>([]);
  const [selectedDispositionId, setSelectedDispositionId] = useState<string | null>(null);
  const [ecgInterpretation, setEcgInterpretation] = useState<string>('');

  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [logs, setLogs] = useState<ClinicalLogEntry[]>([]);
  const [nurseDialogue, setNurseDialogue] = useState<NurseDialogue | null>(null);

  // Active Clinical Modals
  const [openEcgModal, setOpenEcgModal] = useState<boolean>(false);
  const [openCxrModal, setOpenCxrModal] = useState<boolean>(false);
  const [openLabTestId, setOpenLabTestId] = useState<string | null>(null);
  const [openIntubationModal, setOpenIntubationModal] = useState<boolean>(false);
  const [openBudgetModal, setOpenBudgetModal] = useState<boolean>(false);
  const [openRecordModal, setOpenRecordModal] = useState<boolean>(false);

  // Refs for stable simulation loop without stale closures
  const activePumpsRef = useRef(activePumps);
  const oxygenRef = useRef(oxygen);
  const postureRef = useRef(posture);
  const stabilizationRef = useRef(stabilizationLevel);
  const caseRef = useRef(clinicalCase);
  const alarmCooldownRef = useRef(0);

  activePumpsRef.current = activePumps;
  oxygenRef.current = oxygen;
  postureRef.current = posture;
  stabilizationRef.current = stabilizationLevel;
  caseRef.current = clinicalCase;

  const appendLog = useCallback(
    (category: ClinicalLogEntry['category'], text: string, timeSecOverride?: number) => {
      setLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timeSec: timeSecOverride ?? elapsedSec,
          category,
          text,
        },
        ...prev,
      ]);
    },
    [elapsedSec]
  );

  const addCost = useCallback(
    (label: string, category: CostEntry['category'], cost: number) => {
      setCosts((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          label,
          category,
          cost,
          timeSec: elapsedSec,
        },
      ]);
    },
    [elapsedSec]
  );

  // Initialize / Reset a clinical case cleanly
  const startCase = useCallback((caseId: string) => {
    const c = CLINICAL_CASES.find((item) => item.id === caseId) || CLINICAL_CASES[0];
    setSelectedCaseId(c.id);
    setActiveTab('pasien');
    setMobileView('stage');
    setElapsedSec(0);
    setPaused(false);
    setSpeed(1);
    setVitals({ ...c.initialVitals });
    setLastNibp(null);
    setStabilizationLevel(0);
    setPosture(c.initialPosture);
    setMonitorAttached(false);
    setIvAccess(false);
    setUrinaryCatheter(false);
    setOxygen('none');
    setActivePumps([]);
    setAdministeredDrugs([]);
    setActiveOrders([]);
    setAskedAnamnesisIds([]);
    setDoneExamIds([]);
    setDoneCommIds([]);
    setPrimaryDiagnosisId(null);
    setDifferentialIds([]);
    setSelectedDispositionId(null);
    setEcgInterpretation('');
    setCosts([]);
    setLogs([
      {
        id: 'init-triage',
        timeSec: 0,
        category: 'Triase',
        text: `Pasien ${c.patientName} (${c.age} th) tiba di Ruang Resusitasi IGD. ${c.chiefComplaint}`,
      },
    ]);
    setNurseDialogue({
      id: 'handover',
      title: 'Perawat Triase · Serah Terima SBAR',
      message: c.triageHandover,
      buttonText: 'Saya terima, terima kasih',
    });
    setOpenEcgModal(false);
    setOpenCxrModal(false);
    setOpenLabTestId(null);
    setOpenIntubationModal(false);
    setOpenBudgetModal(false);
    setOpenRecordModal(false);
    setPhase('PLAYING');
    soundEngine.playConfirm();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next) soundEngine.playClick();
      return next;
    });
  }, []);

  // Clamped real-time simulation loop (accumulates clamped delta time into 1-second physiological ticks)
  useEffect(() => {
    if (phase !== 'PLAYING' || paused || openIntubationModal || nurseDialogue !== null) {
      return;
    }

    let animId = 0;
    let lastTime = performance.now();
    let accum = 0;

    const stepLoop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      accum += dt * speed;

      if (accum >= 1.0) {
        const wholeSecs = Math.floor(accum);
        accum -= wholeSecs;

        setElapsedSec((prevSec) => {
          const nextSec = prevSec + wholeSecs;

          // Complete due diagnostic orders
          setActiveOrders((orders) => {
            let anyCompleted = false;
            const updated = orders.map((o) => {
              if (!o.completed && nextSec >= o.completesAtSec) {
                anyCompleted = true;
                return { ...o, completed: true };
              }
              return o;
            });
            if (anyCompleted) {
              soundEngine.playConfirm();
            }
            return updated;
          });

          return nextSec;
        });

        // Physiological vital signs evolution per simulation second
        const c = caseRef.current;
        const stab = stabilizationRef.current;
        const ox = oxygenRef.current;
        const pos = postureRef.current;
        const pumps = activePumpsRef.current.filter((p) => !p.paused);

        setVitals((v) => {
          const dtMin = wholeSecs / 60;
          const diseaseActivity = Math.max(0.05, 1 - stab);

          let dHr = c.untreatedDrift.hrPerMin * diseaseActivity * dtMin;
          let dSbp = c.untreatedDrift.sbpPerMin * diseaseActivity * dtMin;
          let dDbp = dSbp * 0.52;
          let dSpo2 = c.untreatedDrift.spo2PerMin * diseaseActivity * dtMin;
          let dRr = c.untreatedDrift.rrPerMin * diseaseActivity * dtMin;

          // Oxygen therapy effect
          if (ox === 'ett') {
            dSpo2 += (99 - v.spo2) * 0.16 * wholeSecs;
            dRr += (16 - v.rr) * 0.14 * wholeSecs;
          } else if (ox === 'nrm') {
            const targetOx = c.id === 'case_mk' ? 95 + stab * 4 : 98;
            dSpo2 += (targetOx - v.spo2) * 0.075 * wholeSecs;
            dRr -= 0.15 * wholeSecs;
          } else if (ox === 'bvm') {
            dSpo2 += (97 - v.spo2) * 0.11 * wholeSecs;
          } else if (ox === 'nasal_cannula') {
            const targetOx = c.id === 'case_ar' ? 97 : 91 + stab * 5;
            dSpo2 += (targetOx - v.spo2) * 0.05 * wholeSecs;
          }

          // Posture hemodynamic/respiratory impact
          if (c.harmfulPosture && pos === c.harmfulPosture) {
            if (c.id === 'case_mk') {
              dSpo2 -= 0.45 * wholeSecs;
              dRr += 0.25 * wholeSecs;
            } else if (c.id === 'case_sr') {
              dSbp -= 0.65 * wholeSecs;
              dHr += 0.35 * wholeSecs;
            }
          } else if (pos === c.preferredPosture) {
            if (c.id === 'case_sr' && v.sbp < 105) {
              dSbp += 0.22 * wholeSecs;
            }
          }

          // Active Continuous Syringe Pumps titration effects!
          pumps.forEach((pump) => {
            const drug = c.drugs.find((d) => d.id === pump.drugId);
            if (!drug) return;
            const intensity = (pump.rate / Math.max(1, pump.max)) * 1.35 * wholeSecs;
            if (drug.effects.sbpDelta) dSbp += drug.effects.sbpDelta * 0.14 * intensity;
            if (drug.effects.dbpDelta) dDbp += drug.effects.dbpDelta * 0.14 * intensity;
            if (drug.effects.hrDelta) dHr += drug.effects.hrDelta * 0.12 * intensity;
            if (drug.effects.spo2Delta) dSpo2 += drug.effects.spo2Delta * 0.16 * intensity;
            if (drug.effects.rrDelta) dRr += drug.effects.rrDelta * 0.14 * intensity;
          });

          // Gentle natural equilibrium once stabilized
          if (stab >= 0.7) {
            dHr += (86 - v.hr) * 0.025 * wholeSecs;
            dRr += (19 - v.rr) * 0.03 * wholeSecs;
          }

          const nextSbp = Math.max(55, Math.min(245, v.sbp + dSbp));
          const nextDbp = Math.max(35, Math.min(145, Math.min(nextSbp - 22, v.dbp + dDbp)));
          const nextHr = Math.max(42, Math.min(178, v.hr + dHr));
          const nextSpo2 = Math.max(66, Math.min(100, v.spo2 + dSpo2));
          const nextRr = Math.max(12, Math.min(44, v.rr + dRr));

          return {
            ...v,
            hr: nextHr,
            sbp: nextSbp,
            dbp: nextDbp,
            spo2: nextSpo2,
            rr: nextRr,
          };
        });

        // Periodic soft alarm chime if critical vitals persist
        alarmCooldownRef.current += wholeSecs;
        if (monitorAttached && alarmCooldownRef.current >= 14) {
          alarmCooldownRef.current = 0;
          if (vitals.spo2 < 88 || vitals.sbp >= 200 || vitals.sbp < 85) {
            soundEngine.playAlarmChime();
          }
        }
      }

      animId = requestAnimationFrame(stepLoop);
    };

    animId = requestAnimationFrame(stepLoop);
    return () => cancelAnimationFrame(animId);
  }, [phase, paused, speed, openIntubationModal, nurseDialogue, monitorAttached, vitals.spo2, vitals.sbp]);

  // Keep NIBP readout synchronized automatically every 15s when monitor is attached
  useEffect(() => {
    if (!monitorAttached) return;
    if (lastNibp === null || elapsedSec - lastNibp.timeSec >= 12) {
      setLastNibp({
        sbp: Math.round(vitals.sbp),
        dbp: Math.round(vitals.dbp),
        map: Math.round((vitals.sbp + 2 * vitals.dbp) / 3),
        timeSec: elapsedSec,
      });
    }
  }, [monitorAttached, elapsedSec, vitals.sbp, vitals.dbp, lastNibp]);

  // === CLINICAL ACTION HANDLERS ===
  const handleAttachMonitor = useCallback(() => {
    if (monitorAttached) return;
    soundEngine.playConfirm();
    setMonitorAttached(true);
    setLastNibp({
      sbp: Math.round(vitals.sbp),
      dbp: Math.round(vitals.dbp),
      map: Math.round((vitals.sbp + 2 * vitals.dbp) / 3),
      timeSec: elapsedSec,
    });
    addCost('Pemasangan Monitor Vital & SpO2', 'Stabilisasi', 25000);
    appendLog('Tindakan', 'Monitor tanda vital (EKG kontinu, NIBP, SpO2) terpasang.');
  }, [monitorAttached, vitals.sbp, vitals.dbp, elapsedSec, addCost, appendLog]);

  const handleMeasureNibp = useCallback(() => {
    if (!monitorAttached) return;
    soundEngine.playClick();
    const sbp = Math.round(vitals.sbp);
    const dbp = Math.round(vitals.dbp);
    const map = Math.round((sbp + 2 * dbp) / 3);
    setLastNibp({ sbp, dbp, map, timeSec: elapsedSec });
    appendLog('Tindakan', `Pengukuran NIBP manual: ${sbp}/${dbp} mmHg (MAP ${map}).`);
  }, [monitorAttached, vitals.sbp, vitals.dbp, elapsedSec, appendLog]);

  const handleEstablishIv = useCallback(() => {
    if (ivAccess) return;
    soundEngine.playConfirm();
    setIvAccess(true);
    addCost('Pemasangan Akses IV Perifer 18G', 'Stabilisasi', 35000);
    appendLog('Tindakan', 'Akses IV perifer 18G terpasang lancar pada vena lengan.');
  }, [ivAccess, addCost, appendLog]);

  const handlePlaceCatheter = useCallback(() => {
    if (urinaryCatheter) return;
    soundEngine.playConfirm();
    setUrinaryCatheter(true);
    addCost('Pemasangan Kateter Urin (Foley)', 'Stabilisasi', 45000);
    appendLog('Tindakan', 'Kateter urin terpasang untuk pemantauan diuresis.');
  }, [urinaryCatheter, addCost, appendLog]);

  const handleChangePosture = useCallback(
    (nextPos: PatientPosture) => {
      soundEngine.playClick();
      setPosture(nextPos);
      appendLog('Tindakan', `Posisi pasien diubah menjadi ${nextPos.replace('_', ' ')}.`);
      if (clinicalCase.harmfulPosture === nextPos) {
        soundEngine.playWarning();
        setMobileView('stage');
        setNurseDialogue({
          id: `pos-warn-${Date.now()}`,
          title: 'Kak Adi · Peringatan Klinis',
          message:
            clinicalCase.id === 'case_mk'
              ? 'Dok, pasien tampak semakin sesak dan saturasinya cepat turun saat dibaringkan datar! Pasien menolak berbaring karena edema paru.'
              : 'Dok, saat pasien didudukkan tegak, tensinya justru makin turun karena syok anafilaksis! Sebaiknya baringkan dengan elevasi tungkai.',
          buttonText: 'Mengerti, segera saya evaluasi',
          isUrgent: true,
        });
      }
    },
    [clinicalCase.harmfulPosture, clinicalCase.id, appendLog]
  );

  const handleChangeOxygen = useCallback(
    (nextOx: OxygenDelivery) => {
      if (oxygen === nextOx) return;
      soundEngine.playConfirm();
      setOxygen(nextOx);
      const costMap: Record<OxygenDelivery, number> = {
        none: 0,
        nasal_cannula: 20000,
        nrm: 45000,
        bvm: 35000,
        ett: 180000,
      };
      const labelMap: Record<OxygenDelivery, string> = {
        none: 'Lepas Oksigen',
        nasal_cannula: 'Terapi Oksigen Nasal Kanul 4 L/m',
        nrm: 'Terapi Oksigen NRM 15 L/m',
        bvm: 'Ventilasi Bag-Valve Mask (BVM)',
        ett: 'Intubasi Endotrakeal (ETT) + Ventilator',
      };
      if (costMap[nextOx] > 0) {
        addCost(labelMap[nextOx], 'Stabilisasi', costMap[nextOx]);
      }
      appendLog('Tindakan', `${labelMap[nextOx]} dimulai.`);
    },
    [oxygen, addCost, appendLog]
  );

  const handleIntubationSuccess = useCallback(() => {
    setOpenIntubationModal(false);
    setOxygen('ett');
    setStabilizationLevel((s) => Math.min(1, s + 0.35));
    setVitals((v) => ({ ...v, spo2: Math.max(v.spo2, 98), rr: 16 }));
    addCost('Prosedur Intubasi Endotrakeal (ETT) + Ventilator', 'Stabilisasi', 180000);
    appendLog('Tindakan', 'Intubasi endotrakeal berhasil (ETT 7.5 mm). Ventilasi mekanik aktif, SpO2 98%.');
  }, [addCost, appendLog]);

  const handleAskAnamnesis = useCallback(
    (id: string) => {
      if (askedAnamnesisIds.includes(id)) return;
      soundEngine.playClick();
      setAskedAnamnesisIds((prev) => [...prev, id]);
      const item = clinicalCase.anamnesis.find((a) => a.id === id);
      if (item) {
        appendLog('Triase', `Anamnesis (${item.speaker}): ${item.answer}`);
      }
    },
    [askedAnamnesisIds, clinicalCase.anamnesis, appendLog]
  );

  const handleDoPhysicalExam = useCallback(
    (id: string) => {
      if (doneExamIds.includes(id)) return;
      soundEngine.playClick();
      setDoneExamIds((prev) => [...prev, id]);
      const item = clinicalCase.physicalExams.find((p) => p.id === id);
      if (item) {
        appendLog('Tindakan', `Pem. Fisik ${item.system} (${item.label}): ${item.finding}`);
      }
    },
    [doneExamIds, clinicalCase.physicalExams, appendLog]
  );

  const handleOrderDiagnostic = useCallback(
    (testId: string) => {
      if (activeOrders.some((o) => o.testId === testId)) return;
      const test = clinicalCase.diagnostics.find((d) => d.id === testId);
      if (!test) return;
      soundEngine.playConfirm();
      setActiveOrders((prev) => [
        ...prev,
        {
          testId,
          orderedAtSec: elapsedSec,
          completesAtSec: elapsedSec + test.durationSec,
          completed: false,
        },
      ]);
      addCost(test.name, 'Penunjang', test.cost);
      appendLog('Penunjang', `Order ${test.name} (${formatRupiah(test.cost)}), estimasi ${test.durationSec} dtk.`);
    },
    [activeOrders, clinicalCase.diagnostics, elapsedSec, addCost, appendLog]
  );

  const handleOpenTestResult = useCallback(
    (testId: string) => {
      const test = clinicalCase.diagnostics.find((d) => d.id === testId);
      if (!test) return;
      soundEngine.playClick();
      if (test.modalType === 'ecg') {
        setOpenEcgModal(true);
      } else if (test.modalType === 'cxr') {
        setOpenCxrModal(true);
      } else {
        setOpenLabTestId(testId);
      }
    },
    [clinicalCase.diagnostics]
  );

  const handleAdministerDrug = useCallback(
    (drugId: string) => {
      const drug = clinicalCase.drugs.find((d) => d.id === drugId);
      if (!drug) return;
      if (drug.requiresIv && !ivAccess) {
        soundEngine.playWarning();
        return;
      }

      if (drug.isPump) {
        if (activePumps.some((p) => p.drugId === drug.id)) return;
        soundEngine.playConfirm();
        const newPump: ActivePump = {
          drugId: drug.id,
          name: drug.name,
          route: drug.route,
          rate: drug.pumpDefault ?? 5,
          unit: drug.pumpUnit ?? 'mg/jam',
          min: drug.pumpMin ?? 1,
          max: drug.pumpMax ?? 20,
          step: drug.pumpStep ?? 1,
          paused: false,
          startedAtSec: elapsedSec,
        };
        setActivePumps((prev) => [...prev, newPump]);
        if (drug.effects.stabilizeDisease) {
          setStabilizationLevel((s) => Math.min(1, s + drug.effects.stabilizeDisease!));
        }
        addCost(`${drug.name} (Syringe Pump)`, 'Obat & Tindakan', drug.cost);
        appendLog('Obat', `Syringe pump ${drug.name} dimulai pada dosis ${newPump.rate} ${newPump.unit}.`);
      } else {
        soundEngine.playConfirm();
        setAdministeredDrugs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            drugId: drug.id,
            name: drug.name,
            doseLabel: drug.doseLabel,
            timeSec: elapsedSec,
            cost: drug.cost,
          },
        ]);
        // Apply immediate bolus / IM / sublingual effects
        setVitals((v) => ({
          ...v,
          sbp: Math.max(55, Math.min(245, v.sbp + (drug.effects.sbpDelta ?? 0))),
          dbp: Math.max(35, Math.min(145, v.dbp + (drug.effects.dbpDelta ?? 0))),
          hr: Math.max(45, Math.min(175, v.hr + (drug.effects.hrDelta ?? 0))),
          spo2: Math.max(68, Math.min(100, v.spo2 + (drug.effects.spo2Delta ?? 0))),
          rr: Math.max(12, Math.min(42, v.rr + (drug.effects.rrDelta ?? 0))),
          pain: Math.max(0, Math.min(10, v.pain + (drug.effects.painDelta ?? 0))),
        }));
        if (drug.effects.stabilizeDisease) {
          setStabilizationLevel((s) => Math.min(1, s + drug.effects.stabilizeDisease!));
        }
        addCost(`${drug.name} (${drug.doseLabel})`, 'Obat & Tindakan', drug.cost);
        appendLog('Obat', `Diberikan ${drug.name} ${drug.doseLabel} (${drug.route}).`);
      }

      if (drug.warningIfContraindicated) {
        soundEngine.playWarning();
        appendLog('Peringatan', drug.warningIfContraindicated);
        setMobileView('stage');
        setNurseDialogue({
          id: `drug-warn-${Date.now()}`,
          title: 'Kak Adi · Peringatan Keamanan Obat',
          message: drug.warningIfContraindicated,
          buttonText: 'Saya catat, segera koreksi',
          isUrgent: true,
        });
      }
    },
    [clinicalCase.drugs, ivAccess, activePumps, elapsedSec, addCost, appendLog]
  );

  const handleAdjustPump = useCallback((drugId: string, delta: number) => {
    soundEngine.playClick();
    setActivePumps((prev) =>
      prev.map((p) => {
        if (p.drugId !== drugId) return p;
        const next = Math.max(p.min, Math.min(p.max, +(p.rate + delta).toFixed(2)));
        return { ...p, rate: next };
      })
    );
  }, []);

  const handleTogglePumpPause = useCallback((drugId: string) => {
    soundEngine.playClick();
    setActivePumps((prev) =>
      prev.map((p) => (p.drugId === drugId ? { ...p, paused: !p.paused } : p))
    );
  }, []);

  const handleStopPump = useCallback(
    (drugId: string) => {
      soundEngine.playClick();
      const target = activePumps.find((p) => p.drugId === drugId);
      setActivePumps((prev) => prev.filter((p) => p.drugId !== drugId));
      if (target) {
        appendLog('Obat', `Syringe pump ${target.name} dihentikan.`);
      }
    },
    [activePumps, appendLog]
  );

  const handleDoCommunication = useCallback(
    (id: string) => {
      if (doneCommIds.includes(id)) return;
      soundEngine.playConfirm();
      setDoneCommIds((prev) => [...prev, id]);
      const comm = clinicalCase.communications.find((c) => c.id === id);
      if (comm) {
        appendLog('Komunikasi', `${comm.title} — ${comm.responseSpeaker}: "${comm.responseText}"`);
      }
    },
    [doneCommIds, clinicalCase.communications, appendLog]
  );

  const handleFinishCase = useCallback(() => {
    soundEngine.playSuccessChord();
    setPaused(true);
    setPhase('CASE_SUMMARY');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (phase === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startCase(selectedCaseId);
        }
        return;
      }

      if (phase === 'PLAYING') {
        if (e.key === 'Escape') {
          if (openEcgModal) setOpenEcgModal(false);
          else if (openCxrModal) setOpenCxrModal(false);
          else if (openLabTestId) setOpenLabTestId(null);
          else if (openBudgetModal) setOpenBudgetModal(false);
          else if (openRecordModal) setOpenRecordModal(false);
          else if (!openIntubationModal) setPhase('PAUSED');
        } else if (e.key === ' ' && !openIntubationModal && !nurseDialogue) {
          e.preventDefault();
          setPaused((p) => !p);
        } else if (e.key === '1') {
          setSpeed(1);
        } else if (e.key === '2') {
          setSpeed(2);
        } else if (e.key === '3') {
          setSpeed(4);
        } else if (e.key.toLowerCase() === 'm' && !monitorAttached) {
          handleAttachMonitor();
        }
      } else if (phase === 'PAUSED' && e.key === 'Escape') {
        setPhase('PLAYING');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    selectedCaseId,
    startCase,
    openEcgModal,
    openCxrModal,
    openLabTestId,
    openBudgetModal,
    openRecordModal,
    openIntubationModal,
    nurseDialogue,
    monitorAttached,
    handleAttachMonitor,
  ]);

  if (phase === 'TITLE_MENU') {
    return (
      <TitleScreen
        cases={CLINICAL_CASES}
        selectedCaseId={selectedCaseId}
        onSelectCase={(id) => {
          soundEngine.playClick();
          setSelectedCaseId(id);
        }}
        onStartGame={() => startCase(selectedCaseId)}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
    );
  }

  const totalSpent = costs.reduce((acc, c) => acc + c.cost, 0);
  const budgetDiff = clinicalCase.budgetLimit - totalSpent;
  const budgetPercent = Math.min(100, Math.round((totalSpent / clinicalCase.budgetLimit) * 100));
  const pendingUrgentComms = clinicalCase.communications.filter(
    (c) => c.urgentBadge && !doneCommIds.includes(c.id)
  ).length;
  const activeLabTest = openLabTestId
    ? clinicalCase.diagnostics.find((d) => d.id === openLabTestId) || null
    : null;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-100 text-slate-900">
      {/* === TOP CLINICAL HUD BAR === */}
      <header className="flex h-14 lg:h-16 shrink-0 items-center justify-between gap-2 sm:gap-3 border-b border-slate-200 bg-white px-2.5 sm:px-4 shadow-xs z-20">
        {/* Left: Back to Menu + Hospital / Mobile Patient Identity */}
        <div className="flex min-w-0 flex-1 lg:flex-none items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPhase('PAUSED')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Menu Jeda (Esc)"
            aria-label="Menu Jeda"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-teal-400 font-extrabold text-xs">
              IGD
            </div>
            <div className="min-w-0">
              {/* Desktop Hospital Label */}
              <div className="hidden lg:block text-sm font-extrabold leading-tight text-slate-900 whitespace-nowrap">
                {clinicalCase.hospitalName}
              </div>
              <div className="hidden lg:block text-[11px] font-medium text-slate-500 whitespace-nowrap">
                {clinicalCase.code} · {clinicalCase.triageTag}
              </div>

              {/* Mobile/Tablet Compact Patient + Hospital Label */}
              <div className="lg:hidden truncate text-xs sm:text-sm font-extrabold leading-tight text-slate-900">
                {clinicalCase.patientName}{' '}
                <span className="font-medium text-slate-500">
                  · {clinicalCase.age} th
                </span>
              </div>
              <div className="lg:hidden truncate text-[10.5px] font-medium text-slate-500">
                {clinicalCase.hospitalName} · {clinicalCase.triageTag}
              </div>
            </div>
          </div>
        </div>

        {/* Center-Left (Desktop lg+): Patient Identity Summary */}
        <div className="hidden lg:flex items-center gap-3 border-l border-slate-200 pl-4 min-w-0">
          <img
            src={clinicalCase.portraitUrl}
            alt={clinicalCase.patientName}
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <span className="truncate">{clinicalCase.patientName}</span>
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {clinicalCase.gender === 'F' ? '♀' : '♂'} {clinicalCase.age} tahun
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
              <span>{clinicalCase.weightKg} kg</span>
              <span aria-hidden="true">·</span>
              <span>{clinicalCase.heightCm} cm</span>
              <span aria-hidden="true">·</span>
              <span>BMI {clinicalCase.bmi}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans font-semibold text-teal-700">{clinicalCase.insurance}</span>
            </div>
          </div>
        </div>

        {/* Center-Right (Desktop md+): BPJS Budget & Cost Tracker */}
        <div className="hidden md:flex items-center gap-2.5 border-l border-slate-200 pl-3 lg:pl-4 shrink-0">
          <div className="w-36 lg:w-48">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span
                className={`font-extrabold tabular-nums truncate ${
                  budgetDiff >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {budgetDiff >= 0
                  ? `Sisa ${formatRupiah(budgetDiff)}`
                  : `Lewat ${formatRupiah(Math.abs(budgetDiff))}`}
              </span>
              <span className="hidden xl:inline font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                {formatRupiah(totalSpent)} / {formatRupiah(clinicalCase.budgetLimit)}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-200 ${
                  budgetDiff < 0
                    ? 'bg-rose-500'
                    : budgetPercent > 80
                      ? 'bg-amber-500'
                      : 'bg-teal-600'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setOpenBudgetModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Receipt className="h-3.5 w-3.5 text-slate-500" />
            <span>Rincian</span>
          </button>
        </div>

        {/* Right: Active Mission Clock + Selesai Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <div className="text-right">
              <div className="hidden sm:block text-[9px] font-semibold leading-none text-slate-400">
                Misi aktif
              </div>
              <div className="font-mono text-xs sm:text-sm font-bold leading-tight text-slate-900 tabular-nums">
                {formatClock(elapsedSec)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('disposisi');
              setMobileView('clipboard');
            }}
            className="min-h-[36px] rounded-lg bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white transition-colors hover:bg-teal-600 whitespace-nowrap"
          >
            Selesai
          </button>
        </div>
      </header>

      {/* === MOBILE & TABLET (< lg): COMPACT WORKSPACE SWITCHER + BPJS BAR === */}
      <div className="flex lg:hidden shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
        {/* Segmented View Toggle: Ruang IGD vs Lembar Jaga */}
        <div className="inline-flex flex-1 rounded-lg border border-slate-200 bg-slate-200/70 p-0.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMobileView('stage');
            }}
            className={`inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
              mobileView === 'stage'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BedDouble className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Ruang IGD</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setMobileView('clipboard');
            }}
            className={`inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
              mobileView === 'clipboard'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Lembar Jaga</span>
            {pendingUrgentComms > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white">
                {pendingUrgentComms}
              </span>
            )}
          </button>
        </div>

        {/* Mobile BPJS Budget quick-open button (< md) */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setOpenBudgetModal(true);
          }}
          className={`md:hidden inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold tabular-nums whitespace-nowrap ${
            budgetDiff < 0
              ? 'border-rose-300 bg-rose-50 text-rose-700'
              : 'border-slate-300 bg-white text-slate-800'
          }`}
        >
          <Receipt className="h-3.5 w-3.5 shrink-0" />
          <span>
            {budgetDiff >= 0 ? `Sisa ${formatRupiah(budgetDiff)}` : `-${formatRupiah(Math.abs(budgetDiff))}`}
          </span>
        </button>
      </div>

      {/* === MOBILE & TABLET (< lg): HORIZONTAL SCROLLABLE LEMBAR JAGA TABS === */}
      {mobileView === 'clipboard' && (
        <div className="flex lg:hidden shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-2.5 py-2 clinical-scroll">
          {SIDEBAR_GROUPS.flatMap((g) => g.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'komunikasi' && pendingUrgentComms > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab(item.id);
                }}
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {showBadge && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white">
                    {pendingUrgentComms}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* === MAIN CLINICAL WORKSPACE (3-col Desktop lg+, Switched Full-Height View on Mobile/Tablet) === */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Left Navigation Sidebar: LEMBAR JAGA */}
        <nav
          aria-label="Lembar Jaga IGD"
          className="hidden lg:flex w-[215px] xl:w-[235px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/95 overflow-y-auto clinical-scroll"
        >
          <div className="px-4 pt-3.5 pb-2">
            <div className="text-[11px] font-extrabold tracking-wider text-slate-400">
              Lembar Jaga
            </div>
          </div>

          <div className="flex-1 space-y-4 px-2.5 pb-4">
            {SIDEBAR_GROUPS.map((section) => (
              <div key={section.group}>
                <div className="px-2 pb-1.5 text-[11px] font-bold text-slate-400">
                  {section.group}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const showBadge = item.id === 'komunikasi' && pendingUrgentComms > 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setActiveTab(item.id);
                        }}
                        className={`group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-700'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold leading-tight">
                              {item.label}
                            </div>
                            <div
                              className={`truncate text-[10.5px] leading-tight mt-0.5 ${
                                isActive ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {item.sub}
                            </div>
                          </div>
                        </div>

                        {showBadge && (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 font-mono text-[10px] font-bold text-white">
                            {pendingUrgentComms}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Center Living 2D Interactive ER Bay Stage (Always shown on lg+, shown when mobileView === 'stage' on < lg) */}
        <div
          className={`${
            mobileView === 'stage' ? 'flex' : 'hidden lg:flex'
          } min-h-0 flex-1 flex-col overflow-hidden`}
        >
          <ErBayStage
            clinicalCase={clinicalCase}
            vitals={vitals}
            posture={posture}
            monitorAttached={monitorAttached}
            ivAccess={ivAccess}
            oxygen={oxygen}
            activePumps={activePumps}
            activeOrders={activeOrders}
            elapsedSec={elapsedSec}
            nurseDialogue={nurseDialogue}
            onDismissDialogue={() => {
              soundEngine.playClick();
              setNurseDialogue(null);
            }}
            onAttachMonitor={handleAttachMonitor}
            onAdjustPump={handleAdjustPump}
            onTogglePumpPause={handleTogglePumpPause}
            onStopPump={handleStopPump}
            onOpenTestResult={handleOpenTestResult}
            onOpenMedicalRecord={() => {
              soundEngine.playClick();
              setOpenRecordModal(true);
            }}
          />
        </div>

        {/* Right Clinical Clipboard Panel (Always shown on lg+, shown when mobileView === 'clipboard' on < lg) */}
        <div
          className={`${
            mobileView === 'clipboard' ? 'flex flex-1 min-w-0' : 'hidden lg:flex'
          } min-h-0 overflow-hidden`}
        >
          <RightClipboardPanel
            activeTab={activeTab}
            clinicalCase={clinicalCase}
            elapsedSec={elapsedSec}
            askedAnamnesisIds={askedAnamnesisIds}
            onAskAnamnesis={handleAskAnamnesis}
            doneExamIds={doneExamIds}
            onDoPhysicalExam={handleDoPhysicalExam}
            activeOrders={activeOrders}
            onOrderDiagnostic={handleOrderDiagnostic}
            onOpenTestResult={handleOpenTestResult}
            monitorAttached={monitorAttached}
            onAttachMonitor={handleAttachMonitor}
            ivAccess={ivAccess}
            onEstablishIv={handleEstablishIv}
            urinaryCatheter={urinaryCatheter}
            onPlaceCatheter={handlePlaceCatheter}
            posture={posture}
            onChangePosture={handleChangePosture}
            oxygen={oxygen}
            onChangeOxygen={handleChangeOxygen}
            onStartIntubation={() => {
              soundEngine.playClick();
              setOpenIntubationModal(true);
            }}
            activePumps={activePumps}
            administeredDrugs={administeredDrugs}
            onAdministerDrug={handleAdministerDrug}
            primaryDiagnosisId={primaryDiagnosisId}
            onSelectPrimaryDiagnosis={(id) => {
              soundEngine.playClick();
              setPrimaryDiagnosisId(id);
              setDifferentialIds((prev) => prev.filter((d) => d !== id));
            }}
            differentialIds={differentialIds}
            onToggleDifferential={(id) => {
              soundEngine.playClick();
              setDifferentialIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              );
            }}
            doneCommIds={doneCommIds}
            onDoCommunication={handleDoCommunication}
            selectedDispositionId={selectedDispositionId}
            onSelectDisposition={(id) => {
              soundEngine.playClick();
              setSelectedDispositionId(id);
            }}
            onFinishCase={handleFinishCase}
          />
        </div>
      </div>

      {/* === BOTTOM LIVE PATIENT MONITOR TELEMETRY DECK === */}
      <PatientMonitorBar
        monitorAttached={monitorAttached}
        onAttachMonitor={handleAttachMonitor}
        vitals={vitals}
        ecgPattern={clinicalCase.ecgPattern}
        lastNibp={lastNibp}
        onMeasureNibp={handleMeasureNibp}
        paused={paused}
        onTogglePause={() => {
          soundEngine.playClick();
          setPaused((p) => !p);
        }}
        speed={speed}
        onChangeSpeed={(s) => {
          soundEngine.playClick();
          setSpeed(s);
        }}
        muted={muted}
        onToggleMute={handleToggleMute}
        onQrsBeat={() => soundEngine.playHeartbeatBeep(vitals.spo2)}
      />

      {/* === MODALS & OVERLAYS === */}
      {openEcgModal && (
        <EcgModal
          patientName={clinicalCase.patientName}
          hr={vitals.hr}
          pattern={clinicalCase.ecgPattern}
          interpretation={ecgInterpretation}
          onChangeInterpretation={setEcgInterpretation}
          onClose={() => setOpenEcgModal(false)}
        />
      )}

      {openCxrModal && (
        <RadiologyModal
          patientName={clinicalCase.patientName}
          pattern={clinicalCase.cxrPattern}
          officialReport={clinicalCase.cxrOfficialReport}
          onClose={() => setOpenCxrModal(false)}
        />
      )}

      {activeLabTest && (
        <LabResultModal
          patientName={clinicalCase.patientName}
          test={activeLabTest}
          onClose={() => setOpenLabTestId(null)}
        />
      )}

      {openIntubationModal && (
        <IntubationModal
          patientName={clinicalCase.patientName}
          initialSpo2={vitals.spo2}
          onSuccess={handleIntubationSuccess}
          onCancel={(rebagged) => {
            setOpenIntubationModal(false);
            if (rebagged) {
              setOxygen('bvm');
              appendLog('Tindakan', 'Percobaan intubasi dihentikan sementara, pasien diberikan ventilasi BVM.');
            }
          }}
        />
      )}

      {openBudgetModal && (
        <BudgetBreakdownModal
          budgetLimit={clinicalCase.budgetLimit}
          costs={costs}
          onClose={() => setOpenBudgetModal(false)}
        />
      )}

      {openRecordModal && (
        <MedicalRecordModal
          patientName={clinicalCase.patientName}
          logs={logs}
          onClose={() => setOpenRecordModal(false)}
        />
      )}

      {/* PAUSE MODAL */}
      {phase === 'PAUSED' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Simulasi Dijeda"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <Pause className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Simulasi Dijeda</h2>
              <p className="mt-1 text-xs text-slate-500">
                Kasus {clinicalCase.patientName} · Waktu berjalan {formatClock(elapsedSec)}
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setPhase('PLAYING')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-500"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Lanjutkan Simulasi</span>
              </button>
              <button
                type="button"
                onClick={() => startCase(clinicalCase.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Ulangi Kasus dari Awal</span>
              </button>
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Pilihan Kasus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL CASE EVALUATION SUMMARY */}
      {phase === 'CASE_SUMMARY' && (
        <CaseSummaryModal
          clinicalCase={clinicalCase}
          elapsedSec={elapsedSec}
          vitals={vitals}
          posture={posture}
          monitorAttached={monitorAttached}
          ivAccess={ivAccess}
          oxygen={oxygen}
          activePumps={activePumps}
          administeredDrugs={administeredDrugs}
          activeOrders={activeOrders}
          ecgInterpretation={ecgInterpretation}
          doneExamIds={doneExamIds}
          askedAnamnesisIds={askedAnamnesisIds}
          doneCommIds={doneCommIds}
          primaryDiagnosisId={primaryDiagnosisId}
          selectedDispositionId={selectedDispositionId}
          costs={costs}
          onReplayCase={() => startCase(clinicalCase.id)}
          onReturnToTitle={() => setPhase('TITLE_MENU')}
        />
      )}
    </div>
  );
}
