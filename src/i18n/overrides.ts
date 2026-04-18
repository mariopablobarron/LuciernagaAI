import { getPrismaClient } from "@/lib/prisma";

type MessagesTree = Record<string, unknown>;

function setByPath(tree: MessagesTree, path: string, value: string) {
  const segments = path.split(".");
  let node: Record<string, unknown> = tree;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const next = node[seg];
    if (typeof next !== "object" || next === null) {
      node[seg] = {};
    }
    node = node[seg] as Record<string, unknown>;
  }
  node[segments[segments.length - 1]] = value;
}

export async function applySiteContentOverrides(
  messages: MessagesTree,
  locale: string
): Promise<MessagesTree> {
  try {
    const prisma = getPrismaClient();
    const overrides = await prisma.siteContent.findMany({ where: { locale } });
    if (overrides.length === 0) return messages;
    const cloned = structuredClone(messages);
    for (const o of overrides) {
      setByPath(cloned, o.key, o.value);
    }
    return cloned;
  } catch {
    return messages;
  }
}
