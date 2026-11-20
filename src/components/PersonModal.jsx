import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function PersonModal({ open, mode = 'add', relationLabel = '', initial = null, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    arabic: '',
    gelar: '',
    gender: 'M',
    birthday: '',
    death: '',
    bio: '',
    avatar: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      firstName: initial?.data?.['first name'] || '',
      lastName: initial?.data?.['last name'] || '',
      arabic: initial?.data?.arabic || '',
      gelar: initial?.data?.gelar || '',
      gender: initial?.data?.gender || 'M',
      birthday: initial?.data?.birthday || '',
      death: initial?.data?.death || '',
      bio: initial?.data?.bio || '',
      avatar: initial?.data?.avatar || '',
    });
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('avatar', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const title =
    mode === 'edit'
      ? 'Edit Data Tokoh'
      : relationLabel
        ? `Tambah ${relationLabel}`
        : 'Tambah Tokoh Baru';

  return (
    <div className="s3d-modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="s3d-modal">
        <div className="s3d-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form
          className="s3d-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.firstName.trim()) return;
            onSave({
              'first name': form.firstName.trim(),
              'last name': form.lastName.trim(),
              gender: form.gender,
              ...(form.arabic.trim() ? { arabic: form.arabic.trim() } : { arabic: '' }),
              ...(form.gelar.trim() ? { gelar: form.gelar.trim() } : { gelar: '' }),
              ...(form.birthday.trim() ? { birthday: form.birthday.trim() } : { birthday: '' }),
              ...(form.death.trim() ? { death: form.death.trim() } : { death: '' }),
              ...(form.bio.trim() ? { bio: form.bio.trim() } : { bio: '' }),
              ...(form.avatar.trim() ? { avatar: form.avatar.trim() } : { avatar: '' }),
            });
          }}
        >
          <div className="s3d-grid-2">
            <label>
              <span>Nama Depan *</span>
              <input type="text" required autoFocus value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Contoh: Ahmad" />
            </label>
            <label>
              <span>Nama Belakang</span>
              <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Opsional" />
            </label>
          </div>

          <div className="s3d-grid-2">
            <label>
              <span>Jenis Kelamin</span>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="M">Laki-laki</option>
                <option value="F">Perempuan</option>
              </select>
            </label>
            <label>
              <span>Gelar / Keterangan</span>
              <input type="text" value={form.gelar} onChange={(e) => set('gelar', e.target.value)} placeholder="Opsional (mis. K.H. / Cikal Bakal)" />
            </label>
          </div>

          <label>
            <span>Tulisan Arab (Opsional — tampil di kotak potret)</span>
            <input type="text" dir="rtl" lang="ar" value={form.arabic} onChange={(e) => set('arabic', e.target.value)} placeholder="مثال: مُحَمَّدٌ ﷺ" />
          </label>

          <div className="s3d-grid-2">
            <label>
              <span>Tahun Lahir</span>
              <input type="text" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} placeholder="1975" />
            </label>
            <label>
              <span>Tahun Wafat</span>
              <input type="text" value={form.death} onChange={(e) => set('death', e.target.value)} placeholder="Kosongkan jika masih hidup" />
            </label>
          </div>

          <label>
            <span>Biografi / Catatan Singkat</span>
            <textarea rows={2} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Catatan singkat tokoh..." />
          </label>

          <label>
            <span>Foto Potret (Opsional — upload gambar lokal)</span>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
          </label>

          <div className="s3d-modal-actions">
            <button type="button" className="s3d-btn-ghost" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="s3d-btn-primary">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
