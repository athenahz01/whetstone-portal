interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  type?: "button" | "submit";
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  primary = false,
  type = "button",
  className = "",
  style,
  disabled = false,
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 15,
    border: "1px solid rgba(148,163,184,0.18)",
    background: primary ? "#3b82f6" : "#111827",
    color: "#f8fafc",
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </button>
  );
}