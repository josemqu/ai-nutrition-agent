import { NextRequest, NextResponse } from "next/server";

// Max characters to return to the LLM (avoid token overflow)
const MAX_CONTENT_LENGTH = 8000;

/**
 * Minimal HTML-to-text extractor. No external deps needed.
 * Strips scripts, styles, nav, footer boilerplate and returns clean readable text.
 */
function htmlToText(html: string): string {
  // Remove script / style / nav / footer / aside / header blocks entirely
  let text = html
    .replace(/<(script|style|nav|footer|aside|header|noscript|iframe|svg|button)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Collapse whitespace
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}

/**
 * Tries to extract the main content area heuristically.
 * Looks for <article>, <main>, or the largest <div> with class containing
 * "recipe", "content", "post", "entry", etc.
 */
function extractMainContent(html: string): string {
  // Priority: <article> or <main>
  const articleMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
  if (articleMatch) return htmlToText(articleMatch[1]);

  // Fallback: look for common recipe/content div patterns
  const contentMatch = html.match(
    /<div[^>]*(?:class|id)="[^"]*(?:recipe|content|post|entry|article|ingrediente|preparacion)[^"]*"[^>]*>([\s\S]{200,}?)<\/div>/i
  );
  if (contentMatch) return htmlToText(contentMatch[1]);

  // Last resort: full HTML
  return htmlToText(html);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Solo se permiten URLs http/https" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "URL mal formada" }, { status: 400 });
    }

    // Fetch the page with a realistic browser UA to avoid bot blocks
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
      // 10-second timeout via AbortController
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `El sitio respondió con error ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return NextResponse.json(
        { error: "El contenido del link no es HTML legible" },
        { status: 415 }
      );
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? htmlToText(titleMatch[1]).trim() : parsedUrl.hostname;

    // Extract meaningful content
    let content = extractMainContent(html);

    // Truncate to avoid token overflow
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[...contenido truncado para análisis...]";
    }

    return NextResponse.json({
      title,
      url: parsedUrl.toString(),
      content,
      charCount: content.length,
    });
  } catch (err: any) {
    console.error("fetch-url error:", err);

    if (err?.name === "TimeoutError" || err?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return NextResponse.json({ error: "Tiempo de espera agotado al cargar la URL" }, { status: 504 });
    }

    return NextResponse.json({ error: "No se pudo acceder al link" }, { status: 500 });
  }
}
