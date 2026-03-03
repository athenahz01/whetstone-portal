interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    primary?: boolean;
    type?: "button" | "submit";
  }
  
  export function Button({ children, onClick, primary, type = "button" }: ButtonProps) {
    return (
      <button
        onClick={onClick}
        type={type}
        className={`px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
          primary
            ? "bg-accent text-white border-none hover:opacity-90"
            : "bg-white text-body border border-line-dk hover:bg-mist"
        }`}
      >
        {children}
      </button>
    );
  }