import type { ReactNode } from "react";

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="surface-card space-y-3 p-5">
      <SectionTitle title={title} hint={hint} />
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>;
}

export function Loading() {
  return <p className="py-10 text-center text-sm text-muted-foreground">Cargando información del parque…</p>;
}
