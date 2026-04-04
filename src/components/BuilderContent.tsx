'use client';

import { Content, fetchOneEntry } from '@builder.io/sdk-react';
import { BUILDER_API_KEY } from '@/lib/builder';
import { customComponents } from '@/lib/builderComponents';

type BuilderContentData = Awaited<ReturnType<typeof fetchOneEntry>>;

interface BuilderContentProps {
  model: string;
  content: BuilderContentData;
}

export default function BuilderContent({ model, content }: BuilderContentProps) {
  if (!content) return null;

  return (
    <Content
      model={model}
      content={content}
      apiKey={BUILDER_API_KEY}
      customComponents={customComponents}
    />
  );
}
