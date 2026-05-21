import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/asuka/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});