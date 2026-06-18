import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") ?? "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  return { theme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark") };
}
