export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'CASE_SUMMARY';

export type SidebarTab =
  | 'pasien'
  | 'anamnesis'
  | 'pemeriksaan_fisik'
  | 'penunjang'
  | 'stabilisasi'
  | 'obat'
  | 'diagnosis'
  | 'komunikasi'
  | 'disposisi';

export type PatientPosture = 'high_fowler' | 'semi_fowler' | 'supine' | 'trendelenburg';

export type OxygenDelivery = 'none' | 'nasal_cannula' | 'nrm' | 'bvm' | 'ett';

export type EcgPattern = 'lvh_sinus_tachy' | 'anterior_stemi' | 'anaphylaxis_tachy';

export type CxrPattern = 'pulmonary_edema' | 'mild_cardiomegaly' | 'clear_hyperinflated';

export interface VitalSigns {
  hr: number;      // bpm
  sbp: number;     // mmHg
  dbp: number;     // mmHg
  spo2: number;    // %
  rr: number;      // breaths/min
  temp: number;    // Celsius
  pain: number;    // 0-10 NRS
}

export interface AnamnesisItem {
  id: string;
  category: 'Keluhan' | 'Riwayat Penyakit' | 'Obat & Alergi' | 'Faktor Risiko';
  question: string;
  answer: string;
  speaker: 'Pasien' | 'Keluarga';
  keyClue?: boolean;
}

export interface PhysicalExamItem {
  id: string;
  system: 'Airway' | 'Breathing' | 'Circulation' | 'Disability' | 'Exposure';
  label: string;
  finding: string;
  abnormal: boolean;
  durationSec: number;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  category: 'Lab' | 'Radiologi' | 'EKG';
  cost: number;
  durationSec: number;
  summary: string;
  details: { label: string; value: string; normal: string; abnormal?: boolean }[];
  modalType?: 'ecg' | 'cxr';
  essential?: boolean;
}

export interface ActiveTestOrder {
  testId: string;
  orderedAtSec: number;
  completesAtSec: number;
  completed: boolean;
}

export interface DrugItem {
  id: string;
  name: string;
  generic: string;
  category: 'Syringe Pump' | 'Bolus IV' | 'Oral / SL' | 'IM / Inhalasi' | 'Cairan IV';
  route: string;
  doseLabel: string;
  indication: string;
  cost: number;
  requiresIv?: boolean;
  isPump?: boolean;
  pumpUnit?: string;
  pumpMin?: number;
  pumpMax?: number;
  pumpStep?: number;
  pumpDefault?: number;
  /** Physiological delta targets per administration or per pump unit */
  effects: {
    sbpDelta?: number;
    dbpDelta?: number;
    hrDelta?: number;
    spo2Delta?: number;
    rrDelta?: number;
    painDelta?: number;
    stabilizeDisease?: number; // 0..1 reduces ongoing deterioration
  };
  warningIfContraindicated?: string;
}

export interface ActivePump {
  drugId: string;
  name: string;
  route: string;
  rate: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  paused: boolean;
  startedAtSec: number;
}

export interface AdministeredDrug {
  id: string;
  drugId: string;
  name: string;
  doseLabel: string;
  timeSec: number;
  cost: number;
}

export interface CommunicationAction {
  id: string;
  title: string;
  target: 'Keluarga / Wali' | 'Pasien' | 'Dokter Spesialis';
  description: string;
  responseSpeaker: string;
  responseText: string;
  unlocksConsent?: boolean;
  essential?: boolean;
  urgentBadge?: boolean;
}

export interface DiagnosisOption {
  id: string;
  name: string;
  icd10: string;
  isPrimaryCorrect?: boolean;
  isDifferentialValid?: boolean;
}

export interface DispositionOption {
  id: string;
  title: string;
  subtitle: string;
  isCorrect: boolean;
  feedback: string;
}

export interface CostEntry {
  id: string;
  label: string;
  category: 'Stabilisasi' | 'Penunjang' | 'Obat & Tindakan';
  cost: number;
  timeSec: number;
}

export interface ClinicalLogEntry {
  id: string;
  timeSec: number;
  category: 'Triase' | 'Tindakan' | 'Obat' | 'Penunjang' | 'Komunikasi' | 'Peringatan';
  text: string;
}

export interface NurseDialogue {
  id: string;
  title: string;
  message: string;
  buttonText: string;
  isUrgent?: boolean;
}

export interface PatientAppearance {
  skinTone: string;
  hairColor: string;
  topColor: string;
  topAccent: string;
  pantsColor: string;
  gender: 'F' | 'M';
  hasHijab?: boolean;
  hijabColor?: string;
  hasBun?: boolean;
  ageGroup: 'young' | 'middle' | 'elderly';
}

export interface ClinicalCase {
  id: string;
  code: string;
  difficulty: 'Menengah' | 'Kritis' | 'Sangat Kritis';
  hospitalName: string;
  triageTag: string;
  patientName: string;
  age: number;
  gender: 'F' | 'M';
  weightKg: number;
  heightCm: number;
  bmi: number;
  insurance: string;
  budgetLimit: number;
  portraitUrl: string;
  appearance: PatientAppearance;
  chiefComplaint: string;
  guardianName: string;
  guardianRelation: string;
  consentNote: string;
  knownAllergies: string;
  triageHandover: string;
  initialPosture: PatientPosture;
  preferredPosture: PatientPosture;
  harmfulPosture?: PatientPosture;
  initialVitals: VitalSigns;
  /** Per-minute untreated drift */
  untreatedDrift: {
    hrPerMin: number;
    sbpPerMin: number;
    spo2PerMin: number;
    rrPerMin: number;
  };
  ecgPattern: EcgPattern;
  ecgExpectedKeywords: string[];
  ecgOfficialInterpretation: string;
  cxrPattern: CxrPattern;
  cxrOfficialReport: string;
  anamnesis: AnamnesisItem[];
  physicalExams: PhysicalExamItem[];
  diagnostics: DiagnosticTest[];
  drugs: DrugItem[];
  communications: CommunicationAction[];
  diagnoses: DiagnosisOption[];
  dispositions: DispositionOption[];
  criticalDrugIds: string[];
  harmfulDrugIds: string[];
  recommendedOxygen: OxygenDelivery[];
  requiresIntubationIfSevere?: boolean;
  targetBpRange?: [number, number];
}
