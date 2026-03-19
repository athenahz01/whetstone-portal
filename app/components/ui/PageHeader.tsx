interface PageHeaderProps {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, sub, right }: PageHeaderProps) {
  return (
    <div className="px-6 pt-7 pb-5 border-b border-line flex justify-between items-end flex-wrap gap-3 bg-white">
      <div>
        <h1 className="text-2xl font-bold text-heading m-0">{title}</h1>
        {sub && <p className="mt-1 mb-0 text-sub text-sm">{sub}</p>}
      </div>
      {right}
    </div>
  );
}