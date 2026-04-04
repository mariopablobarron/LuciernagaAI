import { fetchOneEntry } from '@builder.io/sdk-react';

export const BUILDER_API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY ?? '';

export async function getBuilderContent(model: string, urlPath: string) {
  return fetchOneEntry({
    model,
    apiKey: BUILDER_API_KEY,
    options: {
      url: urlPath,
    },
  });
}
