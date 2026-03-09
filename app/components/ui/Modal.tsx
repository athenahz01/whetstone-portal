interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }
  
  export function Modal({ title, onClose, children }: ModalProps) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-raised rounded-2xl w-[520px] max-h-[85vh] overflow-auto"
          style={{ border: "1px solid #303030", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
        >
          <div className="px-6 py-4 border-b border-line flex justify-between items-center">
            <h3 className="text-lg font-semibold text-heading m-0" style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.01em" }}>{title}</h3>
            <button
              onClick={onClose}
              className="bg-mist border-none rounded-md w-7 h-7 cursor-pointer text-sub text-sm hover:text-heading transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  }