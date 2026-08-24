import { extractShopeeVideo } from "./engines/shopee.js";
import { extractTikTok } from "./engines/tiktok.js";
import { extractInstagram } from "./engines/instagram.js";

export async function onRequestPost({ request }) {
  try {
    const { url } = await request.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL wajib diisi!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const targetUrl = url.trim();
    let result = null;

    // Platform Routing
    if (targetUrl.includes("shp.ee") || targetUrl.includes("shopee.co.id") || targetUrl.includes("shope.ee")) {
      result = await extractShopeeVideo(targetUrl);
    } else if (targetUrl.includes("tiktok.com") || targetUrl.includes("douyin.com")) {
      result = await extractTikTok(targetUrl);
    } else if (targetUrl.includes("instagram.com")) {
      result = await extractInstagram(targetUrl);
    } else {
      return new Response(JSON.stringify({ error: "Platform tidak didukung. Masukkan tautan Shopee Video yang valid." }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Gagal memproses request." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}