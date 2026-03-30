import type { ReactNode } from "react";

type AppLayoutProps = {
  title?: string;
  subtitle?: string;
  summary?: ReactNode;
  prelude?: ReactNode;
  sidebar?: ReactNode;
  main?: ReactNode;
  rightPanel?: ReactNode;
  children?: ReactNode;
};

export default function AppLayout({
  title,
  subtitle,
  summary,
  prelude,
  sidebar,
  main,
  rightPanel,
  children,
}: AppLayoutProps) {
  const mainContent = main ?? children;

  return (
    <div className="min-h-screen bg-background px-3 py-4 text-foreground sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-450 space-y-4">
        {title || subtitle || summary ? (
          <header className="rounded-3xl border border-border/80 bg-card/95 p-5 shadow-sm">
            {title ? (
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            ) : null}
            {subtitle ? (
              <p className="mt-2 max-w-5xl text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            {summary ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">{summary}</div>
            ) : null}
          </header>
        ) : null}

        {prelude ? <section className="space-y-4">{prelude}</section> : null}

        <section className="grid min-h-[72vh] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          {sidebar ? <aside className="min-h-0">{sidebar}</aside> : null}
          <main className="min-h-0">{mainContent}</main>
          {rightPanel ? <aside className="min-h-0">{rightPanel}</aside> : null}
        </section>
      </div>
    </div>
  );
}
