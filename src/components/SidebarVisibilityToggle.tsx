import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function SidebarVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="absolute top-3 left-3 z-40 bg-background/90 backdrop-blur"
      title={visible ? "Masquer la barre latérale" : "Afficher la barre latérale"}
      aria-label={visible ? "Masquer la barre latérale" : "Afficher la barre latérale"}
    >
      {visible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </Button>
  );
}
