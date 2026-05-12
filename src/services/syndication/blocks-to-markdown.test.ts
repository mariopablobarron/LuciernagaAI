import { blocksToMarkdown } from "./blocks-to-markdown";

describe("blocksToMarkdown", () => {
  it("returns null for empty/missing blocks", () => {
    expect(blocksToMarkdown(null)).toBeNull();
    expect(blocksToMarkdown([])).toBeNull();
    expect(blocksToMarkdown(undefined)).toBeNull();
  });

  it("renders headings with correct level", () => {
    const blocks = [
      { type: "heading", props: { level: 1 }, content: [{ text: "Title" }] },
      { type: "heading", props: { level: 2 }, content: [{ text: "Section" }] },
      { type: "heading", props: { level: 3 }, content: [{ text: "Sub" }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("# Title");
    expect(md).toContain("## Section");
    expect(md).toContain("### Sub");
  });

  it("renders paragraphs separated by blank lines", () => {
    const blocks = [
      { type: "paragraph", content: [{ text: "First." }] },
      { type: "paragraph", content: [{ text: "Second." }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toMatch(/First\.\n\nSecond\./);
  });

  it("applies inline styles: bold, italic, code", () => {
    const blocks = [
      {
        type: "paragraph",
        content: [
          { text: "plain " },
          { text: "bold", styles: { bold: true } },
          { text: " " },
          { text: "italic", styles: { italic: true } },
          { text: " " },
          { text: "code", styles: { code: true } },
        ],
      },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe("plain **bold** *italic* `code`");
  });

  it("renders links", () => {
    const blocks = [
      {
        type: "paragraph",
        content: [
          { text: "go to " },
          { type: "link", href: "https://example.com", content: [{ text: "example" }] },
        ],
      },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe("go to [example](https://example.com)");
  });

  it("renders bullet and numbered lists", () => {
    const blocks = [
      { type: "bulletListItem", content: [{ text: "first" }] },
      { type: "bulletListItem", content: [{ text: "second" }] },
      { type: "numberedListItem", content: [{ text: "one" }] },
      { type: "numberedListItem", content: [{ text: "two" }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("- first");
    expect(md).toContain("- second");
    expect(md).toContain("1. one");
    expect(md).toContain("2. two");
  });

  it("renders code blocks with language", () => {
    const blocks = [
      { type: "codeBlock", props: { language: "typescript" }, content: "const x = 1;" },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("```typescript");
    expect(md).toContain("const x = 1;");
    expect(md).toContain("```");
  });

  it("renders images with caption", () => {
    const blocks = [
      { type: "image", props: { url: "https://img.example/cat.png", caption: "A cat" } },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toBe("![A cat](https://img.example/cat.png)");
  });

  it("renders quotes", () => {
    const blocks = [{ type: "quote", content: [{ text: "a quote" }] }];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("> a quote");
  });

  it("falls back gracefully on unknown block types", () => {
    const blocks = [{ type: "weird_custom_block", content: [{ text: "fallback text" }] }];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("fallback text");
  });

  it("collapses excessive blank lines", () => {
    const blocks = [
      { type: "paragraph", content: [{ text: "a" }] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [{ text: "b" }] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).not.toMatch(/\n{3,}/);
  });
});
