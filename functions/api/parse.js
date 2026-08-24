export async function onRequestPost({ request }) {
    try {
      const { url } = await request.json();
      if (!url) {
        return new Response(JSON.stringify({ error: "URL wajib diisi!" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      let rawInput = url.trim();
  
      // 1. Resolve Rantai Redirect Shortlink (shp.ee / s.shopee.co.id / universal-link)
      let finalUrl = rawInput;
      if (rawInput.includes("shp.ee") || rawInput.includes("shope.ee") || rawInput.includes("s.shopee.co.id")) {
        try {
          let currentUrl = rawInput;
          for (let i = 0; i < 3; i++) {
            const res = await fetch(currentUrl, {
              method: "GET",
              redirect: "manual",
              headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
              }
            });
  
            const location = res.headers.get("location");
            if (location) {
              currentUrl = location.startsWith("http") ? location : `https://shopee.co.id${location}`;
            } else {
              // Cek jika ada meta refresh redirect di body
              const bodyText = await res.text();
              const metaMatch = bodyText.match(/content=["']\d+;\s*url=([^"']+)["']/i) || 
                                bodyText.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
              if (metaMatch) {
                currentUrl = metaMatch[1];
              } else {
                break;
              }
            }
          }
          finalUrl = currentUrl;
        } catch (e) {
          finalUrl = rawInput;
        }
      }
  
      // 2. Ekstrak Shop ID & Item ID dari URL Final
      let shopId = null;
      let itemId = null;
  
      const matchDash = finalUrl.match(/-i\.(\d+)\.(\d+)/);
      const matchProduct = finalUrl.match(/product\/(\d+)\/(\d+)/);
      const matchUniversal = finalUrl.match(/item\/(\d+)\/(\d+)/) || finalUrl.match(/itemid=(\d+)&shopid=(\d+)/i);
  
      if (matchDash) {
        shopId = matchDash[1];
        itemId = matchDash[2];
      } else if (matchProduct) {
        shopId = matchProduct[1];
        itemId = matchProduct[2];
      } else if (matchUniversal) {
        if (finalUrl.includes("itemid=")) {
          itemId = matchUniversal[1];
          shopId = matchUniversal[2];
        } else {
          shopId = matchUniversal[1];
          itemId = matchUniversal[2];
        }
      }
  
      if (!shopId || !itemId) {
        return new Response(JSON.stringify({ 
          error: "Gagal mengekstrak ID Produk. Coba gunakan tautan lengkap dari browser." 
        }), {
          status: 422,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      // 3. Fetch Data Produk via Endpoint Mobile API v2 (Bypass WAF Datacenter)
      const mobileApiUrl = `https://mall.shopee.co.id/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
      const apiRes = await fetch(mobileApiUrl, {
        headers: {
          "User-Agent": "Shopee/3.15.0 (Android 12; Pixel 6)",
          "Accept": "application/json",
          "Referer": "https://mall.shopee.co.id/"
        }
      });
  
      const responseJson = await apiRes.json();
      const item = responseJson.item || responseJson.data?.item;
  
      if (!item) {
        // Fallback: Scrape JSON-LD spesifik dari halaman produk
        const pageRes = await fetch(`https://shopee.co.id/product/${shopId}/${itemId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://shopee.co.id/"
          }
        });
        const html = await pageRes.text();
        const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
        
        if (ldMatch) {
          try {
            const parsedLd = JSON.parse(ldMatch[1]);
            const rawImgs = Array.isArray(parsedLd.image) ? parsedLd.image : [parsedLd.image];
            return new Response(JSON.stringify({
              data: {
                item: {
                  name: parsedLd.name || "Shopee Product",
                  itemid: itemId,
                  shopid: shopId,
                  images: rawImgs.filter(Boolean),
                  video_info_list: []
                }
              }
            }), { headers: { "Content-Type": "application/json" } });
          } catch (e) {}
        }
  
        return new Response(JSON.stringify({ error: "Gagal mengambil media. Produk mungkin habis atau dibatasi." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      // 4. Strukturkan Hanya Aset Produk yang Valid
      const cleanImages = (item.images || []).map(id => id.toString());
      const videoList = item.video_info_list && item.video_info_list.length > 0 
        ? item.video_info_list.map(v => ({ default_format: { url: v.default_format?.url || v.url } }))
        : [];
  
      return new Response(JSON.stringify({
        data: {
          item: {
            name: item.name,
            itemid: item.itemid || itemId,
            shopid: item.shopid || shopId,
            images: cleanImages,
            video_info_list: videoList
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