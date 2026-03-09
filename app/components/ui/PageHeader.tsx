interface PageHeaderProps {
    title: string;
    sub?: string;
    right?: React.ReactNode;
  }
  
  export function PageHeader({ title, sub, right }: PageHeaderProps) {
    return (
      <div className="px-8 pt-8 pb-6 flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-3xl text-heading m-0">{title}</h1>
          {sub && <p className="mt-1.5 mb-0 text-sub text-sm">{sub}</p>}
        </div>
        {right}
      </div>
    );
  }