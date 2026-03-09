interface CardProps {
    children: React.ReactNode;
    noPadding?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
  }
  
  export function Card({ children, noPadding, className = "", style, onClick }: CardProps) {
    return (
      <div
        onClick={onClick}
        style={style}
        className={`bg-white rounded-2xl ${noPadding ? "" : "p-6"} ${onClick ? "cursor-pointer hover-lift" : ""} ${className}`}
      >
        {children}
      </div>
    );
  }