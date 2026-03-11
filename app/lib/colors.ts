export function getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      essays: "#a480f2",
      applications: "#4aba6a",
      recommendations: "#e5a83b",
      testing: "#e5a83b",
      financial: "#a480f2",
      planning: "#5A83F3",
      extracurricular: "#e5a83b",
      "College Applications": "#5A83F3",
      Academics: "#4aba6a",
      Testing: "#e5a83b",
      Extracurriculars: "#a480f2",
    };
    return map[cat] || "#5A83F3";
  }
  
  export function getStatusColor(status: string): string {
    const map: Record<string, string> = {
      overdue: "#e55b5b",
      "in-progress": "#e5a83b",
      "In Progress": "#e5a83b",
      pending: "#717171",
      Planned: "#717171",
      completed: "#4aba6a",
      Completed: "#4aba6a",
      blocked: "#e55b5b",
    };
    return map[status] || "#717171";
  }