import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function RightPanel({ goal }: any) {
  return (
    <div className="hidden w-80 border-l p-4 lg:block">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Objetivo</h3>

        <p className="text-sm text-muted-foreground">{goal?.title || "Sin objetivo activo"}</p>

        <Progress value={goal?.progress || 0} />

        <Badge>
          {goal?.completed || 0}/{goal?.total || 0} acciones
        </Badge>
      </Card>
    </div>
  );
}
