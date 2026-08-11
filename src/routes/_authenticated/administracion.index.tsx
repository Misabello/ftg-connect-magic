import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/administracion/")({
  beforeLoad: () => {
    throw redirect({ to: "/administracion/cobrar" });
  },
});
