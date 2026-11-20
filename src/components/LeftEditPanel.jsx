import React, { useRef, useState } from 'react';
import {
  Box,
  ChevronLeft,
  Download,
  Edit3,
  Film,
  Heart,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';

function displayName(p) {
  return [p?.data?.['first name'], p?.data?.['last name']].filter(Boolean).join(' ') || 'Tanpa nama';
}

export default function LeftEditPanel({
  treeTitle,
  onChangeTreeTitle,
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
  recording,
  recordingSec,
  onToggleRecordBanner,
}) {
  const [styleOpen, setStyleOpen] = useState(false);
  const fileRef = useRef(null);

  return (
    <aside className="s3d-sidebar" aria-label="Panel Editor Silsilah">
      <div className="s3d-sidebar-head">
        <div className="s3d-brand">
          <span className="s3d-brand-mark">
            <Box size={16} />
          </span>
          <div>
            <h1>Silsilah 3D</h1>
            <p>{peopleCount} tokoh</p>
          </div>
        </div>
        <button
          type="button"
          className="s3d-icon-btn"
          onClick={onCollapse}
          title="Sembunyikan panel"
          aria-label="Sembunyikan panel"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="s3d-sidebar-scroll">
        {/* Editable Nama Silsilah */}
        <section className="s3d-section">
          <label className="s3d-title-field">
            <span className="s3d-section-label">Nama Silsilah</span>
            <input
              type="text"
              className="s3d-title-input"
              value={treeTitle}
              onChange={(e) => onChangeTreeTitle(e.target.value)}
              placeholder="Nama silsilah..."
              maxLength={80}
            />
          </label>
        </section>

        {/* Mode Switcher 3D / 2D */}
        <section className="s3d-section">
          <div className="s3d-segmented" role="tablist" aria-label="Pilih mode tampilan">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === '3d'}
              className={viewMode === '3d' ? 'is-active' : ''}
              onClick={() => onChangeViewMode('3d')}
            >
              <Box size={14} />
              <span>3D</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === '2d'}
              className={viewMode === '2d' ? 'is-active' : ''}
              onClick={() => onChangeViewMode('2d')}
            >
              <Layers size={14} />
              <span>2D</span>
            </button>
          </div>
        </section>

        {/* Cinematic MP4 Banner Download */}
        <section className="s3d-section">
          <button
            type="button"
            className={`s3d-record-btn ${recording ? 'is-recording' : ''}`}
            onClick={onToggleRecordBanner}
            title="Rekam & unduh banner video HD 16:9"
          >
            {recording ? (
              <>
                <span className="s3d-rec-dot" aria-hidden="true" />
                <Square size={12} />
                <span>0:{String(recordingSec).padStart(2, '0')} · Stop</span>
              </>
            ) : (
              <>
                <Film size={14} />
                <span>Video Banner MP4</span>
              </>
            )}
          </button>
        </section>

        {/* Selected Person Inspector & Edit Actions */}
        <section className="s3d-section">
          <div className="s3d-section-row">
            <span className="s3d-section-label">Tokoh</span>
            <button type="button" className="s3d-mini-add" onClick={onAddRoot}>
              <Plus size={12} />
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
                        ? `${selectedPerson.data.birthday}${selectedPerson.data?.death ? `–${selectedPerson.data.death}` : ''}`
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
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button type="button" className="s3d-act-btn is-accent" onClick={() => onAddRelation('child')}>
                  <UserPlus size={13} />
                  <span>+ Anak</span>
                </button>
                <button type="button" className="s3d-act-btn" onClick={() => onAddRelation('spouse')}>
                  <Heart size={13} />
                  <span>+ Pasangan</span>
                </button>
                <button type="button" className="s3d-act-btn" onClick={() => onAddRelation('parent')}>
                  <Users size={13} />
                  <span>+ Orang Tua</span>
                </button>
              </div>

              <button type="button" className="s3d-delete-btn" onClick={onDeleteSelected}>
                <Trash2 size={13} />
                <span>Hapus</span>
              </button>
            </div>
          ) : (
            <div className="s3d-empty-inspector">
              <p>Pilih tokoh di kanvas untuk edit atau tambah relasi.</p>
              <button type="button" className="s3d-btn-primary s3d-full" onClick={onAddRoot}>
                <UserPlus size={14} />
                <span>Tambah Tokoh</span>
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
              <Palette size={13} />
              <span>Gaya Bagan</span>
            </span>
            <span>{styleOpen ? '−' : '+'}</span>
          </button>

          {styleOpen && (
            <div className="s3d-style-box">
              <label>
                <span>Bentuk Bingkai</span>
                <select
                  value={appearance.shape || 'rounded'}
                  onChange={(e) => onChangeAppearance({ ...appearance, shape: e.target.value })}
                >
                  <option value="rounded">Membulat</option>
                  <option value="portrait">Foto Bulat</option>
                  <option value="oval">Oval</option>
                  <option value="square">Kotak</option>
                  <option value="pill">Kapsul</option>
                  <option value="hexagon">Heksagon</option>
                </select>
              </label>

              <div className="s3d-bg-group">
                <span className="s3d-mini-label">Warna Bingkai</span>
                <div className="s3d-swatches">
                  {[
                    { name: 'Steel Blue', hex: '#6e94ba' },
                    { name: 'Gold', hex: '#e6b85c' },
                    { name: 'Emerald', hex: '#34d399' },
                    { name: 'Rose', hex: '#f472b6' },
                    { name: 'Silver', hex: '#cbd5e1' },
                  ].map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      title={sw.name}
                      aria-label={`Bingkai ${sw.name}`}
                      className={`s3d-swatch ${(appearance.stroke || '#6e94ba').toLowerCase() === sw.hex ? 'is-active' : ''}`}
                      style={{ background: sw.hex }}
                      onClick={() => onChangeAppearance({ ...appearance, stroke: sw.hex })}
                    />
                  ))}
                  <input
                    type="color"
                    title="Pilih warna bingkai bebas"
                    aria-label="Pilih warna bingkai bebas"
                    className="s3d-swatch-picker"
                    value={appearance.stroke || '#6e94ba'}
                    onChange={(e) => onChangeAppearance({ ...appearance, stroke: e.target.value })}
                  />
                </div>
              </div>

              <div className="s3d-bg-group">
                <span className="s3d-mini-label">Warna Background</span>
                <div className="s3d-swatches">
                  {[
                    { name: 'Midnight', hex: '#081221' },
                    { name: 'Emerald', hex: '#061a19' },
                    { name: 'Indigo', hex: '#111028' },
                    { name: 'Obsidian', hex: '#0b0c10' },
                    { name: 'Espresso', hex: '#18120e' },
                  ].map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      title={sw.name}
                      aria-label={`Background ${sw.name}`}
                      className={`s3d-swatch ${(appearance.bg_color || '#081221').toLowerCase() === sw.hex && !appearance.bg_image ? 'is-active' : ''}`}
                      style={{ background: sw.hex }}
                      onClick={() => onChangeAppearance({ ...appearance, bg_color: sw.hex, bg_image: '' })}
                    />
                  ))}
                  <input
                    type="color"
                    title="Pilih warna bebas"
                    aria-label="Pilih warna background bebas"
                    className="s3d-swatch-picker"
                    value={appearance.bg_color || '#081221'}
                    onChange={(e) => onChangeAppearance({ ...appearance, bg_color: e.target.value, bg_image: '' })}
                  />
                </div>
              </div>

              <div className="s3d-bg-group">
                <span className="s3d-mini-label">Gambar Background</span>
                <div className="s3d-bg-img-row">
                  <label className="s3d-upload-pill">
                    <span>{appearance.bg_image ? 'Ganti Gambar' : 'Upload Gambar'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="s3d-sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => onChangeAppearance({ ...appearance, bg_image: String(reader.result || '') });
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                  {appearance.bg_image && (
                    <button
                      type="button"
                      className="s3d-clear-bg"
                      onClick={() => onChangeAppearance({ ...appearance, bg_image: '' })}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <label>
                <span>Warna Garis</span>
                <input
                  type="color"
                  value={appearance.line_color || '#2563eb'}
                  onChange={(e) => onChangeAppearance({ ...appearance, line_color: e.target.value })}
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
          <Upload size={13} />
          <span>Import</span>
        </button>
        <button type="button" className="s3d-foot-btn" onClick={onExportJson} title="Export JSON">
          <Download size={13} />
          <span>Export</span>
        </button>
        <button type="button" className="s3d-foot-btn" onClick={onResetDemo} title="Reset demo">
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </aside>
  );
}
