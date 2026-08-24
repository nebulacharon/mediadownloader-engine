import { appState } from "./modules/state.js";
import { parseMediaUrl } from "./modules/api.js";
import { initClipboardControls } from "./modules/clipboard.js";
import { showStatus, hideStatus, sanitizeSlug, downloadVideoStream } from "./modules/ui.js";

// DOM Elements
const inputContainer = document.getElementById("input-container");
const resultCard = document.getElementById("result-card");
const extractorForm = document.getElementById("extractor-form");
const shopeeUrlInput = document.getElementById("shopee-url");
const btnClear = document.getElementById("btn-clear");
const btnPaste = document.getElementById("btn-paste");
const btnExtract = document.getElementById("btn-extract");
const statusMsg = document.getElementById("status-message");

const productTitle = document.getElementById("product-title");
const videoPlayer = document.getElementById("video-player");
const videoDuration = document.getElementById("video-duration");
const videoSize = document.getElementById("video-size");
const btnDownloadVideo = document.getElementById("btn-download-video");
const btnResetFlow = document.getElementById("btn-reset-flow");

// Inisialisasi Kontrol Input
initClipboardControls(shopeeUrlInput, btnClear, btnPaste, () => {
  showStatus(statusMsg, "Tautan berhasil ditempel.", "success");
});

// Form Submit Handler
extractorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = shopeeUrlInput.value.trim();

  if (!rawUrl) {
    showStatus(statusMsg, "Harap masukkan tautan Shopee Video terlebih dahulu.", "error");
    return;
  }

  btnExtract.disabled = true;
  btnExtract.querySelector(".btn-text").textContent = "Memproses...";
  hideStatus(statusMsg);

  try {
    const data = await parseMediaUrl(rawUrl);

    appState.currentPayload = {
      title: data.title || "Shopee_Video_HD",
      videoUrl: data.videoUrl,
      platform: data.platform
    };

    // Set Data Video
    productTitle.textContent = appState.currentPayload.title;
    videoPlayer.src = appState.currentPayload.videoUrl;

    // Kalkulasi Durasi & Estimasi Ukuran
    videoPlayer.onloadedmetadata = () => {
      const minutes = Math.floor(videoPlayer.duration / 60);
      const seconds = Math.floor(videoPlayer.duration % 60);
      videoDuration.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    fetchVideoSize(appState.currentPayload.videoUrl);

    // Tampilkan Card Hasil Split Layout
    inputContainer.style.display = "none";
    resultCard.style.display = "grid";

    btnDownloadVideo.onclick = () => {
      downloadVideoStream(appState.currentPayload.videoUrl, `${sanitizeSlug(appState.currentPayload.title)}.mp4`);
    };

  } catch (err) {
    showStatus(statusMsg, err.message, "error");
  } finally {
    btnExtract.disabled = false;
    btnExtract.querySelector(".btn-text").textContent = "Ambil Video";
  }
});

// Helper: Ambil Ukuran File Stream
async function fetchVideoSize(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const bytes = res.headers.get("content-length");
    if (bytes) {
      const mb = (parseInt(bytes) / (1024 * 1024)).toFixed(1);
      videoSize.textContent = `${mb} MB`;
    } else {
      videoSize.textContent = "~5.0 MB";
    }
  } catch {
    videoSize.textContent = "~5.0 MB";
  }
}

// Reset Session
btnResetFlow.addEventListener("click", () => {
  appState.resetSession();
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  videoPlayer.src = "";
  videoDuration.textContent = "--:--";
  videoSize.textContent = "-- MB";

  resultCard.style.display = "none";
  inputContainer.style.display = "block";
  hideStatus(statusMsg);
  shopeeUrlInput.focus();
});

// Animasi Lipatan Tengah (Origami Accordion)
window.toggleOrigami = function(foldId) {
  const foldElement = document.getElementById(foldId);
  if (!foldElement) return;

  if (foldElement.classList.contains("open")) {
    foldElement.classList.remove("open");
  } else {
    foldElement.classList.add("open");
  }
};

// Modals
window.openModal = (id) => { const el = document.getElementById(id); if (el) el.style.display = "flex"; };
window.closeModal = (id) => { const el = document.getElementById(id); if (el) el.style.display = "none"; };
window.onclick = (e) => { if (e.target.classList.contains("modal-backdrop")) e.target.style.display = "none"; };