import { MoonIcon, SunIcon } from "lucide-react";

interface ThemeToggleProps {
  theme: "dark" | "light";
  onToggle: () => void;
  collapsed?: boolean;
}

export function ThemeToggle({ theme, onToggle, collapsed }: ThemeToggleProps) {
  const label = theme === "dark" ? "Mode clair" : "Mode sombre";
  return (
    <button
      onClick={onToggle}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors duration-150 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"}`}
      aria-label={label}
    >
      {theme === "dark"
        ? <SunIcon className="w-4 h-4 flex-shrink-0" />
        : <MoonIcon className="w-4 h-4 flex-shrink-0" />
      }
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
