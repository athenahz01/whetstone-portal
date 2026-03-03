interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }
  
  export function Modal({ title, onClose, children }: ModalProps) {
    return (
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-line rounded-2xl w-[520px] max-h-[85vh] overflow-auto"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
        >
          <div className="px-6 py-4 border-b border-line flex justify-between items-center">
            <h3 className="text-lg font-bold text-heading m-0">{title}</h3>
            <button
              onClick={onClose}
              className="bg-mist border-none rounded-lg w-8 h-8 cursor-pointer text-sub text-base"
            >
              ✕
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  }