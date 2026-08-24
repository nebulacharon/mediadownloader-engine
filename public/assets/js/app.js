/**
 * Shopee Media Downloader Client Logic
 */

const DEFAULT_AFFILIATE_URL = "https://s.shopee.co.id/your_affiliate_id";
const CDN_IMAGE_PREFIX = "https://down-id.img.susercontent.com/file/";

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
  btnDownloadZip: document.getElementById("btn-download-zip"),
  btnViewShopee: document.getElementById("btn-view-shopee"),
};

let currentMedia = {
  title: "",
  videoUrl: null,
  images: [],
  affiliateTarget: DEFAULT_AFFILIATE_URL
};

// 1. One-Session Affiliate
function triggerOneSessionAffiliate() {
  const hasTriggered = sessionStorage.getItem("sp_affiliate_triggered");
  if (!hasTriggered) {
    sessionStorage.setItem("sp_affiliate_triggered", "true");
    const target = currentMedia.affiliateTarget || DEFAULT_AFFILIATE_URL;
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

// 2. Form Submit & Extract
elements.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawUrl = elements.urlInput.value.trim();

  if (!rawUrl) {
    showStatus("Harap masukkan link Shopee terlebih dahulu.", "error");
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
      throw new Error(result.error || "Gagal mengambil data produk");
    }

    processShopeeData(result.data || result);
    showStatus("Media berhasil dimuat!", "success");
  } catch (err) {
    showStatus(err.message || "Terjadi kesalahan. Coba link produk lain.", "error");
  } finally {
    setLoading(false);
  }
});

// 3. Tombol Tempel (Perbaikan Clipboard Fallback)
if (elements.btnPaste) {
  elements.btnPaste.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        elements.urlInput.value = text.trim();
        showStatus("Tautan berhasil ditempel!", "success");
      } else {
        // Fallback jika permission browser ditolak
        elements.urlInput.focus();
        showStatus("Silakan tekan Ctrl+V (atau tahan & Paste di HP)", "error");
      }
    } catch {
      elements.urlInput.focus();
      showStatus("Izin akses clipboard ditolak. Tempel secara manual.", "error");
    }
  });
}

// 4. Render Media
function processShopeeData(data) {
  const item = data.item || data;

  currentMedia.title = item.name || "Shopee_Media";
  elements.productTitle.textContent = currentMedia.title;

  if (item.itemid && item.shopid) {
    currentMedia.affiliateTarget = `https://shopee.co.id/product/${item.shopid}/${item.itemid}`;
    if (elements.btnViewShopee) {
      elements.btnViewShopee.href = currentMedia.affiliateTarget;
    }
  }

  // Parse Video
  const videoInfo = item.video_info_list && item.video_info_list.length > 0 ? item.video_info_list[0] : null;
  const videoUrl = videoInfo?.default_format?.url || videoInfo?.url || null;

  if (videoUrl) {
    currentMedia.videoUrl = videoUrl;
    elements.videoPlayer.src = videoUrl;
    elements.videoContainer.style.display = "block";
    elements.btnDownloadVideo.onclick = () => downloadSingleFile(videoUrl, `${sanitizeFilename(currentMedia.title)}.mp4`);
  } else {
    elements.videoContainer.style.display = "none";
  }

  // Parse Images
  currentMedia.images = [];
  elements.imagesGrid.innerHTML = "";
  const rawImages = item.images || [];

  if (rawImages.length > 0) {
    rawImages.forEach((imgId, index) => {
      // Menangani ID gambar hash Shopee maupun URL gambar penuh
      const fullImgUrl = imgId.startsWith("http") ? imgId : `${CDN_IMAGE_PREFIX}${imgId}`;
      currentMedia.images.push(fullImgUrl);

      const imgCard = document.createElement("div");
      imgCard.className = "photo-item-card";
      imgCard.innerHTML = `
        <img src="${fullImgUrl}" alt="Foto ${index + 1}" loading="lazy" />
        <button type="button" class="btn-sub-download" data-url="${fullImgUrl}" data-index="${index + 1}">
          Unduh Foto
        </button>
      `;

      imgCard.querySelector(".btn-sub-download").addEventListener("click", (e) => {
        const url = e.target.getAttribute("data-url");
        const idx = e.target.getAttribute("data-index");
        downloadSingleFile(url, `${sanitizeFilename(currentMedia.title)}_foto_${idx}.jpg`);
      });

      elements.imagesGrid.appendChild(imgCard);
    });

    elements.btnDownloadZip.style.display = "inline-block";
    elements.btnDownloadZip.onclick = downloadAllAsZip;
  } else {
    elements.btnDownloadZip.style.display = "none";
  }

  elements.resultCard.style.display = "block";
}

// 5. Download Helpers
async function downloadSingleFile(url, filename) {
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

async function downloadAllAsZip() {
  if (typeof JSZip === "undefined") {
    showStatus("Komponen ZIP belum siap. Tunggu beberapa detik.", "error");
    return;
  }

  triggerOneSessionAffiliate();
  elements.btnDownloadZip.disabled = true;
  elements.btnDownloadZip.textContent = "Mengompresi...";

  const zip = new JSZip();
  const folder = zip.folder("Shopee_Photos");

  try {
    const fetchPromises = currentMedia.images.map(async (imgUrl, index) => {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      folder.file(`photo_${index + 1}.jpg`, blob);
    });

    await Promise.all(fetchPromises);
    const content = await zip.generateAsync({ type: "blob" });
    const blobUrl = window.URL.createObjectURL(content);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${sanitizeFilename(currentMedia.title)}_all_photos.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);

    showStatus("ZIP berhasil diunduh!", "success");
  } catch {
    showStatus("Gagal membuat arsip ZIP.", "error");
  } finally {
    elements.btnDownloadZip.disabled = false;
    elements.btnDownloadZip.textContent = "Download Semua Foto (.ZIP)";
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 35);
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
  elements.imagesGrid.innerHTML = "";
}

function setLoading(isLoading) {
  elements.btnExtract.disabled = isLoading;
  elements.btnExtract.textContent = isLoading ? "Mengambil Data..." : "Ambil Media";
}