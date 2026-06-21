import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={
        theme === "dark"
          ? "h-8 w-8 rounded-full border border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
          : "h-8 w-8 rounded-full border border-foreground/25 text-muted-foreground hover:text-foreground hover:border-primary/50"
      }
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
