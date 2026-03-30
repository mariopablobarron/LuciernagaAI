import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminPanelProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminPanel({ id, title, description, children }: AdminPanelProps) {
  return (
    <Card
      id={id}
      className="border-border/80 bg-card/95 shadow-sm"
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
