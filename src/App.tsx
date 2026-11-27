import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
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
import { ASSET_PATHS, CLINICAL_CASES, formatClock, formatRupiah } from './data/cases';
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
import { ClinicalDialog } from './components/ClinicalDialog';
import { ClipboardNavigation, ClipboardSectionSelect, SimulationHeader } from './components/SimulationNavigation';
import './Simulation.css';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [caseRun, setCaseRun] = useState(0);
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
  const clipboardRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    clipboardRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

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
    setCaseRun((run) => run + 1);
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
      title: 'Serah terima pasien (SBAR)',
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
        setNurseDialogue({
          id: `pos-warn-${Date.now()}`,
          title: 'Peringatan klinis',
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
        setNurseDialogue({
          id: `drug-warn-${Date.now()}`,
          title: 'Peringatan keamanan obat',
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
        appendLog('Komunikasi', `${comm.title}. ${comm.responseSpeaker}: "${comm.responseText}"`);
      }
    },
    [doneCommIds, clinicalCase.communications, appendLog]
  );

  const handleFinishCase = useCallback(() => {
    soundEngine.playSuccessChord();
    setPaused(true);
    setPhase('CASE_SUMMARY');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat || document.querySelector('dialog[open]')) {
        return;
      }
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const onControl = target?.closest('button, summary, a[href]');

      if (phase === 'TITLE_MENU') {
        if (e.key === 'Enter' && !onControl) {
          e.preventDefault();
          startCase(selectedCaseId);
        }
        return;
      }

      if (phase === 'PLAYING') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setPhase('PAUSED');
        } else if (e.key === ' ' && !onControl) {
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
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    selectedCaseId,
    startCase,
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
        audioAvailable={soundEngine.isAvailable()}
        onToggleMute={handleToggleMute}
      />
    );
  }

  const totalSpent = costs.reduce((acc, c) => acc + c.cost, 0);
  const pendingUrgentComms = clinicalCase.communications.filter(
    (c) => c.urgentBadge && !doneCommIds.includes(c.id)
  ).length;
  const activeLabTest = openLabTestId
    ? clinicalCase.diagnostics.find((d) => d.id === openLabTestId) || null
    : null;
  const simulationStopped = paused || phase !== 'PLAYING' || openIntubationModal || nurseDialogue !== null;
  const selectTab = (id: SidebarTab) => {
    soundEngine.playClick();
    setActiveTab(id);
    setMobileView('clipboard');
  };

  return (
    <div key={caseRun} className="sim-shell" data-view={mobileView} data-paused={simulationStopped}>
      <SimulationHeader
        clinicalCase={clinicalCase}
        elapsedSec={elapsedSec}
        totalSpent={totalSpent}
        onPauseMenu={() => setPhase('PAUSED')}
        onOpenBudget={() => {
          soundEngine.playClick();
          setOpenBudgetModal(true);
        }}
        onOpenDisposition={() => {
          selectTab('disposisi');
          requestAnimationFrame(() => {
            clipboardRef.current?.scrollTo({ top: 0 });
            clipboardRef.current?.focus();
          });
        }}
      />

      <PatientMonitorBar
        monitorAttached={monitorAttached}
        onAttachMonitor={handleAttachMonitor}
        vitals={vitals}
        ecgPattern={clinicalCase.ecgPattern}
        lastNibp={lastNibp}
        onMeasureNibp={handleMeasureNibp}
        paused={paused}
        waveformPaused={simulationStopped}
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
        audioAvailable={soundEngine.isAvailable()}
        onToggleMute={handleToggleMute}
        onQrsBeat={() => soundEngine.playHeartbeatBeep(vitals.spo2)}
      />

      <main className="sim-workspace">
        <ClipboardNavigation activeTab={activeTab} urgentCount={pendingUrgentComms} onSelectTab={selectTab} />

        <section id="resuscitation-room" className="sim-stage sim-panel-scroll clinical-scroll" aria-labelledby="bay-heading">
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
            onAdjustPump={handleAdjustPump}
            onTogglePumpPause={handleTogglePumpPause}
            onStopPump={handleStopPump}
            onOpenTestResult={handleOpenTestResult}
            onOpenMedicalRecord={() => {
              soundEngine.playClick();
              setOpenRecordModal(true);
            }}
          />
        </section>

        <aside
          id="clinical-clipboard"
          ref={clipboardRef}
          tabIndex={-1}
          className="sim-clipboard sim-panel-scroll clinical-scroll"
          aria-label="Lembar jaga"
        >
          <ClipboardSectionSelect activeTab={activeTab} urgentCount={pendingUrgentComms} onSelectTab={selectTab} />
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
        </aside>
      </main>

      <nav className="sim-mobile-nav" aria-label="Ruang kerja simulasi">
        <button
          type="button"
          aria-controls="resuscitation-room"
          aria-pressed={mobileView === 'stage'}
          onClick={() => {
            soundEngine.playClick();
            setMobileView('stage');
          }}
        >
          <BedDouble size={18} aria-hidden="true" />
          Ruang IGD
        </button>
        <button
          type="button"
          aria-controls="clinical-clipboard"
          aria-pressed={mobileView === 'clipboard'}
          onClick={() => {
            soundEngine.playClick();
            setMobileView('clipboard');
          }}
        >
          <ClipboardList size={18} aria-hidden="true" />
          Lembar jaga
          {pendingUrgentComms > 0 && (
            <span className="sim-urgent-count" aria-label={`${pendingUrgentComms} komunikasi mendesak`}>
              {pendingUrgentComms}
            </span>
          )}
        </button>
      </nav>

      {nurseDialogue && (
        <ClinicalDialog labelledBy="handover-title" onDismiss={() => setNurseDialogue(null)}>
          <div className="sim-handover" data-urgent={nurseDialogue.isUrgent ?? false}>
            <div className="sim-handover-heading">
              <img src={ASSET_PATHS.nursePortrait} alt="" width={192} height={192} />
              <div>
                <p>Kak Adi · Perawat triase</p>
                <h2 id="handover-title">{nurseDialogue.title}</h2>
              </div>
            </div>
            <p className="sim-handover-message">{nurseDialogue.message}</p>
            <form method="dialog">
              <button type="submit" autoFocus className="sim-primary" onClick={() => soundEngine.playClick()}>
                {nurseDialogue.buttonText}
              </button>
            </form>
          </div>
        </ClinicalDialog>
      )}

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

      {phase === 'PAUSED' && (
        <ClinicalDialog
          className="max-w-sm"
          labelledBy="pause-title"
          onDismiss={() => setPhase('PLAYING')}
        >
          <div className="sim-handover space-y-4">
            <Pause size={22} aria-hidden="true" className="text-teal-700" />
            <div>
              <h2 id="pause-title" className="text-lg font-extrabold">Simulasi dijeda</h2>
              <p className="mt-1 text-sm text-slate-600">
                {clinicalCase.patientName} · Waktu berjalan {formatClock(elapsedSec)}
              </p>
            </div>
            <form method="dialog" className="grid gap-2">
              <button type="submit" autoFocus className="sim-primary">
                <Play size={16} aria-hidden="true" />
                Lanjutkan simulasi
              </button>
              <button
                type="button"
                onClick={() => startCase(clinicalCase.id)}
                className="sim-secondary"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Ulangi kasus
              </button>
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="sim-secondary"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Kembali ke pilihan kasus
              </button>
            </form>
          </div>
        </ClinicalDialog>
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
