export function getCategoryColor(cat: string): string {
  const lower = (cat || "").toLowerCase();
  const map: Record<string, string> = {
    essays: "#a480f2",        // purple
    applications: "#4aba6a",   // green
    recommendations: "#ec70a0",// pink
    testing: "#e5a83b",        // amber
    financial: "#828ca0",      // slate
    planning: "#5A83F3",       // blue
    extracurricular: "#38bdb4",// teal
    academics: "#f0c060",      // gold/yellow
    research: "#ec70a0",       // pink
  };
  return map[lower] || "#717171";
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