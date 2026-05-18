/**
 * Conversor JSON → Markdown del export del usuario.
 *
 * Recibe la respuesta de /api/user/export y genera un .md descargable.
 * Cero dependencias. Markdown legible por humanos y reabrible en editores
 * de texto, Obsidian, Notion, Google Docs.
 *
 * Patrón: lo más simple que cumple "derecho a portabilidad" (GDPR Art. 20)
 * sin pasar por servidor. El usuario obtiene SUS datos sin tener que dar
 * email para recibirlos.
 */

type ExportData = {
  exportedAt: string;
  user: {
    email?: string | null;
    name?: string | null;
    role?: string | null;
    createdAt?: string | null;
  } | null;
  conversations?: Array<{
    id: string;
    title: string | null;
    createdAt: string;
    messageRecords?: Array<{
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  goals?: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    actions?: Array<{ description: string; completed: boolean; createdAt: string }>;
  }>;
  diaryEntries?: Array<{
    createdAt: string;
    content?: string | null;
    blocks?: unknown;
  }>;
};

function fmtDate(iso: string | null | undefined, locale = "es"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function isSyntheticEmailLooseGuess(email: string | null | undefined): boolean {
  if (!email) return true;
  return /@anon\.|@anonymous\.|@local\.|@temp\.|@synthetic\.|@bootstrap\./i.test(email);
}

/**
 * Devuelve string Markdown listo para descargar como blob.
 */
export function exportToMarkdown(data: ExportData, locale = "es"): string {
  const lines: string[] = [];

  // Encabezado
  lines.push("# Tres Mil Millones de Latidos — Mi exportación");
  lines.push("");
  lines.push(`_Exportado: ${fmtDate(data.exportedAt, locale)}_`);
  lines.push("");

  // Identidad
  if (data.user) {
    lines.push("## Sobre tu cuenta");
    lines.push("");
    const anonymous = isSyntheticEmailLooseGuess(data.user.email);
    lines.push(`- **Identidad**: ${anonymous ? "Anónimo (sin email vinculado)" : data.user.email}`);
    if (data.user.name) lines.push(`- **Nombre**: ${data.user.name}`);
    if (data.user.createdAt) lines.push(`- **Cuenta creada**: ${fmtDate(data.user.createdAt, locale)}`);
    lines.push("");
  }

  // Conversaciones
  const conversations = data.conversations ?? [];
  if (conversations.length > 0) {
    lines.push(`## Conversaciones (${conversations.length})`);
    lines.push("");

    for (const conv of conversations) {
      const title = conv.title?.trim() || "Sin título";
      lines.push(`### ${title}`);
      lines.push(`_${fmtDate(conv.createdAt, locale)}_`);
      lines.push("");

      const messages = conv.messageRecords ?? [];
      if (messages.length === 0) {
        lines.push("_(sin mensajes)_");
        lines.push("");
        continue;
      }

      for (const m of messages) {
        const speaker = m.role === "user" ? "**Tú**" : "**Mentor**";
        lines.push(`${speaker} · _${fmtDate(m.createdAt, locale)}_`);
        lines.push("");
        // Indentar el contenido como cita (>) para distinguir visualmente.
        const escaped = m.content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
        lines.push(escaped);
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  // Objetivos
  const goals = data.goals ?? [];
  if (goals.length > 0) {
    lines.push(`## Objetivos (${goals.length})`);
    lines.push("");

    for (const g of goals) {
      lines.push(`### ${g.title}`);
      lines.push(`_${g.status} · ${fmtDate(g.createdAt, locale)}_`);
      lines.push("");
      const actions = g.actions ?? [];
      if (actions.length > 0) {
        for (const a of actions) {
          const marker = a.completed ? "[x]" : "[ ]";
          lines.push(`- ${marker} ${a.description}`);
        }
        lines.push("");
      }
    }
  }

  // Diario
  const diary = data.diaryEntries ?? [];
  if (diary.length > 0) {
    lines.push(`## Diario (${diary.length} entradas)`);
    lines.push("");
    for (const entry of diary) {
      lines.push(`### ${fmtDate(entry.createdAt, locale)}`);
      if (entry.content) {
        lines.push("");
        lines.push(entry.content);
      }
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("_Estos datos te pertenecen. Tres Mil Millones de Latidos · tresmilmillonesdelatidos.es_");

  return lines.join("\n");
}

/**
 * Dispara la descarga de un string como archivo. Cliente-only.
 */
export function downloadAsFile(content: string, filename: string, mimeType = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberar memoria del blob tras un tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
