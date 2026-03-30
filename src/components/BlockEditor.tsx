"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

type BlockEditorProps = {
  className?: string;
};

export default function BlockEditor({ className = "" }: BlockEditorProps) {
  const editor = useCreateBlockNote();
  const { resolvedTheme } = useTheme();

  const wrapperClassName = useMemo(() => {
    const base =
      "h-full min-h-[520px] rounded-3xl border border-border/80 bg-card/95 p-4 shadow-sm";
    return className ? `${base} ${className}` : base;
  }, [className]);

  return (
    <section className={wrapperClassName}>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        className="h-full [&_.bn-container]:h-full [&_.bn-editor]:min-h-[460px]"
      />
    </section>
  );
}
