const REPO = "mariopablobarron/tresmilmillonesdelatidos";

const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : "—";

export async function buildDeployMessage(): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return `❌ No pude consultar GitHub (HTTP ${res.status}).`;
    }

    const data = (await res.json()) as {
      sha: string;
      commit: { message: string; author: { name: string; date: string } };
      html_url: string;
    };

    const sha = data.sha.slice(0, 7);
    const firstLine = (data.commit.message ?? "").split("\n")[0].slice(0, 120);
    const author = data.commit.author?.name ?? "—";
    const when = fmtDate(data.commit.author?.date);

    return [
      `🚀 *HEAD de \`main\`*`,
      "",
      `\`${sha}\` — ${author}`,
      `${when}`,
      `_${firstLine}_`,
      "",
      `⚠️ Coolify no auto-despliega. Lo desplegado puede no ser este HEAD si no has hecho Force Redeploy.`,
    ].join("\n");
  } catch (error) {
    return `❌ Error consultando GitHub: ${error instanceof Error ? error.message : String(error)}`;
  }
}
