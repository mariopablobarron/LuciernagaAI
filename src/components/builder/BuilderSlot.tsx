"use client";

import "@/lib/builder";
import { BuilderComponent } from "@builder.io/react";

export default function BuilderSlot({ model }: { model: string }) {
  return <BuilderComponent model={model} />;
}
