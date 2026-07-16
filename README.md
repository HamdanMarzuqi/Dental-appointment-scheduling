# 🏥 Chatbot WhatsApp Jadwal Klinik Gigi

Sebuah Chatbot WhatsApp cerdas yang bertugas sebagai Asisten Virtual Resmi untuk klinik gigi. Bot ini menggunakan **Kecerdasan Buatan (AI dari Groq Llama 3)** yang diintegrasikan langsung dengan **Google Sheets** untuk melayani pertanyaan pasien terkait jadwal praktek dokter secara *real-time* dan otomatis 24/7.

## ✨ Fitur Utama
- **Respon Cerdas (AI-Powered):** Mampu merespon pertanyaan pasien dalam bahasa sehari-hari yang natural dan ramah.
- **Integrasi Database Real-time:** Menarik jadwal praktek dokter gigi (nama, hari, jam) langsung dari Google Sheets.
- **Sistem Pemfilteran Otomatis:** Pasien dapat mencari jadwal berdasarkan nama dokter spesifik, hari tertentu, maupun jam praktek.
- **Sesi Login Tersimpan:** Menggunakan `LocalAuth` untuk menyimpan sesi WhatsApp, sehingga admin tidak perlu men-*scan* QR Code setiap kali server dinyalakan ulang.
- **Penanganan Kesalahan Canggih:** Mampu mengarahkan dan menjawab pasien secara logis jika jadwal dokter tidak ditemukan.

## 🛠️ Teknologi yang Digunakan
- **Node.js** & **JavaScript**
- **whatsapp-web.js:** Library untuk otomasi WhatsApp Web.
- **Groq SDK (Llama 3.3 70B):** Sebagai otak utama kecerdasan buatan dan pemanggilan fungsi (*function calling*).
- **Google Sheets API & Axios:** Sebagai Database Manajemen yang mudah diperbarui oleh staf non-teknis.
- **Puppeteer:** Menjalankan sesi browser di latar belakang.

## ⚙️ Cara Menjalankan Secara Lokal

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/USERNAME/NAMAREPO.git
   cd "Penjadwalan klinik gigi"
   ```

2. **Install semua dependensi:**
   ```bash
   npm install
   ```

3. **Atur file Environment (`.env`):**
   Buat file bernama `.env` di folder utama dan isi dengan kunci rahasia Anda:
   ```env
   SPREADSHEET_ID=masukkan_id_google_sheets_anda
   GOOGLE_API_KEY=masukkan_google_api_key_anda
   GROQ_API_KEY=masukkan_groq_api_key_anda
   ```

4. **Jalankan Aplikasi:**
   ```bash
   npm start
   ```

5. Buka terminal, sebuah QR Code akan muncul. Scan QR Code tersebut menggunakan aplikasi WhatsApp dari HP klinik Anda (via opsi Linked Devices/Perangkat Taut).
6. Selesai! Bot sekarang aktif dan siap membalas pesan.

## 👤 Struktur Database Google Sheets
Sistem ini membaca data dari `Sheet1` mulai dari sel `A2` hingga `D` dengan format kolom sebagai berikut:
| Nama Dokter | Hari     | Jam Mulai | Jam Selesai |
|-------------|----------|-----------|-------------|
| drg. Budi   | Senin    | 09:00     | 13:00       |
| drg. Andi   | Selasa   | 15:00     | 20:00       |

---
*Dibuat untuk keperluan Portofolio Web Development.*
