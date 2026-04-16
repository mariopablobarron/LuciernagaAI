"use client";

import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

type BlockEditorProps = {
  className?: string;
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  editable?: boolean;
};

export default function BlockEditor({
  className = "",
  initialBlocks,
  onChange,
  editable = true,
}: BlockEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
  });
  const { resolvedTheme } = useTheme();

  // Sync editable state
  useEffect(() => {
    // BlockNote exposes `isEditable` as a settable property on the editor instance;
    // this is the documented way to toggle edit mode post-mount.
    // eslint-disable-next-line react-hooks/immutability
    editor.isEditable = editable;
  }, [editor, editable]);

  // Emit changes
  useEffect(() => {
    if (!onChange) return;
    const handler = () => {
      onChange(editor.document as Block[]);
    };
    editor.onChange(handler);
  }, [editor, onChange]);

  const wrapperClassName = useMemo(() => {
    const base =
      "h-full min-h-[320px] rounded-2xl border border-border/80 bg-card/95 p-3 shadow-sm";
    return className ? `${base} ${className}` : base;
  }, [className]);

  return (
    <section className={wrapperClassName}>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        className="h-full [&_.bn-container]:h-full [&_.bn-editor]:min-h-[280px]"
      />
    </section>
  );
}

/**
 * Extract plain text from BlockNote blocks for search/fallback.
 */
export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      const text = block.content
        .map((inline: { type: string; text?: string }) =>
          inline.type === "text" ? inline.text ?? "" : ""
        )
        .join("");
      if (text) lines.push(text);
    }
    if (block.children && block.children.length > 0) {
      const childText = blocksToPlainText(block.children as Block[]);
      if (childText) lines.push(childText);
    }
  }
  return lines.join("\n");
}
