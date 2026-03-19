export interface School {
  id?: number;
  name: string;
  type: "reach" | "match" | "safety";
  status: string;
  deadline: string;
  essay: string;
}

export interface Deadline {
  id: number;
  title: string;
  due: string;
  cat: string;
  status: "overdue" | "urgent" | "in-progress" | "pending" | "completed" | "blocked";
  days: number;
  specialist?: string;
  googleDocLink?: string;
  createdBy?: "strategist" | "student";
  priority?: "high" | "medium" | "low";
  description?: string;
  blockedBy?: string;
  internalOnly?: boolean;
  studentOnly?: boolean;
  schoolName?: string;
  responsible?: string[];
  actualDeadline?: string;
}

export interface Task {
  id: number;
  cat: string;
  title: string;
  s: string;
  d: string;
  st: string;
  team: string[];
  specialist?: string;
}

export interface Course {
  id: number;
  name: string;
  lv: string;
  s1: string;
  s2: string;
}

export interface Test {
  id: number;
  type: string;
  date: string;
  total: number;
  bd: string;
  v: boolean;
  mathScore?: number | null;
  englishScore?: number | null;
}

export interface Activity {
  id: number;
  type: string;
  pos: string;
  org: string;
  desc: string;
  gr: number[];
  timing: string;
  hrs: string;
  wks: string;
}

export interface Goal {
  t: string;
  done: boolean;
}

export interface Session {
  id?: number;
  date: string;
  notes: string;
  action: string;
  start_time?: string;
  end_time?: string;
  session_name?: string;
  session_type?: string;
  booking_type?: "individual" | "recurring";
  status?: "pending" | "completed" | "cancelled";
}

export interface Student {
  id: number;
  name: string;
  email?: string;
  grade: number;
  gpa?: number | null;
  gpaWeighted?: number | null;
  gpaUnweighted?: number | null;
  sat?: number | null;
  counselor: string;
  team?: string[];
  status: "on-track" | "needs-attention";
  av: string;
  school: string;
  gradYear: number;
  lastLogin: string | null;
  engagement: number;
  studentType?: "undergraduate" | "graduate";
  applicationYear?: number | null;
  intendedMajors?: string | null;
  hookStatement?: string | null;
  achievements?: string | null;
  honors?: Honor[];
  schools: School[];
  dl: Deadline[];
  tasks: Task[];
  courses: Course[];
  tests: Test[];
  acts: Activity[];
  goals: Goal[];
  sess: Session[];
}

export interface InactiveStudent {
  id: string;
  first_name: string;
  last_name: string;
  profiles: {
    last_login: string | null;
  };
}

export interface Honor {
  id: number;
  title: string;
  grades: number[];
  recognition: string[];
}