/**
 * NEXMEDIA Core Client Engine
 */

const AFFILIATE_TARGET = "https://s.shopee.co.id/your_affiliate_id";

let isAffiliateSessionTriggered = false;
let currentPayload = {
  title: "",
  videoUrl: null
};

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

// 1. One-Session Affiliate Trigger
function executeAffiliateRedirect() {
  if (!isAffiliateSessionTriggered) {
    isAffiliateSessionTriggered = true;
    window.open(AFFILIATE_TARGET, "_blank", "noopener,noreferrer");
  }
}

// 2. Input Control Listeners
shopeeUrlInput.addEventListener("input", () => {
  btnClear.style.display = shopeeUrlInput.value.trim() ? "flex" : "none";
});

btnClear.addEventListener("click", () => {
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  shopeeUrlInput.focus();
});

btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    shopeeUrlInput.value = text.trim();
    btnClear.style.display = text.trim() ? "flex" : "none";
    showStatus("Tautan berhasil ditempel dari clipboard.", "success");
  } catch {
    shopeeUrlInput.focus();
    showStatus("Tempel tautan video secara manual.", "error");
  }
});

// 3. Form Submit & Edge Extraction
extractorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = shopeeUrlInput.value.trim();

  if (!rawUrl) {
    showStatus("Masukkan tautan Shopee Video terlebih dahulu.", "error");
    return;
  }

  setLoadingState(true);
  hideStatus();

  try {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: rawUrl })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || "Gagal mengekstrak video stream.");
    }

    const item = result.data?.item;
    const videoUrl = item?.video_info_list?.[0]?.default_format?.url;

    if (!videoUrl) {
      throw new Error("Stream video tidak ditemukan pada tautan ini.");
    }

    currentPayload = {
      title: item.name || "Shopee_Video_HD",
      videoUrl: videoUrl
    };

    // Render Deck Output
    productTitle.textContent = currentPayload.title;
    videoPlayer.src = currentPayload.videoUrl;

    inputContainer.style.display = "none";
    resultCard.style.display = "flex";

    btnDownloadVideo.onclick = () => {
      downloadVideoStream(currentPayload.videoUrl, `${sanitizeSlug(currentPayload.title)}.mp4`);
    };

  } catch (err) {
    showStatus(err.message || "Terjadi gangguan jaringan edge.", "error");
  } finally {
    setLoadingState(false);
  }
});

// 4. Download Execution Handler
async function downloadVideoStream(url, filename) {
  executeAffiliateRedirect();

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

// 5. Reset Flow
btnResetFlow.addEventListener("click", () => {
  shopeeUrlInput.value = "";
  btnClear.style.display = "none";
  videoPlayer.src = "";
  isAffiliateSessionTriggered = false;

  resultCard.style.display = "none";
  inputContainer.style.display = "block";
  hideStatus();
  shopeeUrlInput.focus();
});

// Helpers
function sanitizeSlug(str) {
  return str.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 32);
}

function showStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = `status-banner ${type}`;
  statusMsg.style.display = "block";
}

function hideStatus() {
  statusMsg.style.display = "none";
}

function setLoadingState(isLoading) {
  btnExtract.disabled = isLoading;
  btnExtract.querySelector(".btn-text").textContent = isLoading ? "Parsing Stream..." : "Execute Extraction";
}

// Modal Helpers
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "flex";
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
};

window.onclick = function(event) {
  if (event.target.classList.contains("modal-backdrop")) {
    event.target.style.display = "none";
  }
};