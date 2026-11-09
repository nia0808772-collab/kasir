// 1. Impor module yang diperlukan dari firebase dan firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
    getFirestore,
    onSnapshot,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import QRCode from "https://esm.sh/qrcode@1.5.3"

// 2. Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6I1Tvw61wzc6-2MVmcWXfZ17IwDYj7u4",
    authDomain: "rpl25-b6db4.firebaseapp.com",
    projectId: "rpl25-b6db4",
    storageBucket: "rpl25-b6db4.firebasestorage.app",
    messagingSenderId: "643920833293",
    appId: "1:643920833293:web:f5ac7fdc746e4e410d5e44"
}

// 3. Inisialisasi Firebase dan Firestore
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Kondisi/state aplikasi kasir
let totalHarga = 0
let trxIdSekarang = ""
let unsubscribeListener = null

 // FUNGSI SPEECH SYNTHESIS
function suaraPembayaranBerhasil(nominal) {

    if (!("speechSynthesis" in window)) {
        console.log("Browser tidak mendukung Speech Synthesis")
        return
    }

    // Hentikan suara sebelumnya
    window.speechSynthesis.cancel()

    const nominalRupiah = new Intl.NumberFormat("id-ID").format(nominal)

    const ucapan = new SpeechSynthesisUtterance(
        `Pembayaran berhasil! Uang sebesar ${nominalRupiah} rupiah telah diterima. Terima kasih sudah berbelanja di Kasir Cemerlang!`
    )

    // Pengaturan suara
    ucapan.lang = "id-ID"
    ucapan.rate = 0.9
    ucapan.pitch = 1
    ucapan.volume = 1

    window.speechSynthesis.speak(ucapan)
}

// Fungsi tambah item ke keranjang
window.tambahKeKeranjang = function (nama, harga) {
    // update total harga
    totalHarga += harga
    document.getElementById('total-harga').innerText = `Rp. ${totalHarga}`

    // mengaktifkan tombol qr
    document.getElementById('btn-bayar').disabled = false
}

// Fungsi reset keranjang
window.resetKeranjang = function () {
    totalHarga = 0
    document.getElementById('total-harga').innerText = 'Rp. 0'
    document.getElementById('btn-bayar').disabled = true
    document.getElementById('qr-section').classList.add('hidden')
}

// Fungsi membuat ID transaksi dan QR Code
window.buatTransaksiQR = async function () {
    // mencegah transaksi 0 rupiah
    if (totalHarga === 0) return

    // buat identitas transaksi unik
    trxIdSekarang = "TRX-" + Math.floor(1000 + Math.random() * 9000)

    // tampilkan identitas transaksi
    document.getElementById('tx-id-display').innerText = trxIdSekarang
    // tampilkan qr-section (membuang class hidden)
    document.getElementById('qr-section').classList.remove('hidden')

    // reset tampilan status QR
    const statusBox = document.getElementById('status-box')
    statusBox.className = "status-box status-pending"
    document.getElementById('status-teks').innerText = "Menunggu scan..."

    // membuat qrcode jelas terlihat
    document.getElementById('qr-canvas').style.opacity = 1

    // render QR Code ke canvas
    const elemenCanvas = document.getElementById('qr-canvas')
    try {
        await QRCode.toCanvas(elemenCanvas, trxIdSekarang, {
            width: 140,
            margin: 1
        })
    } catch (error) {
        console.log("Gagal membuat QR")
    }

    // simpan dokumen transaksi ke firestore
    const refTrx = doc(db, "transaksi", trxIdSekarang)
    try {
        await setDoc(refTrx, {
            total: totalHarga,
            status: 'takterbayar',
            waktuBuat: Date.now()
        })
    } catch (error) {
        console.log("Gagal menyimpan transaksi ke firestore")
    }

    listenStatusPembayaran(trxIdSekarang)
}

// Fungsi listener status pembayaran di firestore
function listenStatusPembayaran(trxId) {
    const refTrx = doc(db, "transaksi", trxId)

    const unsubscribeListener = onSnapshot(
        refTrx,
        (docSnapshot) => {
            if (docSnapshot.exists() && docSnapshot.data().status == 'terbayar') {
                // tampilkan efek lunas
                document.getElementById('status-box').className = "status-box status-success"
                document.getElementById('status-teks').innerText = "🎉 LUNAS"
                document.getElementById('qr-canvas').style.opacity = "0.2"

                unsubscribeListener()
            }
        }
    )
}

