import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  component: Health,
});

function Health() {
  return <div className="p-4 font-mono text-sm">ok</div>;
}
