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
    padding: "9px 18px",
    borderRadius: 8,
    border: primary ? "none" : "1px solid #303030",
    background: primary ? "#6c8cff" : "#222",
    color: primary ? "#fff" : "#ccc",
    fontWeight: 500,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.5 : 1,
    letterSpacing: "-0.01em",
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