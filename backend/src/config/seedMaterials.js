/**
 * Seed materi contoh untuk pengujian RAG.
 * Jalankan: npm run seed
 */
const pool = require('./database');
const materialRepository = require('../repositories/materialRepository');
const { saveChunksForMaterial } = require('../services/materialService');

const SAMPLE_MATERIALS = [
  {
    title: 'Model OSI Layer',
    filename: 'osi-layer.txt',
    content: `Model OSI (Open Systems Interconnection) terdiri dari 7 layer yang bekerja berurutan untuk komunikasi data antar perangkat jaringan.

Layer 1 - Physical: Mengatur transmisi bit mentah melalui media fisik seperti kabel UTP, fiber optik, atau gelombang radio.
Layer 2 - Data Link: Mengatur pengiriman frame antar node yang terhubung langsung, termasuk alamat MAC dan deteksi error.
Layer 3 - Network: Mengatur routing paket antar jaringan berbeda menggunakan alamat IP.
Layer 4 - Transport: Menjamin pengiriman data end-to-end, contoh protokol TCP dan UDP.
Layer 5 - Session: Mengelola sesi komunikasi antar aplikasi.
Layer 6 - Presentation: Mengatur format, enkripsi, dan kompresi data.
Layer 7 - Application: Layer tempat aplikasi pengguna berinteraksi, seperti HTTP, FTP, dan DNS.

Mnemonik: "Please Do Not Throw Sausage Pizza Away"`,
  },
  {
    title: 'IP Address dan Subnetting',
    filename: 'ip-subnetting.txt',
    content: `IP Address adalah alamat numerik unik untuk setiap perangkat di jaringan TCP/IP.

IPv4 terdiri dari 32 bit, contoh: 192.168.1.10 dengan subnet mask 255.255.255.0 (/24).

Subnetting membagi network besar menjadi sub-network lebih kecil.
Rumus jumlah host = 2^(32 - prefix) - 2

Private IP ranges (RFC 1918):
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16`,
  },
  {
    title: 'DNS dan DHCP',
    filename: 'dns-dhcp.txt',
    content: `DNS (Domain Name System) menerjemahkan nama domain menjadi alamat IP.
Contoh: www.google.com → 142.250.190.78

Proses resolusi DNS melibatkan cache lokal, resolver, root DNS, TLD server, dan authoritative DNS.

DHCP (Dynamic Host Configuration Protocol) memberikan IP, subnet mask, gateway, dan DNS secara otomatis.
Proses DHCP: Discover, Offer, Request, Acknowledge (DORA).`,
  },
];

const seedMaterials = async () => {
  try {
    console.log('🔄 Menjalankan seed materi...');

    const existingCount = await materialRepository.countMaterials();
    if (existingCount > 0) {
      console.log(`ℹ️  Seed dilewati — sudah ada ${existingCount} materi di database.`);
      return;
    }

    for (const material of SAMPLE_MATERIALS) {
      const created = await materialRepository.createMaterial({
        title: material.title,
        filename: material.filename,
        filePath: null,
        fileType: material.filename?.endsWith('.pdf') ? 'pdf' : 'text',
        content: material.content,
      });
      const chunksCreated = await saveChunksForMaterial(created.id, material.content);
      console.log(`  ✅ Materi "${material.title}" (${chunksCreated} chunk)`);
    }

    console.log('✅ Seed materi selesai!');
  } catch (err) {
    console.error('❌ Seed materi gagal:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
};

seedMaterials()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
