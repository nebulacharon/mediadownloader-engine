export async function onRequestPost({ request }) {
    try {
      const { url } = await request.json();
      if (!url) {
        return new Response(JSON.stringify({ error: "URL wajib diisi!" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      const cleanInput = url.trim();
  
      // 1. Follow shortlink / direct URL dengan User-Agent Mobile
      const response = await fetch(cleanInput, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
  
      const finalUrl = response.url;
      const htmlContent = await response.text();
  
      // 2. Ekstraksi Video MP4 Langsung dari CDN Shopee
      const mp4Matches = htmlContent.match(/https:\/\/[^"'\s\\]+?\.(mp4|m4v)[^"'\s\\]*/gi) || 
                         htmlContent.match(/https:\/\/cvf\.shopee\.co\.id\/file\/[a-zA-Z0-9_\-]+/gi);
  
      let extractedVideoUrl = null;
      if (mp4Matches && mp4Matches.length > 0) {
        extractedVideoUrl = mp4Matches[0].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
  
      // 3. Ekstraksi Foto Produk / Thumbnail Video (Cover)
      const coverMatch = htmlContent.match(/"cover_url":\s*"([^"]+)"/i) || 
                         htmlContent.match(/"image":\s*"([^"]+)"/i);
      
      let images = [];
      if (coverMatch) {
        images.push(coverMatch[1].replace(/\\u002F/g, "/"));
      }
  
      // Ekstrak Title / Caption Video
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      let title = "Shopee Video HD";
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(" | Shopee Video", "").trim();
      }
  
      if (!extractedVideoUrl) {
        return new Response(JSON.stringify({ 
          error: "Gagal menemukan video. Pastikan tautan berasal dari Shopee Video / Reels yang masih aktif." 
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      return new Response(JSON.stringify({
        data: {
          item: {
            name: title,
            images: images,
            video_info_list: [{ default_format: { url: extractedVideoUrl } }]
          }
        }
      }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }