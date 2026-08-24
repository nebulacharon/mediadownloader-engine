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
  
      // 1. Ekstrak Target Asli jika Shortlink (Loop Redirect Resolver)
      const browserHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      };
  
      if (targetUrl.includes("shp.ee") || targetUrl.includes("shope.ee") || targetUrl.includes("s.shopee.co.id")) {
        try {
          const headRes = await fetch(targetUrl, {
            method: "GET",
            redirect: "follow",
            headers: browserHeaders
          });
          targetUrl = headRes.url;
        } catch (e) {
          // Fallback jika fetch redirect gagal
        }
      }
  
      // 2. Cek apakah ini Shopee Video (Reels)
      if (targetUrl.includes("/video/") || targetUrl.includes("/sv/")) {
        const videoIdMatch = targetUrl.match(/video\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/item\/([a-zA-Z0-9_-]+)/);
        if (videoIdMatch) {
          const videoRes = await fetch(`https://shopee.co.id/api/v4/video/get_video_detail?video_id=${videoIdMatch[1]}`, {
            headers: browserHeaders
          });
          const vJson = await videoRes.json();
          if (vJson?.data?.video_info) {
            const v = vJson.data.video_info;
            return new Response(JSON.stringify({
              data: {
                item: {
                  name: vJson.data.caption || "Shopee Video",
                  video_info_list: [{ default_format: { url: v.video_url || v.url } }],
                  images: [v.cover_url]
                }
              }
            }), { headers: { "Content-Type": "application/json" } });
          }
        }
      }
  
      // 3. Ekstrak Shop ID & Item ID dari URL Bersih
      let shopId = null;
      let itemId = null;
  
      const matchDash = targetUrl.match(/-i\.(\d+)\.(\d+)/);
      const matchProduct = targetUrl.match(/product\/(\d+)\/(\d+)/);
      const matchItem = targetUrl.match(/item\/(\d+)\/(\d+)/);
  
      if (matchDash) {
        shopId = matchDash[1];
        itemId = matchDash[2];
      } else if (matchProduct) {
        shopId = matchProduct[1];
        itemId = matchProduct[2];
      } else if (matchItem) {
        shopId = matchItem[1];
        itemId = matchItem[2];
      }
  
      if (!shopId || !itemId) {
        return new Response(JSON.stringify({ error: "Gagal mengekstrak ID Produk. Coba gunakan link lengkap dari browser." }), {
          status: 422,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      // 4. Ambil HTML Halaman Produk Shopee Langsung (Bypass WAF API)
      const productPageUrl = `https://shopee.co.id/product/${shopId}/${itemId}`;
      const pageRes = await fetch(productPageUrl, {
        headers: {
          ...browserHeaders,
          "Referer": "https://shopee.co.id/"
        }
      });
  
      const pageHtml = await pageRes.text();
  
      // A. Coba ekstrak dari Schema LD+JSON yang tertanam di HTML
      let extractedData = null;
      const ldJsonMatches = pageHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  
      if (ldJsonMatches) {
        for (const tag of ldJsonMatches) {
          try {
            const jsonContent = tag.replace(/<script type="application\/ld\+json">/i, "").replace(/<\/script>/i, "");
            const parsed = JSON.parse(jsonContent);
            if (parsed["@type"] === "Product" || parsed.image) {
              extractedData = {
                name: parsed.name || "Produk Shopee",
                itemid: itemId,
                shopid: shopId,
                images: Array.isArray(parsed.image) ? parsed.image : [parsed.image],
                video_info_list: []
              };
              break;
            }
          } catch (e) {}
        }
      }
  
      // B. Ekstrak Video URL & Image ID via Regex Pattern dari raw HTML
      const videoUrlMatch = pageHtml.match(/https:\/\/cvf\.shopee\.co\.id\/file\/[a-zA-Z0-9_\-]+/i) || 
                             pageHtml.match(/https:\/\/vod-.*\.susercontent\.com\/[a-zA-Z0-9_\.\-\/]+\.mp4/i);
      
      // Ekstrak seluruh Image ID (32 char hex) dari HTML
      const imageMatches = [...pageHtml.matchAll(/down-id\.img\.susercontent\.com\/file\/([a-f0-9]{32})/gi)];
      const uniqueImages = [...new Set(imageMatches.map(m => m[1]))];
  
      if (!extractedData && uniqueImages.length === 0) {
        return new Response(JSON.stringify({ error: "Shopee mengaktifkan bot protection untuk link ini. Coba buka link lain." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      const finalResult = {
        name: extractedData?.name || "Shopee Product Media",
        itemid: itemId,
        shopid: shopId,
        images: uniqueImages.length > 0 ? uniqueImages : (extractedData?.images || []),
        video_info_list: videoUrlMatch ? [{ default_format: { url: videoUrlMatch[0] } }] : []
      };
  
      return new Response(JSON.stringify({ data: { item: finalResult } }), {
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