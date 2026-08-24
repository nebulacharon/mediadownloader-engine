/**
 * Shopee Video Downloader - Production Flow Logic
 */

// Ganti dengan link affiliate target Anda
const AFFILIATE_LINK = "https://s.shopee.co.id/your_affiliate_id";

// State Session: Reset setiap kali halaman direfresh / reset dipencet
let isAffiliateTriggered = false;
let currentVideoData = {
  title: "",
  videoUrl: null
};

// DOM Elements
const inputCard = document.getElementById("input-card");
const resultCard = document.getElementById("result-card");
const extractorForm = document.getElementById("extractor-form");
const shopeeUrlInput = document.getElementById("shopee-url");
const btnClear = document.getElementById("btn-clear");
const btnPaste = document.getElementById("btn-paste");
const btnExtract = document.getElementById("btn-extract");
const statusMsg = document.getElementById("status-message");
const productTitle = document.getElementById("product-title");
const videoPlayer = document.getElementById("video-player");
const btnDownloadVideo = document.getElementById("btn-download-video");
const btnResetFlow = document.getElementById("btn-reset-flow");

// 1. Logika Trigger Affiliate (1 Kali Per-Sesi Kerja / Reset)
function triggerAffiliateSession() {
  if (!isAffiliateTriggered) {
    isAffiliateTriggered = true;
    window.open(AFFILIATE_LINK, "_blank", "noopener,noreferrer");
  }
}

// 2. Kontrol Tombol Clear (✕) & Input Listeners
shopeeUrlInput.addEventListener("input", () => {
  btnClear.style.display = shopeeUrlInput.value.trim() ? "flex" : "none";
});

btnClear.addEventListener("click", () => {
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  shopeeUrlInput.focus();
});

// 3. Tombol Tempel (Paste Clipboard)
btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    shopeeUrlInput.value = text.trim();
    btnClear.style.display = text.trim() ? "flex" : "none";
    showStatus("Tautan berhasil ditempel!", "success");
  } catch {
    shopeeUrlInput.focus();
    showStatus("Silakan tempel (Paste) link secara manual.", "error");
  }
});

// 4. Form Submit & Extraction
extractorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = shopeeUrlInput.value.trim();

  if (!rawUrl) {
    showStatus("Harap masukkan tautan video terlebih dahulu.", "error");
    return;
  }

  setLoading(true);
  hideStatus();

  try {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: rawUrl })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || "Gagal mengurai video.");
    }

    const item = result.data?.item;
    const videoUrl = item?.video_info_list?.[0]?.default_format?.url;

    if (!videoUrl) {
      throw new Error("Video tidak ditemukan pada tautan ini.");
    }

    currentVideoData = {
      title: item.name || "Shopee_Video_HD",
      videoUrl: videoUrl
    };

    // Tampilkan Hasil & Collapse Input Form
    renderResultCard();

  } catch (err) {
    showStatus(err.message || "Terjadi kesalahan koneksi.", "error");
  } finally {
    setLoading(false);
  }
});

// 5. Render & UI Transitions
function renderResultCard() {
  productTitle.textContent = currentVideoData.title;
  videoPlayer.src = currentVideoData.videoUrl;
  
  // Sembunyikan form input dan tampilkan card hasil
  inputCard.style.display = "none";
  resultCard.style.display = "block";

  btnDownloadVideo.onclick = () => {
    downloadVideoFile(currentVideoData.videoUrl, `${sanitizeFilename(currentVideoData.title)}.mp4`);
  };
}

// 6. Download Functionality + Affiliate Trigger
async function downloadVideoFile(url, filename) {
  triggerAffiliateSession();

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// 7. Reset / Mulai Unduh Video Baru
btnResetFlow.addEventListener("click", () => {
  // Reset Form
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  videoPlayer.src = "";
  
  // Reset Affiliate Session agar sesi baru kembali membuka tab affiliate saat download
  isAffiliateTriggered = false;

  // Toggle Tampilan
  resultCard.style.display = "none";
  inputCard.style.display = "block";
  hideStatus();
  shopeeUrlInput.focus();
});

// Helpers
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 30);
}

function showStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = `status-bar ${type}`;
  statusMsg.style.display = "block";
}

function hideStatus() {
  statusMsg.style.display = "none";
}

function setLoading(isLoading) {
  btnExtract.disabled = isLoading;
  btnExtract.textContent = isLoading ? "Mengambil Video..." : "Ambil Media";
}