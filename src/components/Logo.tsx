interface LogoIconProps {
  size?: number;
  theme?: "dark" | "light";
}

interface LogoProps extends LogoIconProps {
  appName?: string;
  showWordmark?: boolean;
}

export function LogoIcon({ size = 48, theme = "dark" }: LogoIconProps) {
  const bg     = theme === "dark" ? "#0D0D0D" : "#1E1B4B";
  const gold   = "#F5C188";
  const goldDk = "#C9924A";
  const sep    = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Coboloro logo"
    >
      <rect width="48" height="48" rx="12" fill={bg} />

      {/* Barre de titre subtile */}
      <line x1="5" y1="14" x2="43" y2="14" stroke={sep} strokeWidth="1" />

      {/* 3 dots */}
      <circle cx="10" cy="10" r="1.5" fill="white" opacity="0.25" />
      <circle cx="15" cy="10" r="1.5" fill="white" opacity="0.25" />
      <circle cx="20" cy="10" r="1.5" fill="white" opacity="0.25" />

      {/* Prompt >_ en or */}
      <text
        x="5"
        y="32"
        fontSize="13"
        fill={gold}
        fontFamily="monospace"
        fontWeight="bold"
      >
        &gt;_
      </text>

      {/* Pièce d'or */}
      <ellipse cx="38.5" cy="34" rx="5.5" ry="1.8" fill="#000" opacity="0.35" />
      <circle cx="38" cy="29" r="5.5" fill={goldDk} />
      <circle cx="38" cy="29" r="4.8" fill={gold} />
      {/* Reflet */}
      <ellipse
        cx="36.2"
        cy="26.8"
        rx="2.1"
        ry="1.3"
        fill="white"
        opacity="0.24"
        transform="rotate(-20 36.2 26.8)"
      />
      {/* Symbole € */}
      <path
        d="M40 27 C38.7 25.7 35.5 26.2 35.2 29.2 C34.9 32.2 36.6 33.6 38.8 33.2"
        stroke="#7A4A10"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="33.5" y1="29.2" x2="37.5" y2="29.2" stroke="#7A4A10" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="33.5" y1="31.4" x2="37.5" y2="31.4" stroke="#7A4A10" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  size = 40,
  theme = "dark",
  appName = "Coboloro",
  showWordmark = true,
}: LogoProps) {
  const textCol = theme === "dark" ? "#F5F0E8" : "#0F172A";
  const accent  = theme === "dark" ? "#F5C188" : "#4F7EFF";
  const base    = appName.slice(0, -3);
  const oro     = appName.slice(-3);

  if (!showWordmark) return <LogoIcon size={size} theme={theme} />;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <LogoIcon size={size} theme={theme} />
      <span
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: size * 0.44,
          fontWeight: 700,
          color: textCol,
          letterSpacing: "-0.5px",
        }}
      >
        {base}
        <span style={{ color: accent }}>{oro}</span>
      </span>
    </div>
  );
}
