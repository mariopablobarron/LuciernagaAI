import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyOrgToken } from "@/lib/org-auth";

/**
 * GET /api/org/docs?token=...&format=md|html
 *
 * Returns the organization manual for authenticated org admins.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !verifyOrgToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "md";
  const filePath = join(process.cwd(), "docs", "manual-organizaciones.md");

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  if (format === "md") {
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  // Reuse the same markdown-to-HTML logic from admin docs
  const bodyHtml = mdToHtml(content);
  const now = new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Manual para organizaciones — Tres Mil Millones de Latidos</title>
<style>
  @page { size: A4; margin: 1.5cm 2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10.5pt; line-height: 1.6; color: #1a1a1a; background: #fff;
    padding: 2cm; max-width: 210mm; margin: 0 auto;
  }
  h1 { font-size: 22pt; margin: 24pt 0 8pt; color: #111; }
  h2 { font-size: 15pt; margin: 20pt 0 6pt; padding-bottom: 4pt; border-bottom: 2px solid #7c3aed; color: #4c1d95; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; color: #5b21b6; }
  p { margin: 6pt 0; }
  ul, ol { margin: 6pt 0 6pt 20pt; }
  li { margin: 3pt 0; }
  blockquote { border-left: 3px solid #7c3aed; padding: 8pt 12pt; margin: 8pt 0; background: #f5f3ff; font-style: italic; color: #4c1d95; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8pt 0; }
  th { background: #f5f3ff; color: #4c1d95; font-weight: 700; text-align: left; padding: 6pt 8pt; border: 1px solid #ddd5f5; font-size: 8.5pt; text-transform: uppercase; }
  td { padding: 5pt 8pt; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16pt 0; }
  strong { color: #111; }
  .print-header { text-align: center; margin-bottom: 20pt; padding-bottom: 12pt; border-bottom: 3px solid #7c3aed; }
  .print-header h1 { font-size: 26pt; color: #4c1d95; margin: 0; }
  .print-header p { color: #666; font-size: 9pt; margin-top: 4pt; }
  .print-footer { text-align: center; margin-top: 24pt; padding-top: 12pt; border-top: 1px solid #e5e7eb; color: #999; font-size: 8pt; }
  .print-btn { position: fixed; top: 16px; right: 16px; z-index: 100; background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Imprimir / Guardar PDF</button>
<div class="print-header">
  <h1>Tres Mil Millones de Latidos</h1>
  <p>Manual para organizaciones · Generado: ${now}</p>
</div>
${bodyHtml}
<div class="print-footer">
  <p>Tres Mil Millones de Latidos — Producto de Startidea</p>
  <p>Documento generado el ${now}</p>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'inline; filename="manual-organizaciones.html"',
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Markdown → HTML (same logic as admin docs endpoint)                */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  let r = s;
  r = r.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  r = r.replace(/\*(.+?)\*/g, "<em>$1</em>");
  r = r.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>');
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6d28d9;">$1</a>');
  return r;
}

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inCode = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { if (inList) { out.push("</ul>"); inList = false; } out.push('<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;font-size:9pt;"><code>'); inCode = true; }
      continue;
    }
    if (inCode) { out.push(escapeHtml(line)); continue; }

    if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push(""); continue;
    }

    if (/^-{3,}$/.test(line.trim())) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push("<hr/>"); continue;
    }

    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { out.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) { if (inList) { out.push("</ul>"); inList = false; } if (inTable) { out.push("</tbody></table></div>"); inTable = false; } out.push(`<h2>${inline(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { if (inList) { out.push("</ul>"); inList = false; } if (inTable) { out.push("</tbody></table></div>"); inTable = false; } out.push(`<h1>${inline(h1[1])}</h1>`); continue; }

    if (line.trim().startsWith("> ")) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<blockquote>${inline(line.trim().slice(2))}</blockquote>`); continue; }

    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      if (!inTable) {
        if (inList) { out.push("</ul>"); inList = false; }
        inTable = true;
        out.push('<div style="overflow-x:auto;margin:8pt 0;"><table><thead><tr>');
        for (const h of cells) out.push(`<th>${inline(h)}</th>`);
        out.push("</tr></thead><tbody>");
        continue;
      }
      out.push("<tr>");
      for (const c of cells) out.push(`<td>${inline(c)}</td>`);
      out.push("</tr>"); continue;
    }

    if (inTable && !line.includes("|")) { out.push("</tbody></table></div>"); inTable = false; }

    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, "");
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(content)}</li>`); continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const content = line.replace(/^\s*\d+\.\s+/, "");
      if (!inList) { out.push('<ul style="list-style-type:decimal;">'); inList = true; }
      out.push(`<li>${inline(content)}</li>`); continue;
    }

    if (inList) { out.push("</ul>"); inList = false; }
    if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
  }

  if (inList) out.push("</ul>");
  if (inTable) out.push("</tbody></table></div>");
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}
