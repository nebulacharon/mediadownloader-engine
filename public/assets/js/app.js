/**
 * Shopee Video Downloader Client Logic
 */

const DEFAULT_AFFILIATE_URL = "https://s.shopee.co.id/your_affiliate_id";

const elements = {
  form: document.getElementById("extractor-form"),
  urlInput: document.getElementById("shopee-url"),
  btnExtract: document.getElementById("btn-extract"),
  btnPaste: document.getElementById("btn-paste"),
  statusMsg: document.getElementById("status-message"),
  resultCard: document.getElementById("result-card"),
  productTitle: document.getElementById("product-title"),
  videoContainer: document.getElementById("video-container"),
  videoPlayer: document.getElementById("video-player"),
  btnDownloadVideo: document.getElementById("btn-download-video"),
  imagesGrid: document.getElementById("images-grid"),
  photosContainer: document.getElementById("photos-container"),
  btnDownloadZip: document.getElementById("btn-download-zip"),
  btnViewShopee: document.getElementById("btn-view-shopee"),
};

let currentMedia = {
  title: "",
  videoUrl: null
};

// 1. One-Session Affiliate
function triggerOneSessionAffiliate() {
  const hasTriggered = sessionStorage.getItem("sp_affiliate_triggered");
  if (!hasTriggered) {
    sessionStorage.setItem("sp_affiliate_triggered", "true");
    window.open(DEFAULT_AFFILIATE_URL, "_blank", "noopener,noreferrer");
  }
}

// 2. Submit & Fetch Backend
elements.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = elements.urlInput.value.trim();

  if (!rawUrl) {
    showStatus("Harap masukkan link Shopee Video terlebih dahulu.", "error");
    return;
  }

  setLoading(true);
  resetResults();

  try {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: rawUrl })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error || "Gagal memproses tautan");
    }

    renderMedia(result.data.item);
    showStatus("Video berhasil dimuat!", "success");
  } catch (err) {
    showStatus(err.message || "Terjadi kesalahan sistem.", "error");
  } finally {
    setLoading(false);
  }
});

// 3. Tombol Tempel (Paste)
if (elements.btnPaste) {
  elements.btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      elements.urlInput.value = text.trim();
      showStatus("Tautan berhasil ditempel!", "success");
    } catch {
      elements.urlInput.focus();
      showStatus("Izin clipboard dibatasi. Silakan tekan Ctrl+V.", "error");
    }
  });
}

// 4. Render Media
function renderMedia(item) {
  currentMedia.title = item.name || "Shopee_Video";
  elements.productTitle.textContent = currentMedia.title;

  const videoUrl = item.video_info_list?.[0]?.default_format?.url;

  if (videoUrl) {
    currentMedia.videoUrl = videoUrl;
    elements.videoPlayer.src = videoUrl;
    elements.videoContainer.style.display = "block";
    elements.btnDownloadVideo.onclick = () => downloadVideoFile(videoUrl, `${sanitizeFilename(currentMedia.title)}.mp4`);
  }

  if (elements.photosContainer) {
    elements.photosContainer.style.display = "none";
  }

  elements.resultCard.style.display = "block";
}

// 5. Download File Handler
async function downloadVideoFile(url, filename) {
  triggerOneSessionAffiliate();
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

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 30);
}

function showStatus(text, type) {
  elements.statusMsg.textContent = text;
  elements.statusMsg.className = `status-bar ${type}`;
  elements.statusMsg.style.display = "block";
}

function resetResults() {
  elements.statusMsg.style.display = "none";
  elements.resultCard.style.display = "none";
  elements.videoPlayer.src = "";
}

function setLoading(isLoading) {
  elements.btnExtract.disabled = isLoading;
  elements.btnExtract.textContent = isLoading ? "Mengambil Data..." : "Ambil Media";
}