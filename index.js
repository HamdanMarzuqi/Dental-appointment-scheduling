require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const axios = require('axios');

// ==========================================
// 1. FUNGSI MEMBACA DATA GOOGLE SHEETS
// ==========================================
async function ambilJadwalKlinik(namaDokter, hari) {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const apiKey = process.env.GOOGLE_API_KEY;
    const range = 'Sheet1!A2:D'; // Membaca Kolom A sampai D mulai baris 2
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const rows = response.data.values;

        if (!rows || rows.length === 0) return [];

        // Mapping data array mentah menjadi array of objects
        let jadwal = rows.map(row => ({
            nama_dokter: row[0],
            hari: row[1],
            jam_mulai: row[2],
            jam_selesai: row[3]
        }));

        // Filter Nama Dokter (jika pasien menyebutkan nama dokter)
        if (namaDokter) {
            jadwal = jadwal.filter(d => d.nama_dokter.toLowerCase().includes(namaDokter.toLowerCase()));
        }

        // Filter Hari (jika pasien menanyakan hari/tanggal tertentu)
        if (hari) {
            jadwal = jadwal.filter(d => d.hari.toLowerCase() === hari.toLowerCase());
        }

        return jadwal;
    } catch (error) {
        console.error('Error fetching Google Sheets:', error.message);
        return [];
    }
}

// ==========================================
// 2. LOGIKA KECERDASAN BUATAN (GROQ AI)
// ==========================================
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Deklarasi fungsi/tool dalam format OpenAI (digunakan oleh Groq)
const deklarasiToolSheets = [{
    type: 'function',
    function: {
        name: 'ambilJadwalKlinik',
        description: 'Mengambil data jadwal praktek dokter gigi berdasarkan nama dokter dan nama hari dari sistem klinik.',
        parameters: {
            type: 'object',
            properties: {
                namaDokter: { type: 'string', description: 'Nama dokter gigi yang dicari (opsional).' },
                hari: { type: 'string', description: 'Nama hari spesifik (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu) (opsional).' }
            },
            required: []
        }
    }
}];

async function dapatkanJawabanAI(pesanPasien) {
    // Mendapatkan context waktu lokal saat ini untuk disuntikkan ke AI
    const opsiWaktu = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const waktuSekarang = new Date().toLocaleDateString('id-ID', opsiWaktu);

    const messages = [
        {
            role: 'system',
            content: `Anda adalah Chatbot Asisten Resmi Klinik Dokter Gigi Dental Medical Care. Tugas Anda membantu pasien mengecek jadwal dokter. 
            Konteks Waktu Hari Ini: ${waktuSekarang}.
            
            ATURAN UTAMA:
            1. Jika pasien bertanya jadwal (contoh: besok siapa, tanggal sekian siapa, jam sekian siapa, drg X kapan), Anda WAJIB menggunakan fungsi 'ambilJadwalKlinik' untuk melihat data asli.
            2. Jika pasien menyebutkan tanggal (misal: tanggal 25), hitung tanggal tersebut jatuh pada hari apa berdasarkan Konteks Waktu Hari Ini, lalu panggil fungsi dengan parameter hari tersebut.
            3. Jika pasien bertanya jam tertentu (misal: jam 10 pagi ada siapa), panggil fungsi 'ambilJadwalKlinik' untuk hari yang dimaksud, lalu Anda saring sendiri dokter mana yang jam prakteknya mencakup jam yang ditanyakan pasien.
            4. Jangan pernah berasumsi atau mengarang jadwal sendiri jika data tidak ditemukan di database. Jawab dengan ramah dan sopan.`
        },
        {
            role: 'user',
            content: pesanPasien
        }
    ];

    // Kirim pesan ke Groq AI (Llama 3.3 70B)
    let result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        tools: deklarasiToolSheets,
        tool_choice: 'auto'
    });

    const responseMessage = result.choices[0].message;

    // Jika Groq memutuskan perlu melihat data Google Sheets
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];

        if (toolCall.function.name === 'ambilJadwalKlinik') {
            const args = JSON.parse(toolCall.function.arguments);
            const { namaDokter, hari } = args;

            // Ambil data dari Google Sheets secara real-time
            const dataDariSheets = await ambilJadwalKlinik(namaDokter, hari);

            // Kembalikan datanya ke Groq agar diolah menjadi kalimat yang rapi
            messages.push(responseMessage);
            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ data: dataDariSheets })
            });

            const responAkhir = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: messages
            });

            return responAkhir.choices[0].message.content;
        }
    }

    return responseMessage.content;
}

// ==========================================
// 3. INISIALISASI & CONFIG WHATSAPP CLIENT
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth(), // Menyimpan sesi login agar tidak bolak-balik scan QR
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
});

// Memunculkan QR Code di Terminal
client.on('qr', (qr) => {
    console.log('--- SILAHKAN SCAN QR CODE BERIKUT DENGAN WHATSAPP KLINIK ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Chatbot WhatsApp Klinik Gigi telah AKTIF dan Siap Melayani!');
});

// Menangkap setiap pesan masuk
client.on('message', async (msg) => {
    // Hindari merespon chat grup atau story/status WA
    if (msg.from.includes('@g.us') || msg.isStatus) return;

    try {
        console.log(`[Chat Masuk] ${msg.from}: ${msg.body}`);

        // Dapatkan respon cerdas dari kombinasi Groq AI & Google Sheets
        const balasanBot = await dapatkanJawabanAI(msg.body);

        // Balas pesan pasien
        await msg.reply(balasanBot);
    } catch (error) {
        console.error('Error saat membalas pesan:', error);
        await msg.reply('Mohon maaf, sistem sedang mengalami kendala teknis singkat. Sila hubungi beberapa saat lagi.');
    }
});

client.initialize();