require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const axios = require('axios');

// ==========================================
// 1. FUNGSI MEMBACA DATA GOOGLE SHEETS
// ==========================================
function parseJam(str) {
    str = str.replace(/\./g, ':').trim();
    const parts = str.split(':');
    if (parts.length < 2) return NaN;
    const jam = parseInt(parts[0], 10);
    const menit = parseInt(parts[1], 10);
    return (isNaN(jam) || isNaN(menit)) ? NaN : jam * 60 + menit;
}

function bersihkanNama(nama) {
    return nama.toLowerCase().replace(/^(drg?\.?\s*|dokter\s+|pak\s+|bu\s+)/i, '').trim();
}

async function ambilJadwalKlinik(namaDokter, hari, jam) {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const apiKey = process.env.GOOGLE_API_KEY;
    const range = 'Sheet1!A2:D';
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range + '?key=' + apiKey;

    try {
        const response = await axios.get(url);
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        let jadwal = rows.map(function(row) {
            return {
                nama_dokter: row[0],
                hari: row[1],
                jam_mulai: row[2],
                jam_selesai: row[3]
            };
        });

        if (namaDokter) {
            var nb = bersihkanNama(namaDokter);
            jadwal = jadwal.filter(function(d) {
                var db = bersihkanNama(d.nama_dokter);
                return db.includes(nb) || nb.includes(db);
            });
        }

        if (hari) {
            jadwal = jadwal.filter(function(d) {
                return d.hari.toLowerCase() === hari.toLowerCase();
            });
        }

        if (jam) {
            var jamTanya = parseJam(jam);
            if (!isNaN(jamTanya)) {
                jadwal = jadwal.filter(function(d) {
                    var mulai = parseJam(d.jam_mulai);
                    var selesai = parseJam(d.jam_selesai);
                    return !isNaN(mulai) && !isNaN(selesai) && jamTanya >= mulai && jamTanya < selesai;
                });
            }
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

var deklarasiToolSheets = [{
    type: 'function',
    function: {
        name: 'ambilJadwalKlinik',
        description: 'Ambil data jadwal praktek dokter gigi.',
        parameters: {
            type: 'object',
            properties: {
                namaDokter: { type: 'string', description: 'Nama dokter (opsional).' },
                hari: { type: 'string', description: 'Nama hari (Senin-Sabtu) (opsional).' },
                jam: { type: 'string', description: 'Jam format HH:MM (opsional).' }
            },
            required: []
        }
    }
}];

var riwayatChat = {};
var MAX_RIWAYAT = 5;

function getCell(id) {
    if (!riwayatChat[id]) riwayatChat[id] = [];
    return riwayatChat[id];
}

async function dapatkanJawabanAI(pesanPasien, nomorPengirim) {
    var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    var now = new Date();
    var todayName = days[now.getDay()];
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowName = days[tomorrow.getDay()];
    var opsiWaktu = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    var waktuSekarang = now.toLocaleDateString('id-ID', opsiWaktu);

    // Simpan pesan pasien ke riwayat
    var riwayat = getCell(nomorPengirim);
    riwayat.push({ role: 'user', content: pesanPasien });
    if (riwayat.length > MAX_RIWAYAT) riwayat.shift();

    var systemPrompt = "Anda adalah Asisten Klinik Dokter Gigi Dental Medical Care. "
        + "Bantu pasien cek jadwal dokter dari data real-time. "
        + "Hari ini " + todayName + ", besok " + tomorrowName + ". "
        + "Tanggal: " + waktuSekarang + ". "
        + "ATURAN: "
        + "1. Jika pasien tanya jadwal, WAJIB cek data dulu sebelum jawab. "
        + "2. JANGAN sebut istilah teknis (fungsi, database, API, dll) ke pasien. "
        + "3. Jam: 1 siang=13:00, 12 siang=12:00, 12 malam=00:00. "
        + "4. Jika tidak ada, bilang sopan. "
        + "5. Bahasa Indonesia ramah alami.";

    var messages = [{ role: 'system', content: systemPrompt }];

    // Inject riwayat
    for (var i = 0; i < riwayat.length; i++) {
        messages.push(riwayat[i]);
    }

    // ---- EKSTRAKSI PARAMETER (FULL PARSER) ----
    var hariDipilih = null;
    var pesanLower = pesanPasien.toLowerCase();

    // Daftar hari
    var namaHari = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];

    // Cari hari yang disebut di pesan
    var hariSebut = null;
    for (var hi = 0; hi < namaHari.length; hi++) {
        if (pesanLower.includes(namaHari[hi])) {
            hariSebut = namaHari[hi]; // ambil nama Indonesia dengan huruf kecil
            break;
        }
    }

    // Logika penentuan hari
    if (hariSebut) {
        hariDipilih = hariSebut.charAt(0).toUpperCase() + hariSebut.slice(1);
    } else if (pesanLower.includes('besok') || pesanLower.includes('bsk')) {
        hariDipilih = tomorrowName;
    } else if (pesanLower.includes('hari ini') || pesanLower.includes('sekarang')) {
        hariDipilih = todayName;
    }

    // Deteksi MULTI-HARI: kumpulkan semua hari yang disebut di pesan
    var hariDalamPesan = [];
    for (var hi2 = 0; hi2 < namaHari.length; hi2++) {
        if (pesanLower.includes(namaHari[hi2])) {
            var namaCap = namaHari[hi2].charAt(0).toUpperCase() + namaHari[hi2].slice(1);
            if (hariDalamPesan.indexOf(namaCap) === -1) hariDalamPesan.push(namaCap);
        }
    }

    var namaDokterEkstrak = null;
    var hariEkstrak = null;
    var jamEkstrak = null;

    var kataKunci = ['jadwal','jaga','praktek','dokter','drg','dr.','standby','siapa'];
    var perluCek = false;
    for (var k = 0; k < kataKunci.length; k++) {
        if (pesanLower.includes(kataKunci[k])) { perluCek = true; break; }
    }

    if (perluCek) {
        try {
            var ekstrak = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'user',
                    content: 'Ekstrak JSON dari: "' + pesanPasien + '". Format: {"namaDokter":"...","hari":"...","jam":"..."}. null jika tidak ada.'
                }],
                response_format: { type: 'json_object' }
            });
            var parsed = JSON.parse(ekstrak.choices[0].message.content);
            namaDokterEkstrak = parsed.namaDokter || null;
            hariEkstrak = parsed.hari || null;
            jamEkstrak = parsed.jam || null;
        } catch (e) {
            // fallback
        }
    }

    if (hariDipilih && !hariEkstrak) hariEkstrak = hariDipilih;

    // PAKSA: override hariEkstrak kalau JS sudah deteksi "besok"/"hari ini"
    // Biar AI extraction yang salah nggak nimpa
    if (hariDipilih) {
        hariEkstrak = hariDipilih;
    }

    // ---- PANGGIL FUNGSI LANGSUNG (kalau ada parameter) ----
    if (namaDokterEkstrak || hariDalamPesan.length > 0 || hariEkstrak || jamEkstrak || hariDipilih) {
        for (var c = 0; c < 3; c++) {
            try {
                var data;
                if (hariDalamPesan.length > 1) {
                    // Multi-hari: ambil data untuk SEMUA hari
                    data = [];
                    for (var h = 0; h < hariDalamPesan.length; h++) {
                        var dh = await ambilJadwalKlinik(namaDokterEkstrak, hariDalamPesan[h], jamEkstrak);
                        data = data.concat(dh);
                    }
                } else {
                    data = await ambilJadwalKlinik(namaDokterEkstrak, (hariEkstrak || hariDipilih), jamEkstrak);
                }
                var prompt = "Pertanyaan pasien: \"" + pesanPasien + "\". Data jadwal klinik: " + JSON.stringify(data) + ". Jawab dengan ramah berdasarkan data. Jika kosong, bilang tidak ada jadwal yang cocok.";
                var jawab = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
                });
                var balasan = jawab.choices[0].message.content;
                riwayat.push({ role: 'assistant', content: balasan });
                if (riwayat.length > MAX_RIWAYAT) riwayat.shift();
                return balasan;
            } catch (e) {
                if (c === 2) { riwayat = []; return 'Maaf, sistem sibuk. Coba lagi.'; }
                await new Promise(function(r) { setTimeout(r, 1000); });
            }
        }
    }

    // ---- FALLBACK: tool calling original ----
    var result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        tools: deklarasiToolSheets,
        tool_choice: 'auto'
    });

    var responseMessage = result.choices[0].message;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        var toolCall = responseMessage.tool_calls[0];
        if (toolCall.function.name === 'ambilJadwalKlinik') {
            var args = JSON.parse(toolCall.function.arguments);
            var dataDariSheets;
            for (var c2 = 0; c2 < 3; c2++) {
                try {
                    dataDariSheets = await ambilJadwalKlinik(args.namaDokter, args.hari, args.jam);
                    break;
                } catch (e) {
                    if (c2 === 2) { riwayat = []; return 'Maaf, sistem sibuk. Coba lagi.'; }
                    await new Promise(function(r) { setTimeout(r, 1000); });
                }
            }

            messages.push(responseMessage);
            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ data: dataDariSheets })
            });

            var responAkhir = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: messages
            });
            var balas = responAkhir.choices[0].message.content;
            riwayat.push({ role: 'assistant', content: balas });
            if (riwayat.length > MAX_RIWAYAT) riwayat.shift();
            return balas;
        }
    }

    var konten = responseMessage.content;
    if (konten) {
        riwayat.push({ role: 'assistant', content: konten });
        if (riwayat.length > MAX_RIWAYAT) riwayat.shift();
    }
    return konten;
}

// ==========================================
// 3. INISIALISASI & CONFIG WHATSAPP CLIENT
// ==========================================
var puppeteerOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
};

if (process.platform === 'win32') {
    puppeteerOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
} else {
    puppeteerOptions.executablePath = '/usr/bin/google-chrome-stable';
}

var client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions
});

client.on('qr', function(qr) {
    console.log('--- SCAN QR CODE BERIKUT DENGAN WHATSAPP KLINIK ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', function() {
    console.log('Chatbot WhatsApp Klinik Gigi telah AKTIF dan Siap Melayani!');
});

client.on('message', async function(msg) {
    if (msg.from.includes('@g.us') || msg.isStatus) return;
    try {
        console.log('[Chat Masuk] ' + msg.from + ': ' + msg.body);
        var balasanBot = await dapatkanJawabanAI(msg.body, msg.from);
        await msg.reply(balasanBot);
    } catch (error) {
        console.error('Error:', error);
        await msg.reply('Mohon maaf, sistem sedang mengalami kendala teknis. Silakan hubungi lagi.');
    }
});

client.initialize();
