# Dental Appointment Scheduling — WhatsApp AI Chatbot

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-10a37f)](https://groq.com)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API-34A853?logo=googlesheets)](https://sheets.google.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp%20Web-25D366?logo=whatsapp)](https://whatsapp.com)

Chatbot WhatsApp cerdas untuk Klinik Gigi. Asisten virtual yang melayani pertanyaan pasien tentang jadwal praktik dokter secara real-time dan otomatis 24/7, tanpa perlu staf menjawab telepon atau chat berulang kali.

---

## Latar Belakang

Klinik gigi sering menerima puluhan pertanyaan serupa setiap hari:

- "Dokter Andi praktek hari apa?"
- "Besok jam 10 ada dokter siapa?"
- "Hari Jumat drg. Sari praktek jam berapa?"

Staf harus menjawab satu per satu secara manual. Proyek ini mengotomatisasi jawaban tersebut menggunakan AI yang terhubung langsung ke data jadwal asli klinik, sehingga staf bisa fokus pada pelayanan pasien.

---

## Fitur Utama

| Fitur | Detail |
|---|---|
| AI-Powered | Merespon pertanyaan pasien dalam bahasa Indonesia natural menggunakan Llama 3.3 70B (Groq) |
| Integrasi Google Sheets | Data jadwal dokter diambil langsung dari spreadsheet. Staf non-teknis bisa mengedit tanpa menyentuh kode |
| Filter Cerdas | Pasien bisa mencari berdasarkan nama dokter, hari, atau jam praktik tertentu |
| Function Calling | AI memutuskan sendiri kapan perlu mengambil data dari Google Sheets |
| Sesi Tersimpan | WhatsApp tidak perlu scan QR ulang setiap restart |
| Real-time 24/7 | Bot aktif terus, pasien bisa bertanya kapan saja |

---

## Tech Stack

| Teknologi | Fungsi |
|---|---|
| Node.js | Runtime utama aplikasi |
| whatsapp-web.js | Otomasi WhatsApp Web untuk membaca dan mengirim pesan |
| Puppeteer / Chromium | Menjalankan browser untuk WhatsApp Web |
| Groq SDK (Llama 3.3 70B) | Otak AI dengan function calling untuk query jadwal |
| Google Sheets API | Database jadwal dokter yang mudah diedit |
| Axios | HTTP client untuk Google Sheets API |
| LocalAuth | Menyimpan sesi login WhatsApp |

---

## Arsitektur Sistem

```
Pasien WhatsApp --> whatsapp-web.js --> Groq AI (Llama 3)
                                            |
                                      Function Calling
                                            |
                                  Google Sheets API
                                            |
                                      Data Jadwal Dokter
```

**Alur kerja:**
1. Pasien mengirim pesan via WhatsApp
2. Groq AI menganalisis pesan, jika tentang jadwal maka memanggil fungsi ambilJadwalKlinik
3. Fungsi mengambil data dari Google Sheets berdasarkan parameter nama dokter atau hari
4. Data dikembalikan ke AI untuk disusun menjadi jawaban dalam Bahasa Indonesia
5. Jawaban dikirim balik ke pasien

---

## Cara Menjalankan Secara Lokal

### Prasyarat

- Node.js versi 18 atau lebih baru
- Akun Groq untuk API Key
- Google Cloud Project dengan Google Sheets API aktif
- WhatsApp di HP untuk scan QR

### Langkah-langkah

```bash
# 1. Clone repositori
git clone https://github.com/HamdanMarzuqi/Dental-appointment-scheduling.git
cd Dental-appointment-scheduling

# 2. Install dependensi
npm install

# 3. Buat file .env (lihat contoh di .env.example)
cp .env.example .env
# Edit .env: isi SPREADSHEET_ID, GOOGLE_API_KEY, GROQ_API_KEY

# 4. Jalankan aplikasi
npm start

# 5. Scan QR Code yang muncul di terminal
#    Buka WhatsApp > Perangkat Tertaut > Tap perangkat baru
#    Scan QR dengan HP klinik Anda

# 6. Selesai. Bot aktif dan siap melayani.
```

---

## Environment Variables

Buat file `.env` di root folder:

```env
SPREADSHEET_ID=id_google_sheets_anda
GOOGLE_API_KEY=api_key_google_anda
GROQ_API_KEY=gsk_xx_api_key_groq_anda
```

---

## Struktur Database Google Sheets

Sistem membaca Sheet1 dari sel A2 hingga D dengan format:

| Nama Dokter | Hari | Jam Mulai | Jam Selesai |
|---|---|---|---|
| drg. Budi | Senin | 09:00 | 13:00 |
| drg. Andi | Selasa | 15:00 | 20:00 |
| drg. Sari | Rabu | 08:00 | 12:00 |

Staf klinik cukup mengedit spreadsheet, sistem otomatis membaca data terbaru.

---

## Tangkapan Layar

(Tambahkan screenshot bot berjalan dan contoh chat WhatsApp di sini)

---

## Lihat Juga

Proyek lain yang saya bangun:

- [Malika Smart Booth](https://github.com/HamdanMarzuqi/Malika-Kebab-Management-System) — Sistem POS berbasis web dengan AI chatbot untuk UMKM F&B
- [HR Threads Agent](https://github.com/HamdanMarzuqi/hr-threads-agent) — AI agent untuk otomatisasi konten media sosial

---

## Lisensi

MIT
