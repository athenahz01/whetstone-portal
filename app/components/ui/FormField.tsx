interface FormFieldProps {
    label: string;
    children: React.ReactNode;
  }
  
  export function FormField({ label, children }: FormFieldProps) {
    return (
      <div className="mb-4">
        <label className="block text-sm text-body font-semibold mb-1.5">{label}</label>
        {children}
      </div>
    );
  }