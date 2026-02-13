import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeToggle();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Alternar tema"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
