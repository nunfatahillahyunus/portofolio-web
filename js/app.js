// ==========================================
// 1. VARIABEL GLOBAL & DATABASE
// ==========================================
let dataKatalogGlobal = [];
let dataProdukGlobal = []; 

const urlCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSr_Sh6mxIZFs_BdXP7zXCuEiU_FiuVcjrchMm5X8cPq8HXn2DZ2X2OQA_ObHxdVLer3dWwGdi5WVmq/pub?gid=1489445987&single=true&output=csv";
const urlCSVProduk = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSr_Sh6mxIZFs_BdXP7zXCuEiU_FiuVcjrchMm5X8cPq8HXn2DZ2X2OQA_ObHxdVLer3dWwGdi5WVmq/pub?gid=263400492&single=true&output=csv";
const URL_APPSHEET = "https://www.appsheet.com/start/8dcd40af-1089-4094-8890-7e286c51921a";

// ==========================================
// 2. DETEKSI PARAMETER URL
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const kategoriAktif = urlParams.get('jenis'); 
const tokoBukaOtomatis = urlParams.get('toko'); // Menangkap perintah buka popup dari Peta

document.addEventListener("DOMContentLoaded", () => {
    if (kategoriAktif) {
        document.getElementById("judul-kategori").innerText = "Kategori: " + kategoriAktif;
        document.getElementById("deskripsi-kategori").innerText = "Menampilkan etalase warga yang menyediakan " + kategoriAktif + ".";
        document.title = kategoriAktif + " - Lapak Desa Talumae";
    }
});

function formatGambarDrive(urlDrive) {
    if (!urlDrive) return "https://via.placeholder.com/400x300?text=Tidak+Ada+Foto";
    const match = urlDrive.match(/([-\w]{25,})/);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    return urlDrive;
}

// ==========================================
// 3. MESIN PENARIKAN DATA GANDA
// ==========================================
Papa.parse(urlCSV, {
    download: true,
    header: true,
    complete: function(resultsToko) {
        Papa.parse(urlCSVProduk, {
            download: true,
            header: true,
            complete: function(resultsProduk) {
                try {
                    let dataMentahToko = resultsToko.data;
                    dataProdukGlobal = resultsProduk.data;
                    
                    if (kategoriAktif) {
                        dataKatalogGlobal = dataMentahToko.filter(toko => {
                            const kategoriMentah = toko["Kategori Produk"];
                            if (!kategoriMentah) return false;
                            return kategoriMentah.toLowerCase().includes(kategoriAktif.trim().toLowerCase());
                        });
                    } else {
                        dataKatalogGlobal = dataMentahToko;
                    }
                    
                    if (!dataKatalogGlobal || dataKatalogGlobal.length === 0) {
                        document.getElementById("status-loading").innerText = "Belum ada lapak/toko untuk kategori ini.";
                        document.getElementById("status-loading").classList.remove("animate-pulse");
                        return;
                    }
                    
                    document.getElementById("status-loading").classList.add("hidden");
                    document.getElementById("wadah-katalog").classList.remove("hidden");
                    
                    renderKatalog(dataKatalogGlobal);

                    // --- FITUR AUTO-OPEN POPUP DARI PETA ---
                    if (tokoBukaOtomatis) {
                        // Ubah teks yang dicari menjadi huruf kecil semua dan hapus spasi berlebih
                        const targetToko = tokoBukaOtomatis.trim().toLowerCase(); 
                        
                        const indexToko = dataKatalogGlobal.findIndex(t => {
                            const kode = (t["Kode Unik Toko"] || "").trim().toLowerCase();
                            const nama = (t["Nama Toko"] || "").trim().toLowerCase();
                            return kode === targetToko || nama === targetToko;
                        });
                        
                        if (indexToko !== -1) {
                            setTimeout(() => {
                                bukaPopup(indexToko);
                            }, 500); // Jeda transisi dinaikkan sedikit agar aman saat dirender di HP
                        } else {
                            console.warn("Gagal membuka popup otomatis untuk:", tokoBukaOtomatis);
                        }
                    }
                    // ----------------------------------------

                } catch (error) {
                    munculkanError("Error memproses data.");
                }
            },
            error: function() { munculkanError("Gagal mengunduh data Produk."); }
        });
    },
    error: function() { munculkanError("Gagal mengunduh data Toko."); }
});

function munculkanError(pesan) {
    document.getElementById("status-loading").innerText = pesan;
    document.getElementById("status-loading").classList.remove("animate-pulse");
}

