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
const btnDownloadVideo = document.getElementById("btn-download-video");
const btnResetFlow = document.getElementById("btn-reset-flow");

// Initialize Clipboard Helpers
initClipboardControls(shopeeUrlInput, btnClear, btnPaste, () => {
  showStatus(statusMsg, "Tautan berhasil ditempel dari clipboard.", "success");
});

// Form Submit Handler
extractorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = shopeeUrlInput.value.trim();

  if (!rawUrl) {
    showStatus(statusMsg, "Masukkan tautan Shopee Video terlebih dahulu.", "error");
    return;
  }

  btnExtract.disabled = true;
  btnExtract.querySelector(".btn-text").textContent = "Parsing Stream...";
  hideStatus(statusMsg);

  try {
    const data = await parseMediaUrl(rawUrl);

    appState.currentPayload = {
      title: data.title || "Shopee_Video_HD",
      videoUrl: data.videoUrl,
      platform: data.platform
    };

    // Render Output Deck
    productTitle.textContent = appState.currentPayload.title;
    videoPlayer.src = appState.currentPayload.videoUrl;

    inputContainer.style.display = "none";
    resultCard.style.display = "flex";

    btnDownloadVideo.onclick = () => {
      downloadVideoStream(appState.currentPayload.videoUrl, `${sanitizeSlug(appState.currentPayload.title)}.mp4`);
    };

  } catch (err) {
    showStatus(statusMsg, err.message, "error");
  } finally {
    btnExtract.disabled = false;
    btnExtract.querySelector(".btn-text").textContent = "Execute Extraction";
  }
});

// Reset Session Handler
btnResetFlow.addEventListener("click", () => {
  appState.resetSession();
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  videoPlayer.src = "";

  resultCard.style.display = "none";
  inputContainer.style.display = "block";
  hideStatus(statusMsg);
  shopeeUrlInput.focus();
});

// Global Modal Handlers
window.openModal = (id) => { const el = document.getElementById(id); if (el) el.style.display = "flex"; };
window.closeModal = (id) => { const el = document.getElementById(id); if (el) el.style.display = "none"; };
window.onclick = (e) => { if (e.target.classList.contains("modal-backdrop")) e.target.style.display = "none"; };