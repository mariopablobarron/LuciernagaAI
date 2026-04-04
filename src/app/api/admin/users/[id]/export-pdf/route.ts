import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/db/prisma";
import { resolveAdminAuth } from "@/lib/admin-auth";

// GET /api/admin/users/[id]/export-pdf
// Returns an HTML document styled for printing that the browser can print-to-PDF
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = resolveAdminAuth(req);
  if (!auth.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = await params;
  const prisma = getPrismaClient();

  const [user, messages, state, notes, assessments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 500,
      select: { role: true, content: true, createdAt: true, conversationId: true },
    }),
    prisma.userState.findUnique({
      where: { userId },
      select: { state: true, primaryEmotion: true, dominantPattern: true, riskLevel: true, updatedAt: true },
    }),
    prisma.clinicalNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true },
    }),
    prisma.assessment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { response: true },
      take: 20,
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });

  const SEVERITY_LABELS: Record<string, string> = {
    minimal: "Mínimo", mild: "Leve", moderate: "Moderado",
    moderately_severe: "Mod. severo", severe: "Severo",
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Expediente — ${user.name ?? user.email}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 11pt; color: #111; background: #fff; padding: 2cm; }
  h1 { font-size: 18pt; margin-bottom: 4pt; }
  h2 { font-size: 13pt; margin: 20pt 0 8pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
  h3 { font-size: 11pt; margin-bottom: 4pt; }
  .meta { color: #555; font-size: 9pt; margin-bottom: 16pt; }
  .message { margin-bottom: 8pt; }
  .role { font-weight: bold; font-size: 9pt; text-transform: uppercase; color: #555; }
  .user-msg { background: #f5f5f5; padding: 6pt 8pt; border-radius: 4pt; }
  .ai-msg   { padding: 6pt 8pt; border-left: 2px solid #ccc; }
  .note { background: #fffbeb; border-left: 3px solid #d97706; padding: 6pt 8pt; margin-bottom: 6pt; }
  .assessment { border: 1px solid #ddd; padding: 8pt; border-radius: 4pt; margin-bottom: 8pt; }
  .severity { font-weight: bold; }
  @media print { body { padding: 1cm; } }
</style>
</head>
<body>
<h1>Expediente clínico — Luciernaga AI</h1>
<div class="meta">
  <p>Usuario: ${user.name ?? "-"} &lt;${user.email}&gt;</p>
  <p>ID: ${user.id} · Registro: ${fmt(user.createdAt)}</p>
  <p>Estado actual: ${state?.state ?? "-"} · Emoción: ${state?.primaryEmotion ?? "-"} · Riesgo: ${state?.riskLevel ?? "-"}</p>
  <p>Generado: ${fmt(new Date())}</p>
</div>

${notes.length > 0 ? `
<h2>Notas clínicas (${notes.length})</h2>
${notes.map((n) => `<div class="note"><p>${n.content.replace(/\n/g, "<br/>")}</p><p class="meta">${fmt(n.createdAt)}</p></div>`).join("")}
` : ""}

${assessments.length > 0 ? `
<h2>Evaluaciones (${assessments.length})</h2>
${assessments.map((a) => `
<div class="assessment">
  <h3>${a.title}</h3>
  <p>Estado: ${a.status === "completed" ? "Completada" : "Pendiente"} · ${fmt(a.createdAt)}</p>
  ${a.response ? `<p class="severity">Puntuación: ${a.response.totalScore} — ${SEVERITY_LABELS[a.response.severity] ?? a.response.severity}</p>` : ""}
</div>`).join("")}
` : ""}

<h2>Historial de conversaciones (${messages.length} mensajes)</h2>
${messages.map((m) => `
<div class="message">
  <p class="role">${m.role === "user" ? "Usuario" : "Luciernaga AI"} · ${fmt(m.createdAt)}</p>
  <div class="${m.role === "user" ? "user-msg" : "ai-msg"}">
    <p>${m.content.replace(/\n/g, "<br/>")}</p>
  </div>
</div>`).join("")}

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="expediente-${userId}.html"`,
    },
  });
}