// ==========================================
// 4. FUNGSI MERAKIT KARTU KATALOG
// ==========================================
function renderKatalog(data) {
    const wadah = document.getElementById("wadah-katalog");
    let elemenHTML = "";

    data.forEach((toko, index) => {
        if(!toko["Nama Toko"]) return; 

        const namaToko = toko["Nama Toko"];
        const kategori = toko["Kategori Produk"];
        const deskripsiSingkat = toko["Deskripsi Singkat Toko"];
        const fotoSiapRender = formatGambarDrive(toko["Perwakilan Foto Produk / Etalase"]);
        const kodeUnikToko = toko["Kode Unik Toko"];
        
        let produkTokoIni = dataProdukGlobal.filter(p => p["Kode Unik Toko"] === kodeUnikToko);
        
        if (kategoriAktif) {
            produkTokoIni = produkTokoIni.filter(p => {
                const katProd = p["Kategori Produk"];
                if (!katProd) return false;
                return katProd.toLowerCase().includes(kategoriAktif.trim().toLowerCase());
            });
        }

        let arrayHarga = [];
        produkTokoIni.forEach(p => {
            let nominal = parseFloat(p["Harga (Rp)"]);
            if (!isNaN(nominal) && nominal > 0) arrayHarga.push(nominal);
        });

        let teksHarga = "Belum ada produk";
        let labelHarga = "Harga";

        if (arrayHarga.length > 0) {
            let hargaMin = Math.min(...arrayHarga);
            let hargaMax = Math.max(...arrayHarga);
            
            if (hargaMin === hargaMax) {
                teksHarga = "Rp " + hargaMin.toLocaleString('id-ID');
            } else {
                teksHarga = "Rp " + hargaMin.toLocaleString('id-ID') + " - Rp " + hargaMax.toLocaleString('id-ID');
                labelHarga = "Rentang Harga";
            }
        }

        elemenHTML += `
            <div class="kartu-toko bg-white rounded-lg shadow-md overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                <img src="${fotoSiapRender}" alt="${namaToko}" class="gambar-etalase w-full h-48 object-cover">
                <div class="p-5 flex-grow flex flex-col bg-white relative z-10">
                    <span class="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">LAPAK / TOKO</span>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">${namaToko}</h3>
                    <p class="text-xs text-gray-500 mb-3 leading-relaxed">${kategori || ''}</p>
                    <p class="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">${deskripsiSingkat}</p>
                    <div class="mb-4">
                        <span class="text-sm text-gray-500">${labelHarga}</span><br>
                        <span class="text-lg font-bold text-green-700">${teksHarga}</span>
                    </div>
                    <button onclick="bukaPopup(${index})" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                        Lihat Menu & Detail
                    </button>
                </div>
            </div>
        `;
    });

    wadah.innerHTML = elemenHTML;
}

