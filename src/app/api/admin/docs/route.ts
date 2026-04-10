import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { requireAdminPermission } from "@/lib/admin-auth";

const DOCS: Record<string, { file: string; title: string }> = {
  guia: { file: "GUIA-LUCIERNAGAS.md", title: "Guia completa de la plataforma" },
  usuario: { file: "manual-usuarios-finales.md", title: "Manual de usuario" },
  organizaciones: { file: "manual-organizaciones.md", title: "Manual para organizaciones" },
  admin: { file: "manual-admin.md", title: "Manual de administracion" },
};

function mdToHtml(md: string): string {
  let html = md;

  // Escape HTML entities inside content (but preserve our generated tags)
  // We'll process line by line instead

  const lines = html.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inCode = false;
  let inList = false;
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        out.push('<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;font-size:9pt;"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push("");
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim())) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push("<hr/>");
      continue;
    }

    // Headers
    const h6 = line.match(/^######\s+(.*)/);
    if (h6) { out.push(`<h6>${inline(h6[1])}</h6>`); continue; }
    const h5 = line.match(/^#####\s+(.*)/);
    if (h5) { out.push(`<h5>${inline(h5[1])}</h5>`); continue; }
    const h4 = line.match(/^####\s+(.*)/);
    if (h4) { out.push(`<h4>${inline(h4[1])}</h4>`); continue; }
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { out.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push(`<h2>${inline(h2[1])}</h2>`);
      continue;
    }
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) {
      if (inList) { out.push("</ul>"); inList = false; }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
      out.push(`<h1>${inline(h1[1])}</h1>`);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<blockquote>${inline(line.trim().slice(2))}</blockquote>`);
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      // Separator line
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      if (!inTable) {
        if (inList) { out.push("</ul>"); inList = false; }
        inTable = true;
        tableHeaders = cells;
        out.push('<div style="overflow-x:auto;margin:8pt 0;"><table>');
        out.push("<thead><tr>");
        for (const h of cells) out.push(`<th>${inline(h)}</th>`);
        out.push("</tr></thead><tbody>");
        continue;
      }
      out.push("<tr>");
      for (const c of cells) out.push(`<td>${inline(c)}</td>`);
      out.push("</tr>");
      continue;
    }

    // Close table if we're no longer in one
    if (inTable && !line.includes("|")) {
      out.push("</tbody></table></div>");
      inTable = false;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, "");
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inline(content)}</li>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const content = line.replace(/^\s*\d+\.\s+/, "");
      if (!inList) { out.push('<ul style="list-style-type:decimal;">'); inList = true; }
      out.push(`<li>${inline(content)}</li>`);
      continue;
    }

    // Close list if we're no longer in one
    if (inList) { out.push("</ul>"); inList = false; }

    // Paragraph
    if (line.trim()) {
      out.push(`<p>${inline(line.trim())}</p>`);
    }
  }

  if (inList) out.push("</ul>");
  if (inTable) out.push("</tbody></table></div>");
  if (inCode) out.push("</code></pre>");

  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  let r = s;
  // Bold
  r = r.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  r = r.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  r = r.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>');
  // Links
  r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#6d28d9;">$1</a>');
  return r;
}

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, "docs");
  if (auth instanceof NextResponse) return auth;

  const doc = req.nextUrl.searchParams.get("doc");
  const format = req.nextUrl.searchParams.get("format") ?? "html";

  if (!doc || !DOCS[doc]) {
    return NextResponse.json(
      { error: "Parametro doc invalido. Opciones: guia, usuario, organizaciones, admin" },
      { status: 400 },
    );
  }

  const { file, title } = DOCS[doc];
  const filePath = join(process.cwd(), "docs", file);

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    return NextResponse.json({ error: `Archivo ${file} no encontrado` }, { status: 404 });
  }

  if (format === "md") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file}"`,
      },
    });
  }

  const bodyHtml = mdToHtml(content);
  const now = new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${title} — Tres Mil Millones de Latidos</title>
<style>
  @page { size: A4; margin: 1.5cm 2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10.5pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    padding: 2cm;
    max-width: 210mm;
    margin: 0 auto;
  }
  h1 {
    font-size: 22pt;
    margin: 24pt 0 8pt;
    color: #111;
    page-break-after: avoid;
  }
  h2 {
    font-size: 15pt;
    margin: 20pt 0 6pt;
    padding-bottom: 4pt;
    border-bottom: 2px solid #7c3aed;
    color: #4c1d95;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    margin: 14pt 0 4pt;
    color: #5b21b6;
    page-break-after: avoid;
  }
  h4 {
    font-size: 11pt;
    margin: 10pt 0 4pt;
    color: #6d28d9;
  }
  p { margin: 6pt 0; }
  ul, ol { margin: 6pt 0 6pt 20pt; }
  li { margin: 3pt 0; }
  blockquote {
    border-left: 3px solid #7c3aed;
    padding: 8pt 12pt;
    margin: 8pt 0;
    background: #f5f3ff;
    font-style: italic;
    color: #4c1d95;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin: 8pt 0;
  }
  th {
    background: #f5f3ff;
    color: #4c1d95;
    font-weight: 700;
    text-align: left;
    padding: 6pt 8pt;
    border: 1px solid #ddd5f5;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  td {
    padding: 5pt 8pt;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafafa; }
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 16pt 0;
  }
  code {
    background: #f3f4f6;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
  }
  pre {
    background: #f3f4f6;
    padding: 12pt;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9pt;
    margin: 8pt 0;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; }
  a { color: #6d28d9; text-decoration: none; }
  strong { color: #111; }

  .print-header {
    text-align: center;
    margin-bottom: 20pt;
    padding-bottom: 12pt;
    border-bottom: 3px solid #7c3aed;
  }
  .print-header h1 { font-size: 26pt; color: #4c1d95; margin: 0; border: none; }
  .print-header p { color: #666; font-size: 9pt; margin-top: 4pt; }
  .print-footer {
    text-align: center;
    margin-top: 24pt;
    padding-top: 12pt;
    border-top: 1px solid #e5e7eb;
    color: #999;
    font-size: 8pt;
  }

  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    h2, h3 { page-break-after: avoid; }
    table, pre, blockquote { page-break-inside: avoid; }
  }

  .print-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 100;
    background: #7c3aed;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(124,58,237,0.3);
  }
  .print-btn:hover { background: #6d28d9; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Imprimir / Guardar PDF</button>

<div class="print-header">
  <h1>Tres Mil Millones de Latidos</h1>
  <p>${title} · Generado: ${now}</p>
</div>

${bodyHtml}

<div class="print-footer">
  <p>Tres Mil Millones de Latidos — Producto de Startidea · Fundador: Mario Pablo Sanchez Barron</p>
  <p>Documento generado el ${now}</p>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${file.replace(".md", ".html")}"`,
    },
  });
}
