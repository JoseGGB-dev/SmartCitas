import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { friendlyApiMessage } from "@/lib/api/errors";

export function LoadingPanel({ label = "Cargando informacion" }: { label?: string }) {
  return (
    <Card className="grid min-h-40 place-items-center p-6 text-center">
      <div>
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm font-semibold">{label}</p>
      </div>
    </Card>
  );
}

export function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Card className="border-destructive/25 bg-destructive/5 p-5">
      <p className="font-bold text-destructive">No pudimos cargar esta seccion</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{friendlyApiMessage(error)}</p>
      {retry && (
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={retry}>
          <RefreshCcw className="size-4" />
          Reintentar
        </Button>
      )}
    </Card>
  );
}

export function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid min-h-36 place-items-center border-dashed p-6 text-center">
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </Card>
  );
}
