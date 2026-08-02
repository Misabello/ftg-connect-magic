import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/ftg/PageHeader";
import { Button } from "@/components/ui/button";

export function StagePlaceholder({
  title,
  description,
  stage,
  icon: Icon,
  bullets,
}: {
  title: string;
  description: string;
  stage: string;
  icon: LucideIcon;
  bullets: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="surface-card p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Previsto para la {stage}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          El módulo está incluido en la arquitectura y en el modelo de datos. Se implementa funcionalmente en
          la etapa indicada, una vez validada la etapa anterior.
        </p>
        <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {b}
            </li>
          ))}
        </ul>
        <Button asChild variant="secondary" className="mt-7">
          <Link to="/inicio">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}