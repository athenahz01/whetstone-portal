interface TagProps {
    children: React.ReactNode;
    color: string;
  }
  
  export function Tag({ children, color }: TagProps) {
    return (
      <span
        className="text-xs px-2.5 py-1 rounded-md font-semibold whitespace-nowrap"
        style={{ background: `${color}14`, color }}
      >
        {children}
      </span>
    );
  }