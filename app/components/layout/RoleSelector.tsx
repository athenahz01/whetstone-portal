"use client";

interface RoleSelectorProps {
  onSelect: (role: "student" | "strategist" | "parent") => void;
}

export function RoleSelector({ onSelect }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-raised flex flex-col items-center justify-center">
      <div className="text-center mb-12">
        <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-5 text-2xl text-white font-bold">
          W
        </div>
        <h1 className="text-4xl font-bold text-heading m-0 mb-2">Whetstone</h1>
        <p className="text-sub text-base m-0">Refined Method. Proven Results.</p>
      </div>
      <div className="flex gap-4">
        {[
          { role: "student" as const, label: "Student", desc: "Timeline, academics, session tools" },
          { role: "parent" as const, label: "Parent", desc: "View-only access to your child's progress" },
          { role: "strategist" as const, label: "Strategist", desc: "Master timeline, caseload, analytics" },
        ].map((r) => (
          <button
            key={r.role}
            onClick={() => onSelect(r.role)}
            className="w-70 p-8 bg-white border border-line rounded-xl cursor-pointer text-left shadow-sm hover:border-accent transition-colors"
          >
            <div className="text-lg font-bold text-heading mb-1.5">{r.label}</div>
            <div className="text-sm text-sub leading-relaxed">{r.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}