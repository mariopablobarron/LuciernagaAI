type Crumb = { name: string; url: string };

const BASE_URL = "https://tresmilmillonesdelatidos.es";

/**
 * Emits a BreadcrumbList JSON-LD schema. AI search engines use breadcrumbs
 * to understand the hierarchical context of a page — helps them cite
 * pages correctly in AI-generated answers (e.g., "según la página X de
 * Tres Mil Millones de Latidos, dentro de la sección Y").
 *
 * Include this in page.tsx (server component) for pages that sit more
 * than one level deep or that benefit from explicit hierarchy context.
 */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${BASE_URL}${c.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
