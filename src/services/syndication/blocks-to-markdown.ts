/**
 * Convert BlockNote blocks (rich content JSON) to Markdown for syndication.
 *
 * BlockNote schema reference:
 *   https://www.blocknotejs.org/docs/editor-basics/document-structure
 *
 * Supported blocks: paragraph, heading, bulletListItem, numberedListItem,
 * quote, codeBlock, image, table.
 *
 * Inline styles handled: bold, italic, underline, strike, code, link.
 *
 * Unknown block types fall back to their plain-text `content` to avoid losing
 * material when the schema evolves.
 */

type InlineContent = {
  type?: string;
  text?: string;
  styles?: Record<string, boolean>;
  href?: string;
  content?: InlineContent[];
};

type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | string;
  children?: Block[];
};

function escapeMd(s: string): string {
  return s.replace(/([\\`*_{}\[\]()#+!-])/g, "\\$1");
}

function renderInline(items: InlineContent[] | undefined): string {
  if (!items) return "";
  return items
    .map((item) => {
      if (item.type === "link") {
        const inner = renderInline(item.content);
        return `[${inner}](${item.href ?? ""})`;
      }
      let text = item.text ?? "";
      if (!text && item.content) text = renderInline(item.content);
      const styles = item.styles ?? {};
      if (styles.code) text = `\`${text}\``;
      if (styles.bold) text = `**${text}**`;
      if (styles.italic) text = `*${text}*`;
      if (styles.strike) text = `~~${text}~~`;
      return text;
    })
    .join("");
}

function renderBlock(block: Block, depth = 0, numberedIndex = 0): string {
  const indent = "  ".repeat(Math.max(0, depth));
  const content = Array.isArray(block.content) ? renderInline(block.content) : (block.content ?? "");

  switch (block.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(block.props?.level) || 2));
      return `${"#".repeat(level)} ${content}\n\n`;
    }
    case "paragraph":
      return content ? `${content}\n\n` : "";
    case "bulletListItem":
      return `${indent}- ${content}\n${renderChildren(block.children, depth + 1)}`;
    case "numberedListItem":
      return `${indent}${numberedIndex + 1}. ${content}\n${renderChildren(block.children, depth + 1)}`;
    case "quote":
      return `> ${content}\n\n`;
    case "codeBlock": {
      const lang = String(block.props?.language ?? "");
      return `\`\`\`${lang}\n${typeof block.content === "string" ? block.content : content}\n\`\`\`\n\n`;
    }
    case "image": {
      const url = String(block.props?.url ?? "");
      const caption = String(block.props?.caption ?? block.props?.name ?? "");
      return url ? `![${escapeMd(caption)}](${url})\n\n` : "";
    }
    case "divider":
      return `---\n\n`;
    default:
      return content ? `${content}\n\n` : "";
  }
}

function renderChildren(children: Block[] | undefined, depth: number): string {
  if (!children || children.length === 0) return "";
  let numberedIndex = 0;
  return children
    .map((c) => {
      const idx = c.type === "numberedListItem" ? numberedIndex++ : 0;
      return renderBlock(c, depth, idx);
    })
    .join("");
}

/**
 * Convert BlockNote blocks to a Markdown string suitable for syndication.
 * If blocks is null/empty, returns null so caller can fall back to plain content.
 */
export function blocksToMarkdown(blocks: unknown): string | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  let numberedIndex = 0;
  const md = blocks
    .map((b: Block) => {
      const idx = b.type === "numberedListItem" ? numberedIndex++ : 0;
      if (b.type !== "numberedListItem") numberedIndex = 0;
      return renderBlock(b, 0, idx);
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return md.length > 0 ? md : null;
}
