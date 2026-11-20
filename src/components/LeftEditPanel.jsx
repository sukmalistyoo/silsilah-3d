import React, { useRef, useState } from 'react';
import {
  Box,
  ChevronLeft,
  Download,
  Edit3,
  Heart,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';

function displayName(p) {
  return [p?.data?.['first name'], p?.data?.['last name']].filter(Boolean).join(' ') || 'Tanpa nama';
}

export default function LeftEditPanel({
  datasets,
  activeDatasetId,
  onSelectDataset,
  viewMode,
  onChangeViewMode,
  peopleCount,
  selectedPerson,
  onAddRoot,
  onEditSelected,
  onAddRelation,
  onDeleteSelected,
  appearance,
  onChangeAppearance,
  onExportJson,
  onImportJson,
  onResetDemo,
  onCollapse,
}) {
  const [styleOpen, setStyleOpen] = useState(false);
  const fileRef = useRef(null);

  return (
    <aside className="s3d-sidebar" aria-label="Panel Editor Silsilah">
      <div className="s3d-sidebar-head">
        <div className="s3d-brand">
          <span className="s3d-brand-mark">
            <Box size={18} />
          </span>
          <div>
            <h1>Silsilah 3D</h1>
            <p>{peopleCount} tokoh · Interaktif 3D &amp; 2D</p>
          </div>
        </div>
        <button type="button" className="s3d-icon-btn" onClick={onCollapse} title="Sembunyikan panel edit" aria-label="Sembunyikan panel edit">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="s3d-sidebar-scroll">
        {/* Mode Switcher 3D / 2D */}
        <section className="s3d-section">
          <span className="s3d-section-label">Mode Kanvas</span>
          <div className="s3d-segmented" role="tablist" aria-label="Pilih mode tampilan">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === '3d'}
              className={viewMode === '3d' ? 'is-active' : ''}
              onClick={() => onChangeViewMode('3d')}
            >
              <Box size={14} />
              <span>Tampilan 3D</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === '2d'}
              className={viewMode === '2d' ? 'is-active' : ''}
              onClick={() => onChangeViewMode('2d')}
            >
              <Layers size={14} />
              <span>Tampilan 2D</span>
            </button>
          </div>
        </section>

        {/* Dataset Switcher */}
        <section className="s3d-section">
          <span className="s3d-section-label">Demo Silsilah</span>
          <div className="s3d-dataset-list">
            {datasets.map((ds) => (
              <button
                key={ds.id}
                type="button"
                className={`s3d-dataset-btn ${activeDatasetId === ds.id ? 'is-active' : ''}`}
                onClick={() => onSelectDataset(ds.id)}
              >
                <span>{ds.label}</span>
                <small>{ds.people.length} tokoh</small>
              </button>
            ))}
          </div>
        </section>

        {/* Selected Person Inspector & Edit Actions */}
        <section className="s3d-section">
          <div className="s3d-section-row">
            <span className="s3d-section-label">Editor Tokoh</span>
            <button type="button" className="s3d-mini-add" onClick={onAddRoot}>
              <Plus size={13} />
              <span>Baru</span>
            </button>
          </div>

          {selectedPerson ? (
            <div className="s3d-inspector">
              <div className="s3d-inspector-head">
                {selectedPerson.data?.arabic && (
                  <div className="s3d-inspector-arabic" dir="rtl" lang="ar">
                    {selectedPerson.data.arabic}
                  </div>
                )}
                <strong>{displayName(selectedPerson)}</strong>
                {(selectedPerson.data?.gelar || selectedPerson.data?.birthday) && (
                  <p className="s3d-inspector-sub">
                    {[
                      selectedPerson.data?.gelar,
                      selectedPerson.data?.birthday
                        ? `${selectedPerson.data.birthday}${selectedPerson.data?.death ? ` – ${selectedPerson.data.death}` : ''}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {selectedPerson.data?.bio && <p className="s3d-inspector-bio">{selectedPerson.data.bio}</p>}
              </div>

              <div className="s3d-action-grid">
                <button type="button" className="s3d-act-btn" onClick={onEditSelected}>
                  <Edit3 size={14} />
                  <span>Edit Data</span>
                </button>
                <button type="button" className="s3d-act-btn is-accent" onClick={() => onAddRelation('child')}>
                  <UserPlus size={14} />
                  <span>+ Anak</span>
                </button>
                <button type="button" className="s3d-act-btn" onClick={() => onAddRelation('spouse')}>
                  <Heart size={14} />
                  <span>+ Pasangan</span>
                </button>
                <button type="button" className="s3d-act-btn" onClick={() => onAddRelation('parent')}>
                  <Users size={14} />
                  <span>+ Orang Tua</span>
                </button>
              </div>

              <button type="button" className="s3d-delete-btn" onClick={onDeleteSelected}>
                <Trash2 size={14} />
                <span>Hapus Tokoh Ini</span>
              </button>
            </div>
          ) : (
            <div className="s3d-empty-inspector">
              <p>Klik salah satu kartu tokoh di kanvas untuk mengedit data atau menambah anak, pasangan, dan orang tua.</p>
              <button type="button" className="s3d-btn-primary s3d-full" onClick={onAddRoot}>
                <UserPlus size={15} />
                <span>Tambah Tokoh Baru</span>
              </button>
            </div>
          )}
        </section>

        {/* Gaya Bagan */}
        <section className="s3d-section">
          <button
            type="button"
            className="s3d-collapse-trigger"
            aria-expanded={styleOpen}
            onClick={() => setStyleOpen((v) => !v)}
          >
            <span className="s3d-collapse-title">
              <Palette size={14} />
              <span>Gaya Bingkai &amp; Garis</span>
            </span>
            <span>{styleOpen ? '−' : '+'}</span>
          </button>

          {styleOpen && (
            <div className="s3d-style-box">
              <label>
                <span>Bentuk Bingkai 3D</span>
                <select
                  value={appearance.portraitShape || 'rounded'}
                  onChange={(e) => onChangeAppearance({ ...appearance, portraitShape: e.target.value })}
                >
                  <option value="rounded">Kotak Membulat</option>
                  <option value="circle">Lingkaran</option>
                  <option value="arch">Kubah / Arch</option>
                  <option value="square">Kotak Tegas</option>
                </select>
              </label>
              <label>
                <span>Warna Garis</span>
                <input
                  type="color"
                  value={appearance.lineColor || '#94a3b8'}
                  onChange={(e) => onChangeAppearance({ ...appearance, lineColor: e.target.value })}
                />
              </label>
            </div>
          )}
        </section>
      </div>

      {/* Footer Data Tools */}
      <div className="s3d-sidebar-foot">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="s3d-sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onImportJson(f);
          }}
        />
        <button type="button" className="s3d-foot-btn" onClick={() => fileRef.current?.click()} title="Import JSON">
          <Upload size={14} />
          <span>Import</span>
        </button>
        <button type="button" className="s3d-foot-btn" onClick={onExportJson} title="Export JSON">
          <Download size={14} />
          <span>Export</span>
        </button>
        <button type="button" className="s3d-foot-btn" onClick={onResetDemo} title="Reset ke data awal">
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>
    </aside>
  );
}
