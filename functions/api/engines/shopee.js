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
  
    // 1. Ekstrak data JSON internal __NEXT_DATA__
    const scriptMatches = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    
    let rawVideoUrl = null;
    let caption = "Shopee Video HD";
  
    if (scriptMatches && scriptMatches[1]) {
      try {
        const nextData = JSON.parse(scriptMatches[1]);
        const videoData = nextData.props?.pageProps?.mediaInfo?.video;
        rawVideoUrl = videoData?.watermarkVideoUrl;
        if (videoData?.caption) {
          caption = videoData.caption;
        }
      } catch (e) {
        // Fallback parse
      }
    }
  
    // Fallback regex jika script tag gagal
    if (!rawVideoUrl) {
      const rawMatches = html.match(/https:\/\/[^"'\s\\]+?\.vod\.susercontent\.com\/api\/v4\/[^"'\s\\]+?\.mp4/gi);
      if (rawMatches && rawMatches.length > 0) {
        rawVideoUrl = rawMatches[0].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
    }
  
    if (!rawVideoUrl) {
      throw new Error("Stream video tidak ditemukan atau tautan tidak valid.");
    }
  
    // 2. Transformasi ke Master Clean URL (Menghapus Transcode Watermark)
    // Contoh: .../mms/id-11110124-xxx.1600355178.mp4 -> .../mms/id-11110124-xxx.mp4
    let cleanMasterUrl = rawVideoUrl;
    const mmsMatch = rawVideoUrl.match(/(https:\/\/[^\/]+\/api\/v4\/[^\/]+\/mms\/(id-[a-zA-Z0-9_\-]+))(\.[0-9]+)*\.mp4/i);
  
    if (mmsMatch) {
      // Membangun URL Master Bersih HD
      cleanMasterUrl = `${mmsMatch[1]}.mp4`;
    }
  
    return {
      platform: "shopee",
      title: caption,
      videoUrl: cleanMasterUrl
    };
  }