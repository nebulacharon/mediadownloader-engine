export async function onRequestPost({ request }) {
    try {
      const { url } = await request.json();
      if (!url) {
        return new Response(JSON.stringify({ error: "URL wajib disertakan" }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
  
      let shopId = null;
      let itemId = null;
  
      // 1. Ekstrak dari Format Desktop URL
      const desktopMatch = url.match(/-i\.(\d+)\.(\d+)/);
      if (desktopMatch) {
        shopId = desktopMatch[1];
        itemId = desktopMatch[2];
      } else {
        // 2. Ekstrak dari Shortlink Mobile (Follow Redirect)
        const redirectRes = await fetch(url, { 
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
          }
        });
        const finalUrl = redirectRes.url;
        const parsedMatch = finalUrl.match(/-i\.(\d+)\.(\d+)/) || finalUrl.match(/product\/(\d+)\/(\d+)/);
        
        if (parsedMatch) {
          shopId = parsedMatch[1];
          itemId = parsedMatch[2];
        }
      }
  
      if (!shopId || !itemId) {
        return new Response(JSON.stringify({ error: "Gagal mengenali ID Produk Shopee. Pastikan tautan valid." }), { 
          status: 422,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      // 3. Request ke API Shopee V4
      const shopeeApiEndpoint = `https://shopee.co.id/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
      const apiResponse = await fetch(shopeeApiEndpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://shopee.co.id/",
          "Accept": "application/json"
        }
      });
  
      const shopeeData = await apiResponse.json();
  
      if (shopeeData.error || !shopeeData.data) {
        return new Response(JSON.stringify({ error: "Produk tidak ditemukan atau privat." }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
  
      return new Response(JSON.stringify({ data: shopeeData.data }), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300" // Cache 5 menit di edge
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }