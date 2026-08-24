export async function parseMediaUrl(targetUrl) {
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl })
    });
  
    const result = await response.json();
  
    if (!response.ok || result.error) {
      throw new Error(result.error || "Gagal menghubungi engine ekstraksi.");
    }
  
    return result.data;
  }