# Silsilah 3D — Interactive 3D & 2D Family Tree

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Buka%20Silsilah%203D-0d9488?style=for-the-badge&logo=githubpages&logoColor=white)](https://sukmalistyoo.github.io/silsilah-3d/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-334155?style=for-the-badge)](./LICENSE)

> **Live Demo:** https://sukmalistyoo.github.io/silsilah-3d/

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

## Lisensi & Ketentuan Penggunaan

Proyek ini dilisensikan di bawah **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)** — Copyright © 2026 **sukmalistyoo**.

- **Bebas digunakan** untuk keperluan belajar, pribadi, keluarga, komunitas, maupun instansi desa.
- **Wajib mencantumkan atribusi** (kredit pencipta asli dan tautan ke repository ini).
- **Wajib tetap terbuka (*Copyleft*):** Jika kode ini dimodifikasi dan dijalankan/ditayangkan ulang sebagai layanan web publik, kode sumber turunannya wajib ikut dibagikan di bawah lisensi **AGPL-3.0** yang sama (tidak boleh diklaim atau dijual ulang sebagai aplikasi tertutup/*closed-source* tanpa izin tertulis).
- Untuk lisensi komersial tertutup (*closed-source*), silakan hubungi pemilik repository melalui GitHub.
