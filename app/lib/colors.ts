export function getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      essays: "#7c3aed",
      applications: "#16a34a",
      recommendations: "#d97706",
      testing: "#d97706",
      financial: "#7c3aed",
      planning: "#3b82f6",
      extracurricular: "#d97706",
      "College Applications": "#3b82f6",
      Academics: "#16a34a",
      Testing: "#d97706",
      Extracurriculars: "#7c3aed",
    };
    return map[cat] || "#3b82f6";
  }
  
  export function getStatusColor(status: string): string {
    const map: Record<string, string> = {
      overdue: "#ef4444",
      "in-progress": "#d97706",
      "In Progress": "#d97706",
      pending: "#94a3b8",
      Planned: "#94a3b8",
      completed: "#16a34a",
      Completed: "#16a34a",
    };
    return map[status] || "#94a3b8";
  }