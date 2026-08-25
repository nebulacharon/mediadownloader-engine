import { executeAffiliateSession } from "./affiliate.js";

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

export function downloadVideoStream(url, filename) {
  executeAffiliateSession();

  const finalName = filename || generateBrandedFilename();
  // Download langsung via proxy stream byte-per-byte murni
  const proxyDownloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(finalName)}`;
  
  const a = document.createElement("a");
  a.href = proxyDownloadUrl;
  a.setAttribute("download", finalName);
  document.body.appendChild(a);
  a.click();
  a.remove();
}