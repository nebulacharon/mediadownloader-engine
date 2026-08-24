/**
 * Shopee Media Downloader - Pure Client-Side Extractor
 * Menggunakan Client IP via CORS Gateway & DOM Parser
 */

const DEFAULT_AFFILIATE_URL = "https://s.shopee.co.id/your_affiliate_id";
const CDN_IMAGE_PREFIX = "https://down-id.img.susercontent.com/file/";

// DOM Selectors
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

// 1. One-Session Affiliate Trigger
function triggerOneSessionAffiliate() {
  const hasTriggered = sessionStorage.getItem("sp_affiliate_triggered");
  if (!hasTriggered) {
    sessionStorage.setItem("sp_affiliate_triggered", "true");
    const target = currentMedia.affiliateTarget || DEFAULT_AFFILIATE_URL;
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

// 2. Client-Side Extraction Logic
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
    // A. Ekstrak Target URL (Handle Shortlink via CORS Gateway jika diperlukan)
    let targetUrl = rawUrl;
    
    // B. Parse Shop ID & Item ID dari string URL
    let { shopId, itemId } = extractIdsFromUrl(targetUrl);

    // Jika berupa shortlink (shp.ee / s.shopee.co.id), fetch HTML redirectnya dari client
    if (!shopId || !itemId) {
      showStatus("Mengurai shortlink...", "success");
      const unshortened = await resolveShortlinkClient(rawUrl);
      const parsed = extractIdsFromUrl(unshortened);
      shopId = parsed.shopId;
      itemId = parsed.itemId;
    }

    if (!shopId || !itemId) {
      throw new Error("Gagal membaca ID Produk. Gunakan link lengkap dari browser desktop.");
    }

    showStatus("Mengambil data media...", "success");

    // C. Fetch Data Produk via Client-Side CORS Proxy
    const productData = await fetchProductDataClient(shopId, itemId);
    
    processShopeeData(productData, shopId, itemId);
    showStatus("Media berhasil dimuat!", "success");

  } catch (err) {
    showStatus(err.message || "Gagal memproses media produk.", "error");
  } finally {
    setLoading(false);
  }
});

// Helper: Regex Parser untuk ShopID & ItemID
function extractIdsFromUrl(url) {
  let shopId = null;
  let itemId = null;

  const matchDash = url.match(/-i\.(\d+)\.(\d+)/);
  const matchProduct = url.match(/product\/(\d+)\/(\d+)/);
  const matchParams = url.match(/itemid=(\d+)&shopid=(\d+)/i) || url.match(/shopid=(\d+)&itemid=(\d+)/i);

  if (matchDash) {
    shopId = matchDash[1];
    itemId = matchDash[2];
  } else if (matchProduct) {
    shopId = matchProduct[1];
    itemId = matchProduct[2];
  } else if (matchParams) {
    if (url.includes("itemid=") && url.indexOf("itemid=") < url.indexOf("shopid=")) {
      itemId = matchParams[1];
      shopId = matchParams[2];
    } else {
      shopId = matchParams[1];
      itemId = matchParams[2];
    }
  }

  return { shopId, itemId };
}

// Helper: Resolve Shortlink di Client
async function resolveShortlinkClient(shortUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(shortUrl)}`;
  const res = await fetch(proxyUrl);
  const html = await res.text();
  
  // Cari link redirect internal di dalam meta tag / script
  const redirectMatch = html.match(/content=["']\d+;\s*url=([^"']+)["']/i) || 
                        html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i) ||
                        html.match(/-i\.(\d+)\.(\d+)/);

  return redirectMatch ? redirectMatch[0] : shortUrl;
}

// Helper: Fetch Shopee API via Client Proxy
async function fetchProductDataClient(shopId, itemId) {
  const targetApi = `https://mall.shopee.co.id/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetApi)}`;

  const res = await fetch(proxyUrl);
  const data = await res.json();

  if (!data || (!data.item && !data.data?.item)) {
    throw new Error("Data produk tidak ditemukan atau dilindungi Shopee.");
  }

  return data.item || data.data.item;
}

// 3. Render Media ke UI
function processShopeeData(item, shopId, itemId) {
  currentMedia.title = item.name || "Shopee Product Media";
  elements.productTitle.textContent = currentMedia.title;
  currentMedia.affiliateTarget = `https://shopee.co.id/product/${shopId}/${itemId}`;

  if (elements.btnViewShopee) {
    elements.btnViewShopee.href = currentMedia.affiliateTarget;
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

// 4. Download & ZIP Handlers
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
    showStatus("Library ZIP belum siap, tunggu sebentar.", "error");
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
    showStatus("Gagal membuat file ZIP.", "error");
  } finally {
    elements.btnDownloadZip.disabled = false;
    elements.btnDownloadZip.textContent = "Download Semua Foto (.ZIP)";
  }
}

// 5. Utilities
if (elements.btnPaste) {
  elements.btnPaste.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      elements.urlInput.value = text.trim();
      showStatus("Tautan berhasil ditempel!", "success");
    } catch {
      elements.urlInput.focus();
      showStatus("Tempel tautan secara manual.", "error");
    }
  });
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