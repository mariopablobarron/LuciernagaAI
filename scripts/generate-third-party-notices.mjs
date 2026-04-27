// Genera THIRD_PARTY_NOTICES.md a partir de las dependencias de producción.
// Uso: npm run legal:notices
//
// El fichero generado lista todas las dependencias agrupadas por licencia,
// con el repo cuando está disponible. Los textos completos de licencia se
// conservan en node_modules/<paquete>/LICENSE.

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const today = new Date().toISOString().slice(0, 10);

const json = execSync("npx license-checker --production --json", {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const data = JSON.parse(json);

const groups = new Map();
for (const [pkg, info] of Object.entries(data)) {
  if (pkg.startsWith("luciernaga-ai@")) continue;
  const atIdx = pkg.lastIndexOf("@");
  const name = pkg.slice(0, atIdx);
  const version = pkg.slice(atIdx + 1);
  let lic = info.licenses ?? "UNKNOWN";
  if (Array.isArray(lic)) lic = lic.join(", ");
  if (!groups.has(lic)) groups.set(lic, []);
  groups.get(lic).push({ name, version, repo: info.repository ?? "" });
}

const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
const total = [...groups.values()].reduce((acc, items) => acc + items.length, 0);

const lines = [];
lines.push("# Third-Party Notices");
lines.push("");
lines.push(
  "Tres Mil Millones de Latidos (mentor-web) hace uso de software de terceros bajo las licencias indicadas a continuación. Los textos completos de cada licencia se conservan en `node_modules/<paquete>/LICENSE` o `node_modules/<paquete>/LICENSE.md` cuando aplica.",
);
lines.push("");
lines.push(`Generado: ${today} · Total: ${total} dependencias de producción`);
lines.push("");
lines.push("## Resumen por licencia");
lines.push("");
lines.push("| Licencia | Cantidad |");
lines.push("|---|---|");
for (const [lic, items] of sortedGroups) {
  lines.push(`| ${lic} | ${items.length} |`);
}
lines.push("");

for (const [lic, items] of sortedGroups) {
  lines.push(`## ${lic}`);
  lines.push("");
  items.sort((a, b) => a.name.localeCompare(b.name));
  for (const { name, version, repo } of items) {
    lines.push(`- \`${name}@${version}\`${repo ? ` — ${repo}` : ""}`);
  }
  lines.push("");
}

writeFileSync("THIRD_PARTY_NOTICES.md", lines.join("\n"), "utf8");
console.log(`THIRD_PARTY_NOTICES.md generado · ${total} dependencias`);
