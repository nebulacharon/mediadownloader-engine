export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const videoUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "NEXMEDIA-Video.mp4";
  
    if (!videoUrl) {
      return new Response("Missing video URL parameter", { status: 400 });
    }
  
    try {
      const upstreamRes = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://sv.shopee.co.id/"
        }
      });
  
      if (!upstreamRes.ok) {
        return new Response("Failed to fetch stream from CDN", { status: upstreamRes.status });
      }
  
      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Cache-Control", "public, max-age=86400");
  
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }
  
      return new Response(upstreamRes.body, {
        status: 200,
        headers
      });
    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
  }