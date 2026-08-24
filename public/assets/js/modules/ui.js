import { executeAffiliateSession } from "./affiliate.js";

// Generator Format Nama: NEXMEDIA-20260824-101160.mp4
export function generateBrandedFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `NEXMEDIA-${year}${month}${day}-${hours}${minutes}${seconds}.mp4`;
}

export function showStatus(el, text, type) {
  el.textContent = text;
  el.className = `status-box ${type}`;
  el.style.display = "block";
}

export function hideStatus(el) {
  el.style.display = "none";
}

export async function downloadVideoStream(url, filename) {
  executeAffiliateSession();

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || generateBrandedFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}