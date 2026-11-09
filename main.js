
// 1. Impor module yang diperlukan dari firebase dan firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
    getFirestore,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import { Html5QrcodeScanner } from "https://esm.sh/html5-qrcode@2.3.8"

// 2. Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6I1Tvw61wzc6-2MVmcWXfZ17IwDYj7u4",
    authDomain: "rpl25-b6db4.firebaseapp.com",
    projectId: "rpl25-b6db4",
    storageBucket: "rpl25-b6db4.firebasestorage.app",
    messagingSenderId: "643920833293",
    appId: "1:643920833293:web:f5ac7fdc746e4e410d5e44"
}

// 3. INISIALISASI FIREBASE
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)


// 4. STATE APLIKASI
let totalHarga = 0
let trxIdSekarang = ""
let unsubscribeListener = null
let transaksiTerakhirDiumumkan = ""


// 5. FUNGSI SPEECH SYNTHESIS
function suaraPembayaranBerhasil(nominal) {

    if (!("speechSynthesis" in window)) {
        console.log("Browser tidak mendukung Speech Synthesis")
        return
    }

    // Hentikan suara sebelumnya
    window.speechSynthesis.cancel()

    const nominalRupiah = new Intl.NumberFormat("id-ID").format(nominal)

    const ucapan = new SpeechSynthesisUtterance(
        `Pembayaran masuk! Uang sebesar ${nominalRupiah} rupiah telah diterima. Terima kasih sudah berbelanja`
    )

    // Pengaturan suara
    ucapan.lang = "id-ID"
    ucapan.rate = 0.9
    ucapan.pitch = 1
    ucapan.volume = 1

    window.speechSynthesis.speak(ucapan)
}


// 6. FUNGSI TAMBAH MENU
window.tambahKeKeranjang = function(nama, harga) {

    totalHarga += harga

    document.getElementById("total-harga").innerText =
        `Rp. ${totalHarga.toLocaleString("id-ID")}`

    document.getElementById("btn-bayar").disabled = false
}


// 7. FUNGSI RESET KERANJANG
window.resetKeranjang = function() {

    totalHarga = 0

    // Hentikan listener sebelumnya
    if (unsubscribeListener) {
        unsubscribeListener()
        unsubscribeListener = null
    }

    document.getElementById("total-harga").innerText = "Rp. 0"

    document.getElementById("btn-bayar").disabled = true

    document.getElementById("qr-section").classList.add("hidden")

    // Hentikan suara yang sedang berjalan
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
    }
}


// 8. MEMBUAT TRANSAKSI QR
window.buatTransaksiQR = async function() {

    if (totalHarga === 0) return

    // Hentikan listener transaksi sebelumnya
    if (unsubscribeListener) {
        unsubscribeListener()
        unsubscribeListener = null
    }

    // Simpan nominal transaksi
    const nominalTransaksi = totalHarga

    // Buat ID transaksi
    trxIdSekarang = "TRX-" + Math.floor(1000 + Math.random() * 9000)

    // Tampilkan ID
    document.getElementById("tx-id-display").innerText = trxIdSekarang

    document.getElementById("qr-section").classList.remove("hidden")

    // Status awal
    const statusBox = document.getElementById("status-box")

    statusBox.className = "status-box status-pending"

    document.getElementById("status-teks").innerText =
        "Menunggu scan..."

    document.getElementById("qr-canvas").style.opacity = 1

    // Membuat QR Code
    const elemenCanvas = document.getElementById("qr-canvas")

    try {

        await QRCode.toCanvas(elemenCanvas, trxIdSekarang, {
            width: 140,
            margin: 1
        })

    } catch (error) {

        console.error("Gagal membuat QR:", error)
        return
    }

    // Simpan transaksi ke Firestore
    const refTrx = doc(db, "transaksi", trxIdSekarang)

    try {

        await setDoc(refTrx, {
            total: nominalTransaksi,
            status: "takterbayar",
            waktuBuat: Date.now()
        })

    } catch (error) {

        console.error("Gagal menyimpan transaksi:", error)
        return
    }

    // Pantau status pembayaran
    listenStatusPembayaran(trxIdSekarang, nominalTransaksi)
}


// 9. LISTENER STATUS PEMBAYARAN
function listenStatusPembayaran(trxId, nominal) {

    const refTrx = doc(db, "transaksi", trxId)

    unsubscribeListener = onSnapshot(
        refTrx,

        (docSnapshot) => {

            if (!docSnapshot.exists()) return

            const data = docSnapshot.data()

            // CEK PEMBAYARAN BERHASIL
            if (
                data.status === "terbayar" &&
                trxId !== transaksiTerakhirDiumumkan
            ) {

                // Tandai transaksi sudah diumumkan
                transaksiTerakhirDiumumkan = trxId

                // Tampilkan status lunas
                document.getElementById("status-box").className =
                    "status-box status-success"

                document.getElementById("status-teks").innerText =
                    "🎉 PEMBAYARAN BERHASIL!"

                document.getElementById("qr-canvas").style.opacity = "0.2"

                // PUTAR SUARA PEMBAYARAN
                suaraPembayaranBerhasil(nominal)

                console.log("Pembayaran berhasil:", trxId)

                // Hentikan listener
                if (unsubscribeListener) {
                    unsubscribeListener()
                    unsubscribeListener = null
                }
            }
        },

        (error) => {
            console.error("Gagal memantau pembayaran:", error)
        }
    )
}
