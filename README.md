# SYGMA AI Chatbot Report Generator

A local web application to parse monthly chatbot usage Excel files, analyze over-billing splits (time limit vs. output token limit), kustomize analysis insights using the Gemini API, and automatically compile a professionally styled DOCX report matching PT Adira Dinamika Multi Finance Tbk guidelines.

## Fitur Utama

- **Drag & Drop File Upload**: Pengunggahan file Excel untuk data usage bulanan dan file referensi harga/limit token secara mudah.
- **Automated Mathematical Parsing**: Membaca file Excel secara otomatis, melakukan klasifikasi alasan over-billing, dan menghitung total session serta token usage secara akurat.
- **Gemini API Integration**: Menghubungi Gemini LLM secara dinamis untuk menulis cover letter introduction dan menyusun poin-poin analisis (insights) kustom berdasarkan data excel dan prompt kustom dari user.
- **Offline Fallback**: Masih dapat menghasilkan laporan DOCX dengan teks template standar jika dijalankan tanpa koneksi internet atau tanpa API key.
- **Word Document Compiler**: Membuat file `.docx` siap unduh lengkap dengan margin custom, borderless tables, layout approval block, zebra striping, dan logo Adira Finance.
- **Premium Glassmorphic UI**: Antarmuka modern bertema gelap dengan responsivitas tinggi dan micro-animations.

## Cara Menjalankan Aplikasi

### 1. Masuk ke Direktori Proyek
Buka terminal Anda dan pastikan berada di folder proyek ini:
```bash
cd "report-generator-web"
```

### 2. Jalankan Server Flask
Jalankan file `app.py` menggunakan Python 3:
```bash
python3 app.py
```
Server akan berjalan secara lokal di: `http://127.0.0.1:5000` atau `http://localhost:5000`.

### 3. Akses melalui Browser
Buka browser Anda dan navigasikan ke `http://localhost:5000`.

---

## Cara Penggunaan di Web UI

1. **Masukkan Gemini API Key**: Masukkan API key Anda di kolom konfigurasi (API key akan disimpan secara lokal di browser Anda menggunakan `localStorage` agar tidak terhapus saat me-refresh halaman).
2. **Pilih Model**: Pilih model plan yang Anda inginkan (default: `Gemini 1.5 Flash`).
3. **Unggah File Excel**: 
   - Unggah Laporan Bulanan (misal `02_CREDIT.xlsx`) ke drop zone **Monthly Usage Report**. Sistem akan langsung membaca data excel dan menampilkan ringkasan data di panel kanan (Live Preview).
   - (Opsional) Unggah file acuan harga ke drop zone **Pricing Reference Table**.
4. **Berikan Prompt Kustom (Opsional)**: Masukkan instruksi khusus jika Anda ingin memodifikasi gaya penulisan atau menaruh perhatian khusus pada poin analisis tertentu. Anda juga dapat mengklik tag template cepat di bawah textarea.
5. **Generate Report**: Klik tombol **Generate DOCX Report**. Timeline proses pembuatan akan muncul. Setelah selesai, tombol **Unduh File Laporan (.docx)** akan aktif untuk mengunduh laporan Anda!
