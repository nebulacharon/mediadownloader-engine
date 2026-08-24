export async function extractShopeeVideo(targetUrl) {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  
    const html = await response.text();
  
    // Regex pattern CDN Shopee VOD
    const mp4Matches = html.match(/https:\/\/[^"'\s\\]+?\.(mp4|m4v)[^"'\s\\]*/gi) || 
                       html.match(/https:\/\/cvf\.shopee\.co\.id\/file\/[a-zA-Z0-9_\-]+/gi);
  
    let videoUrl = null;
    if (mp4Matches && mp4Matches.length > 0) {
      videoUrl = mp4Matches[0].replace(/\\u002F/g, "/").replace(/\\/g, "");
    }
  
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    let title = "Shopee Video HD";
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(" | Shopee Video", "").trim();
    }
  
    if (!videoUrl) {
      throw new Error("Stream video tidak ditemukan atau link sudah kedaluwarsa.");
    }
  
    return {
      platform: "shopee",
      title: title,
      videoUrl: videoUrl
    };
  }