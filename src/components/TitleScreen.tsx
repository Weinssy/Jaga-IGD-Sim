import { Activity, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { ASSET_PATHS, formatRupiah } from '../data/cases';
import { ClinicalCase } from '../types/clinical';
import './TitleScreen.css';

interface TitleScreenProps {
  cases: ClinicalCase[];
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onStartGame: () => void;
  muted: boolean;
  audioAvailable: boolean;
  onToggleMute: () => void;
}

export function TitleScreen({
  cases,
  selectedCaseId,
  onSelectCase,
  onStartGame,
  muted,
  audioAvailable,
  onToggleMute,
}: TitleScreenProps) {
  const activeCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0];

  return (
    <div className="title-screen">
      <header className="title-header title-container">
        <div className="title-hospital">
          <div className="title-mark">
            <Activity size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>RS Nusantara</strong>
            <span>Instalasi Gawat Darurat</span>
          </div>
        </div>
        <button type="button" className="title-audio" onClick={onToggleMute} disabled={!audioAvailable}>
          {!audioAvailable || muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
          <span>Suara {audioAvailable ? (muted ? 'nonaktif' : 'aktif') : 'tidak tersedia'}</span>
        </button>
      </header>

      <main className="title-main title-container">
        <div className="title-intro">
          <p className="title-kicker">Simulasi dokter jaga</p>
          <h1>Jaga <span>IGD</span></h1>
          <p className="title-description">
            Tangani pasien gawat darurat, dari serah terima triase hingga keputusan disposisi.
          </p>
        </div>

        <figure className="title-scene">
          <div className="title-scene-image">
            <img
              src={ASSET_PATHS.titleBackdrop}
              alt="Ilustrasi tenaga medis menangani pasien di ruang resusitasi"
              width={1376}
              height={768}
              fetchPriority="high"
            />
          </div>
          <figcaption>
            <Activity size={19} aria-hidden="true" />
            <span>Ruang resusitasi</span>
            <span className="title-scene-caption">RS Nusantara</span>
          </figcaption>
        </figure>

        <section className="title-cases" aria-labelledby="case-list-heading">
          <h2 id="case-list-heading">
            Pilih kasus <span>{cases.length} pasien</span>
          </h2>

          {activeCase ? (
            <>
              <fieldset className="title-case-list" aria-labelledby="case-list-heading">
                {cases.map((item) => (
                  <label key={item.id} className="title-case-label">
                    <input
                      className="sr-only"
                      type="radio"
                      name="clinical-case"
                      checked={item.id === activeCase.id}
                      onChange={() => onSelectCase(item.id)}
                      aria-labelledby={`patient-${item.id}`}
                      aria-describedby={`complaint-${item.id}`}
                    />
                    <span className="title-case">
                      <img src={item.portraitUrl} alt="" width={192} height={192} decoding="async" />
                      <span className="title-case-copy">
                        <span className="title-case-heading">
                          <strong id={`patient-${item.id}`}>{item.patientName}</strong>
                          <span>{item.age} tahun</span>
                        </span>
                        <span className="title-case-complaint" id={`complaint-${item.id}`}>
                          {item.chiefComplaint}
                        </span>
                      </span>
                      <span className="title-radio-mark" aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="title-case-detail">
                <div className="title-triage">
                  <span>{activeCase.triageTag}</span>
                  <strong>{activeCase.difficulty}</strong>
                </div>
                <dl className="title-vitals">
                  <div>
                    <dt>TD <span>mmHg</span></dt>
                    <dd>{activeCase.initialVitals.sbp}/{activeCase.initialVitals.dbp}</dd>
                  </div>
                  <div>
                    <dt>Nadi <span>bpm</span></dt>
                    <dd>{activeCase.initialVitals.hr}</dd>
                  </div>
                  <div>
                    <dt>SpO₂ <span>%</span></dt>
                    <dd>{activeCase.initialVitals.spo2}</dd>
                  </div>
                  <div>
                    <dt>Plafon BPJS</dt>
                    <dd>{formatRupiah(activeCase.budgetLimit)}</dd>
                  </div>
                </dl>
              </div>

              <button type="button" onClick={onStartGame} className="title-start">
                <span>Mulai tangani {activeCase.patientName}</span>
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </>
          ) : (
            <p className="title-empty">Belum ada kasus untuk disimulasikan.</p>
          )}
        </section>
      </main>

      <footer className="title-footer title-container">
        <p>Pasien dan data dalam simulasi ini bersifat fiktif.</p>
        <p className="title-shortcuts"><kbd>Enter</kbd> Mulai <kbd>Spasi</kbd> Jeda <kbd>Esc</kbd> Menu</p>
      </footer>
    </div>
  );
}