// ==========================================
// 5. FUNGSI BUKA POPUP (MODAL)
// ==========================================
function bukaPopup(index) {
    const toko = dataKatalogGlobal[index];
    if (!toko) return;

    document.getElementById('modal-nama').innerText = toko["Nama Toko"];
    document.getElementById('modal-kategori').innerText = toko["Kategori Produk"] || '';
    document.getElementById('modal-deskripsi').innerText = toko["Deskripsi Singkat Toko"];
    document.getElementById('modal-foto').src = formatGambarDrive(toko["Perwakilan Foto Produk / Etalase"]);

    const kodeUnikToko = toko["Kode Unik Toko"];
    
    const produkTokoIni = dataProdukGlobal.filter(p => {
        const matchKode = p["Kode Unik Toko"] === kodeUnikToko;
        if (!matchKode) return false;

        if (kategoriAktif) {
            const katProd = p["Kategori Produk"];
            if (!katProd) return false;
            return katProd.toLowerCase().includes(kategoriAktif.trim().toLowerCase());
        }
        return true; 
    });

    let htmlTabel = `
        <div class="overflow-x-auto rounded-lg">
            <table class="w-full text-sm text-left text-gray-600">
                <thead class="text-xs text-gray-700 uppercase bg-green-50 border-b-2 border-green-200">
                    <tr>
                        <th scope="col" class="px-4 py-3 font-bold rounded-tl-lg">Nama Produk</th>
                        <th scope="col" class="px-4 py-3 font-bold text-right rounded-tr-lg">Harga (Rp)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let arrayHarga = [];

    if (produkTokoIni.length > 0) {
        produkTokoIni.forEach((p, i) => {
            const bgColor = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            let nominalAngka = parseFloat(p["Harga (Rp)"]);
            let hargaTampil = nominalAngka ? nominalAngka.toLocaleString('id-ID') : "0";
            
            if (nominalAngka > 0) arrayHarga.push(nominalAngka);

            htmlTabel += `
                <tr class="${bgColor} border-b hover:bg-green-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-gray-900">${p["Nama Produk"] || '-'}</td>
                    <td class="px-4 py-3 text-right text-green-700 font-semibold">${hargaTampil}</td>
                </tr>
            `;
        });
    } else {
        htmlTabel += `
            <tr class="bg-white">
                <td colspan="2" class="px-4 py-6 text-center text-gray-500 italic">Belum ada produk yang diunggah untuk kategori ini.</td>
            </tr>
        `;
    }

    htmlTabel += `</tbody></table></div>`;
    document.getElementById('modal-list-barang').innerHTML = htmlTabel;
    
    let teksHargaModal = "Rp 0";
    let teksLabelModal = "Harga";
    
    if (arrayHarga.length > 0) {
        let hargaMin = Math.min(...arrayHarga);
        let hargaMax = Math.max(...arrayHarga);
        
        if (hargaMin === hargaMax) {
            teksHargaModal = "Rp " + hargaMin.toLocaleString('id-ID');
        } else {
            teksHargaModal = "Rp " + hargaMin.toLocaleString('id-ID') + " - Rp " + hargaMax.toLocaleString('id-ID');
            teksLabelModal = "Rentang Harga:";
        }
    }
    
    document.getElementById('modal-harga').innerText = teksHargaModal;
    if (document.getElementById('modal-label-harga')) {
        document.getElementById('modal-label-harga').innerText = teksLabelModal;
    }

    const namaAman = toko["Nama Toko"].replace(/'/g, "\\'"); 
    const nomorWA = toko["Nomor Whatsapp (62)"];
    document.getElementById('btn-modal-wa').setAttribute('onclick', `prosesBeli('${nomorWA}', '${namaAman}')`);

    const modal = document.getElementById('modal-detail');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.children[0].classList.remove('scale-95');
        modal.children[0].classList.add('scale-100');
    }, 10);
}

// ==========================================
// 6. FUNGSI TUTUP POPUP
// ==========================================
function tutupPopup() {
    const modal = document.getElementById('modal-detail');
    modal.classList.add('opacity-0');
    modal.children[0].classList.remove('scale-100');
    modal.children[0].classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('modal-foto').src = ""; 
    }, 300); 
}

// ==========================================
// 7. TRANSAKSI WHATSAPP
// ==========================================
function prosesBeli(nomorWA, namaToko) {
    if (!nomorWA || nomorWA === 'undefined') {
        alert("Maaf, penjual ini belum mencantumkan nomor WhatsApp.");
        return;
    }
    const nomorBersih = nomorWA.replace(/[^0-9]/g, ''); 
    const pesan = `Halo, saya melihat informasi dari website Lapak Desa Talumae. Saya tertarik dengan barang yang dijual di etalase *${namaToko}*. Apakah bisa dibantu informasi pemesanannya?`;
    const urlWA = `https://wa.me/${nomorBersih}?text=${encodeURIComponent(pesan)}`;
    window.open(urlWA, "_blank");
}

// ==========================================
// 8. SISTEM SLIDER MENU & LOGIN APPSHEET
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
}

function bukaModalKodeUnik() {
    document.getElementById('sidebarMenu').classList.add('-translate-x-full'); 
    const modal = document.getElementById('modalKodeUnik');
    if(!modal) return; 
    
    document.getElementById('inputKodeUnik').value = "";
    document.getElementById('pesanErrorKode').classList.add('hidden');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.children[0].classList.remove('scale-95');
    }, 10);
}

function tutupModalKodeUnik() {
    const modal = document.getElementById('modalKodeUnik');
    if(!modal) return;
    
    modal.classList.add('opacity-0');
    modal.children[0].classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function validasiDanBukaAppSheet() {
    const inputKode = document.getElementById('inputKodeUnik').value.trim();
    const pesanError = document.getElementById('pesanErrorKode');
    const btnValidasi = document.getElementById('btnValidasi');

    if (!inputKode) {
        pesanError.innerText = "Kode unik tidak boleh kosong!";
        pesanError.classList.remove('hidden');
        return;
    }

    btnValidasi.innerText = "Mengecek...";
    btnValidasi.disabled = true;

    Papa.parse(urlCSV, {
        download: true,
        header: true,
        complete: function(results) {
            const isValid = results.data.some(toko => {
                const kode = toko["Kode Unik Toko"];
                return kode && (kode.trim().toLowerCase() === inputKode.toLowerCase());
            });

            if (isValid) {
                pesanError.classList.add('hidden');
                const urlTujuan = `${URL_APPSHEET}&defaults=%7B%22Kode%20Unik%22%3A%22${inputKode.toUpperCase()}%22%7D`;
                window.open(urlTujuan, "_blank");
                tutupModalKodeUnik();
            } else {
                pesanError.innerText = "Maaf, Kode Unik Anda tidak terdaftar!";
                pesanError.classList.remove('hidden');
            }
            btnValidasi.innerText = "Validasi & Masuk";
            btnValidasi.disabled = false;
        },
        error: function(error) {
            pesanError.innerText = "Terjadi kesalahan membaca data.";
            pesanError.classList.remove('hidden');
            btnValidasi.innerText = "Validasi & Masuk";
            btnValidasi.disabled = false;
        }
    });
}
