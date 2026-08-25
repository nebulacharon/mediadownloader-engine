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
    let caption = "Shopee Video HD";
  
    // 1. Prioritas Utama: Ekstrak dari JSON __NEXT_DATA__
    const scriptMatches = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    
    if (scriptMatches && scriptMatches[1]) {
      try {
        const nextData = JSON.parse(scriptMatches[1]);
        const videoData = nextData.props?.pageProps?.mediaInfo?.video;
        rawVideoUrl = videoData?.watermarkVideoUrl;
        if (videoData?.caption) {
          caption = videoData.caption;
        }
      } catch (e) {
        // JSON parse fallback
      }
    }
  
    // 2. Fallback: Scan semua pola MMS VOD di Raw HTML
    if (!rawVideoUrl) {
      const rawMatches = html.match(/https:\/\/[^"'\s\\]+?\.vod\.susercontent\.com\/api\/v4\/[0-9]+\/mms\/id-[a-zA-Z0-9_\-]+[^"'\s\\]*/gi);
      if (rawMatches && rawMatches.length > 0) {
        rawVideoUrl = rawMatches[0].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
    }
  
    if (!rawVideoUrl) {
      throw new Error("Stream video tidak ditemukan pada tautan ini.");
    }
  
    // 3. Robust Master Cleaner:
    // Menangkap bagian https://.../mms/id-xxxx dan mengabaikan SEMUA suffix titik/transcode apapun
    // Contoh:
    // https://down-aka-id.vod.susercontent.com/api/v4/11110124/mms/id-11110124-6kou6-mducj6j9pci834.16003551756125666.59.mp4
    // -> https://down-aka-id.vod.susercontent.com/api/v4/11110124/mms/id-11110124-6kou6-mducj6j9pci834.mp4
    let cleanMasterUrl = rawVideoUrl;
    const mmsExtract = rawVideoUrl.match(/(https:\/\/[^\/]+\/api\/v4\/[0-9]+\/mms\/(id-[a-zA-Z0-9_\-]+))/i);
  
    if (mmsExtract && mmsExtract[1]) {
      cleanMasterUrl = `${mmsExtract[1]}.mp4`;
    }
  
    return {
      platform: "shopee",
      title: caption,
      videoUrl: cleanMasterUrl
    };
  }