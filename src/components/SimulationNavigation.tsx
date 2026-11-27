import {
  ArrowLeft,
  ClipboardCheck,
  Clock,
  FlaskConical,
  HeartPulse,
  LogOut,
  MessageSquareText,
  PhoneCall,
  Pill,
  Receipt,
  Stethoscope,
  User,
  type LucideIcon,
} from 'lucide-react';
import { formatClock, formatRupiah } from '../data/cases';
import { ClinicalCase, SidebarTab } from '../types/clinical';

const sections: {
  group: string;
  items: { id: SidebarTab; label: string; icon: LucideIcon }[];
}[] = [
  {
    group: 'Penilaian',
    items: [
      { id: 'pasien', label: 'Profil pasien', icon: User },
      { id: 'anamnesis', label: 'Anamnesis', icon: MessageSquareText },
      { id: 'pemeriksaan_fisik', label: 'Pemeriksaan fisik', icon: Stethoscope },
      { id: 'penunjang', label: 'Penunjang', icon: FlaskConical },
    ],
  },
  {
    group: 'Tata laksana',
    items: [
      { id: 'stabilisasi', label: 'Stabilisasi', icon: HeartPulse },
      { id: 'obat', label: 'Tindakan dan obat', icon: Pill },
    ],
  },
  {
    group: 'Keputusan',
    items: [
      { id: 'diagnosis', label: 'Diagnosis', icon: ClipboardCheck },
      { id: 'komunikasi', label: 'Komunikasi', icon: PhoneCall },
      { id: 'disposisi', label: 'Disposisi', icon: LogOut },
    ],
  },
];

interface SimulationHeaderProps {
  clinicalCase: ClinicalCase;
  elapsedSec: number;
  totalSpent: number;
  onPauseMenu: () => void;
  onOpenBudget: () => void;
  onOpenDisposition: () => void;
}

export function SimulationHeader({
  clinicalCase,
  elapsedSec,
  totalSpent,
  onPauseMenu,
  onOpenBudget,
  onOpenDisposition,
}: SimulationHeaderProps) {
  const remaining = clinicalCase.budgetLimit - totalSpent;

  return (
    <header className="sim-header">
      <div className="sim-header-inner">
        <button type="button" className="sim-header-icon" onClick={onPauseMenu} aria-label="Menu jeda">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="sim-identity">
          <img src={clinicalCase.portraitUrl} alt="" width={192} height={192} />
          <div>
            <p className="sim-case-code">{clinicalCase.hospitalName} <span>·</span> {clinicalCase.code}</p>
            <h1>{clinicalCase.patientName}</h1>
            <p className="sim-patient-meta">{clinicalCase.age} tahun <span>·</span> {clinicalCase.difficulty}</p>
          </div>
        </div>
        <span className="sim-clock">
          <Clock size={16} aria-hidden="true" />
          <span className="sr-only">Waktu simulasi</span>
          {formatClock(elapsedSec)}
        </span>
        <button
          type="button"
          className="sim-budget"
          onClick={onOpenBudget}
          aria-label="Rincian biaya"
          data-over-budget={remaining < 0}
        >
          <Receipt size={17} aria-hidden="true" />
          <span className="sim-budget-label">Biaya</span>
          <span className="sim-budget-detail">
            {remaining < 0 ? 'Lewat ' : 'Sisa '}{formatRupiah(Math.abs(remaining))}
            <progress
              aria-label="Penggunaan plafon BPJS"
              max={clinicalCase.budgetLimit}
              value={Math.min(totalSpent, clinicalCase.budgetLimit)}
            />
          </span>
        </button>
        <button type="button" className="sim-disposition" onClick={onOpenDisposition}>
          Disposisi
        </button>
      </div>
    </header>
  );
}

interface ClipboardNavigationProps {
  activeTab: SidebarTab;
  urgentCount: number;
  onSelectTab: (tab: SidebarTab) => void;
}

export function ClipboardNavigation({ activeTab, urgentCount, onSelectTab }: ClipboardNavigationProps) {
  return (
    <nav className="sim-sidebar sim-panel-scroll clinical-scroll" aria-label="Bagian lembar jaga">
      <h2>Lembar jaga</h2>
      {sections.map(({ group, items }) => (
        <div className="sim-nav-group" key={group}>
          <h3>{group}</h3>
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={activeTab === id ? 'true' : undefined}
              aria-controls="clipboard-section"
              onClick={() => onSelectTab(id)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
              {id === 'komunikasi' && urgentCount > 0 && (
                <span className="sim-urgent-count" aria-label={`${urgentCount} komunikasi mendesak`}>{urgentCount}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function ClipboardSectionSelect({ activeTab, urgentCount, onSelectTab }: ClipboardNavigationProps) {
  return (
    <div className="sim-section-select">
      <label htmlFor="clipboard-navigation">Bagian lembar jaga</label>
      <select
        id="clipboard-navigation"
        value={activeTab}
        onChange={(event) => onSelectTab(event.currentTarget.value as SidebarTab)}
      >
        {sections.map(({ group, items }) => (
          <optgroup key={group} label={group}>
            {items.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}{id === 'komunikasi' && urgentCount > 0 ? ` (${urgentCount} mendesak)` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
