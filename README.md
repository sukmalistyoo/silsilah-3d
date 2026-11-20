# Silsilah 3D — Interactive 3D & 2D Family Tree

Aplikasi web interaktif untuk memvisualisasikan dan menyunting bagan silsilah keluarga dalam mode **3D (Three.js / React Three Fiber)** dan **2D**, lengkap dengan panel editor di sisi kiri dan kanvas penuh yang bersih di sisi kanan.

## Fitur Utama
- **Panel Editor Sisi Kiri + Kanvas Bersih:** Tambah tokoh baru, tambah anak, pasangan, atau orang tua, ubah data & foto, serta sembunyikan panel kapan saja untuk tampilan kanvas penuh.
- **Mode 3D & 2D:** Beralih instan antara visualisasi ruang 3D interaktif dan tampilan 2D pan/zoom.
- **Tata Letak Otomatis Cerdas:**
  - **Liak-liuk (*Serpentine*):** Jalur nasab tunggal yang panjang otomatis terlipat horizontal agar tetap ringkas dan mudah dibaca.
  - **Grid Bertingkat (*Multi-Row Cluster*):** Orang tua dengan banyak anak otomatis tersusun rapi 2–3 baris bertingkat.
  - **Jalur Rel Bersudut Halus (*Rounded Bus-Bar*):** Garis penghubung tegak-lurus rapi yang turun melalui celah antarkartu (bebas garis tumpang tindih).
- **Kaligrafi Arab & Penyorotan Khusus:** Mendukung tampilan nama Arab di dalam bingkai potret 3D/2D.
- **Interaksi Lengkap:** Cari tokoh, cek hubungan kekerabatan, *Play Sorot Leluhur* (animasi kamera 3D), *Mode Haul*, dan ekspor poster PNG.
- **Download Banner Video MP4 Cinematik:** Rekam otomatis animasi kamera 3D sinematik (1280×720 HD 16:9 lengkap *letterbox* & judul emas) langsung dari browser tanpa server.
- **Tanpa Backend (100% Statis):** Perubahan demo tersimpan otomatis di `localStorage` browser serta mendukung **Import / Export JSON**.

## Dataset Demo Bawaan
- **Contoh Trah Keluarga Wira Kusuma** (5 generasi, 34 tokoh fiktif — aman untuk demo publik).

## Menjalankan Secara Lokal
```bash
npm install
npm run dev
```

## Build Produksi
```bash
npm run build
```

## Deploy ke GitHub Pages
Repo ini sudah menyertakan workflow `.github/workflows/deploy.yml`:
1. Buat repository baru di GitHub bernama `silsilah-3d`.
2. Push branch `main` ke repository tersebut:
   ```bash
   git remote add origin https://github.com/<username>/silsilah-3d.git
   git branch -M main
   git push -u origin main
   ```
3. Buka **Settings → Pages → Source: GitHub Actions**.
4. Dalam ~1 menit, demo langsung aktif di `https://<username>.github.io/silsilah-3d/`.
