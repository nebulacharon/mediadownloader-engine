export async function extractShopeeVideo(targetUrl) {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  
    const html = await response.text();
  
    let rawVideoUrl = null;
    let caption = "Shopee Video";
  
    // 1. Ekstrak data dari JSON __NEXT_DATA__
    const scriptMatches = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    
    if (scriptMatches && scriptMatches[1]) {
      try {
        const nextData = JSON.parse(scriptMatches[1]);
        const videoData = nextData.props?.pageProps?.mediaInfo?.video;
        rawVideoUrl = videoData?.watermarkVideoUrl;
        if (videoData?.caption) {
          caption = videoData.caption;
        }
      } catch {
        // JSON parse fallback
      }
    }
  
    // 2. Fallback Scan Raw HTML
    if (!rawVideoUrl) {
      const rawMatches = html.match(/https:\/\/[^"'\s\\]+?\.vod\.susercontent\.com\/api\/v4\/[0-9]+\/mms\/id-[a-zA-Z0-9_\-]+[^"'\s\\]*/gi);
      if (rawMatches && rawMatches.length > 0) {
        rawVideoUrl = rawMatches[0].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
    }
  
    if (!rawVideoUrl) {
      throw new Error("Stream video tidak ditemukan pada tautan ini.");
    }
  
    // 3. Multi-tier Clean Stream Resolver
    let finalVideoUrl = rawVideoUrl;
    const mmsExtract = rawVideoUrl.match(/(https:\/\/[^\/]+\/api\/v4\/[0-9]+\/mms\/(id-[a-zA-Z0-9_\-]+))/i);
  
    if (mmsExtract && mmsExtract[1]) {
      const basePath = mmsExtract[1];
      const candidateUrls = [
        `${basePath}.mp4`,         // Master Pure HD (Reels)
        `${basePath}.default.mp4`  // Clean Default Stream (Product Videos)
      ];
  
      for (const candUrl of candidateUrls) {
        try {
          const checkRes = await fetch(candUrl, { method: "HEAD" });
          if (checkRes.status === 200) {
            finalVideoUrl = candUrl;
            break;
          }
        } catch {
          // Lanjut ke kandidat berikutnya
        }
      }
    }
  
    return {
      platform: "shopee",
      title: caption,
      videoUrl: finalVideoUrl
    };
  }