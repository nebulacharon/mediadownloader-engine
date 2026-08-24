export async function onRequestPost({ request }) {
    try {
      const { url } = await request.json();
      if (!url) {
        return new Response(JSON.stringify({ error: "URL wajib diisi!" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      let targetUrl = url.trim();
  
      // 1. Follow shortlink redirect jika link berasal dari share mobile (shp.ee / s.shopee.co.id)
      if (targetUrl.includes("shp.ee") || targetUrl.includes("shope.ee") || targetUrl.includes("s.shopee.co.id")) {
        const redirectRes = await fetch(targetUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          }
        });
        targetUrl = redirectRes.url;
      }
  
      // 2. Deteksi apakah ini link Shopee Video (Reels) atau Link Produk Biasa
      // Format Shopee Video: /universal-link/video/detail/... atau /sv/video/...
      if (targetUrl.includes("/video/") || targetUrl.includes("/sv/")) {
        const videoIdMatch = targetUrl.match(/video\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/item\/([a-zA-Z0-9_-]+)/);
        if (videoIdMatch) {
          return await handleShopeeVideoDirect(videoIdMatch[1]);
        }
      }
  
      // 3. Deteksi Format Link Produk (Desktop / Mobile Standard)
      let shopId = null;
      let itemId = null;
  
      const desktopMatch = targetUrl.match(/-i\.(\d+)\.(\d+)/);
      const productMatch = targetUrl.match(/product\/(\d+)\/(\d+)/);
  
      if (desktopMatch) {
        shopId = desktopMatch[1];
        itemId = desktopMatch[2];
      } else if (productMatch) {
        shopId = productMatch[1];
        itemId = productMatch[2];
      }
  
      if (!shopId || !itemId) {
        return new Response(JSON.stringify({ error: "Format link tidak dikenali. Pastikan memasukkan tautan produk Shopee yang valid." }), {
          status: 422,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      // 4. Request ke API Shopee Product Detail (Gunakan Header Lengkap RWeb)
      const apiUrl = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
      const apiRes = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": `https://shopee.co.id/product/${shopId}/${itemId}`,
          "Accept": "application/json",
          "x-api-source": "rweb"
        }
      });
  
      const shopeeData = await apiRes.json();
  
      if (!shopeeData || shopeeData.error || !shopeeData.data) {
        // Fallback API V2 jika V4 ditolak
        const fallbackUrl = `https://shopee.co.id/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://shopee.co.id/"
          }
        });
        const fallbackData = await fallbackRes.json();
  
        if (fallbackData && fallbackData.item) {
          return new Response(JSON.stringify({ data: { item: fallbackData.item } }), {
            headers: { "Content-Type": "application/json" }
          });
        }
  
        return new Response(JSON.stringify({ error: "Shopee membatasi akses link ini atau produk tidak ditemukan." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      return new Response(JSON.stringify({ data: shopeeData.data }), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Gagal memproses server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  // Handler khusus Shopee Video / Reels
  async function handleShopeeVideoDirect(videoId) {
    try {
      const videoApi = `https://shopee.co.id/api/v4/video/get_video_detail?video_id=${videoId}`;
      const res = await fetch(videoApi, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://shopee.co.id/"
        }
      });
      const videoData = await res.json();
      
      if (videoData?.data?.video_info) {
        const v = videoData.data.video_info;
        return new Response(JSON.stringify({
          data: {
            item: {
              name: videoData.data.caption || "Shopee Video Reels",
              video_info_list: [{ default_format: { url: v.video_url || v.url } }],
              images: [v.cover_url]
            }
          }
        }), { headers: { "Content-Type": "application/json" } });
      }
    } catch (e) {}
  
    return new Response(JSON.stringify({ error: "Gagal mengambil video reels Shopee." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }