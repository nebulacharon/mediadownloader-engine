import { executeAffiliateSession } from "./affiliate.js";

export function sanitizeSlug(str) {
  return str.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 32);
}

export function showStatus(el, text, type) {
  el.textContent = text;
  el.className = `status-banner ${type}`;
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
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}