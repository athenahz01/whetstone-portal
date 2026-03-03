import { Student } from "../types";

export const students: Student[] = [
  {
    id: 1, name: "Ananjay R.", grade: 12, gpa: 3.98, sat: 1570, counselor: "Sarah Mitchell",
    status: "on-track", av: "AR", school: "Stuyvesant High School", gradYear: 2026,
    lastLogin: "1 hour ago", engagement: 98,
    schools: [
      { name: "MIT", type: "reach", status: "Submitted", deadline: "Nov 1", essay: "Submitted" },
      { name: "Caltech", type: "reach", status: "In review", deadline: "Jan 3", essay: "Final" },
      { name: "Stanford", type: "reach", status: "Essay drafting", deadline: "Jan 5", essay: "Draft 3" }
    ],
    dl: [
      { id: 1, title: "Quantum ML Research — Final Paper", due: "2025-12-28", cat: "Academics", status: "in-progress", days: 5 },
      { id: 2, title: "Stanford Supplement — Submit", due: "2026-01-05", cat: "applications", status: "pending", days: 13 }
    ],
    tasks: [
      { id: 101, cat: "Academics", title: "Quantum ML Refinement", s: "2025-11-20", d: "2025-12-28", st: "In Progress", team: ["AR", "SM"] },
      { id: 102, cat: "College Applications", title: "Stanford Why Us", s: "2025-12-01", d: "2026-01-02", st: "In Progress", team: ["AR"] }
    ],
    courses: [
      { id: 1, name: "Multivariable Calculus", lv: "Advanced Placement", s1: "A", s2: "In Progress" },
      { id: 2, name: "AP Computer Science A", lv: "Advanced Placement", s1: "A", s2: "In Progress" }
    ],
    tests: [{ id: 1, type: "SAT", date: "2025-05-10", total: 1570, bd: "Math: 800 · ERW: 770", v: true }],
    acts: [
      { id: 1, type: "Science/Math", pos: "President (12)", org: "School Science Olympiad Team", desc: "Selected after testing to join a hypercompetitive club. Won 22 medals at 7 different competitions including Cornell, Yale, and Columbia.", gr: [9, 10, 11, 12], timing: "During School Year", hrs: "5", wks: "48" },
      { id: 2, type: "Research", pos: "Independent Researcher", org: "Independent", desc: "Research on Quantum ML for Predicting Weather. Self-taught complex algorithms and physics principles.", gr: [11, 12], timing: "All Year", hrs: "8", wks: "52" },
      { id: 3, type: "Athletics: JV/Varsity", pos: "Track Member", org: "School Track and Field", desc: "Competed in 55m Hurdles, 400m Hurdles, and 400m dash.", gr: [10, 11, 12], timing: "During School Year", hrs: "10", wks: "16" }
    ],
    goals: [{ t: "Finalize Quantum ML abstract", done: true }, { t: "Draft Stanford roommate essay", done: false }],
    sess: [{ date: "Dec 16, 2025", notes: "Ananjay's research project is high-impact. We need to emphasize the self-taught aspect in the additional info section.", action: "Complete Stanford draft by Sunday" }]
  },
  {
    id: 2, name: "Jia Zhou", grade: 12, gpa: 3.95, sat: 1540, counselor: "Sarah Mitchell",
    status: "on-track", av: "JZ", school: "Scarsdale High School", gradYear: 2026,
    lastLogin: "3 hours ago", engagement: 92,
    schools: [
      { name: "UPenn", type: "reach", status: "Submitted", deadline: "Nov 1", essay: "Submitted" },
      { name: "UCLA", type: "match", status: "Submitted", deadline: "Nov 30", essay: "Submitted" },
      { name: "Georgetown", type: "reach", status: "Essay drafting", deadline: "Jan 10", essay: "Draft 2" }
    ],
    dl: [
      { id: 3, title: "Georgetown Supplement", due: "2026-01-10", cat: "essays", status: "pending", days: 18 },
      { id: 4, title: "Update Volleyball Recruiting Profile", due: "2025-12-25", cat: "extracurricular", status: "in-progress", days: 2 }
    ],
    tasks: [{ id: 201, cat: "College Applications", title: "Georgetown Draft 2", s: "2025-12-15", d: "2025-12-28", st: "In Progress", team: ["JZ", "SM"] }],
    courses: [
      { id: 3, name: "AP Psychology", lv: "Advanced Placement", s1: "A", s2: "In Progress" },
      { id: 4, name: "AP Calculus BC", lv: "Advanced Placement", s1: "A-", s2: "In Progress" }
    ],
    tests: [{ id: 2, type: "SAT", date: "2025-10-05", total: 1540, bd: "Math: 780 · ERW: 760", v: true }],
    acts: [
      { id: 4, type: "Athletics: JV/Varsity", pos: "Starting Setter", org: "Scarsdale High School Volleyball", desc: "Coordinated offense as starting setter. Led team in highest number of assists.", gr: [9, 10], timing: "During School Year", hrs: "15", wks: "12" },
      { id: 5, type: "Athletics: Club", pos: "Club Member", org: "Legacy Volleyball Club", desc: "Competitive travel volleyball, competing in national tournaments across the Northeast.", gr: [9, 10, 11, 12], timing: "All Year", hrs: "12", wks: "40" }
    ],
    goals: [{ t: "Email Georgetown coach", done: true }, { t: "Finish supplement draft 2", done: false }],
    sess: [{ date: "Dec 14, 2025", notes: "Jia is prioritizing Georgetown. Discussed how to highlight leadership on the court.", action: "Polish Georgetown personal statement" }]
  },
  {
    id: 3, name: "Rafi Carrillo", grade: 11, gpa: 3.88, sat: 1490, counselor: "Sarah Mitchell",
    status: "on-track", av: "RC", school: "Brooklyn Friends School", gradYear: 2027,
    lastLogin: "1 day ago", engagement: 85,
    schools: [{ name: "UC Berkeley", type: "reach", status: "Researching", deadline: "Nov 2026", essay: "N/A" }],
    dl: [{ id: 5, title: "Summer Program Application", due: "2026-02-15", cat: "planning", status: "pending", days: 54 }],
    tasks: [{ id: 301, cat: "Planning", title: "Summer Program Research", s: "2025-12-01", d: "2026-01-15", st: "In Progress", team: ["RC"] }],
    courses: [{ id: 5, name: "Honors Physics", lv: "Honors", s1: "A", s2: "In Progress" }],
    tests: [{ id: 3, type: "PSAT", date: "2025-10-15", total: 1420, bd: "Math: 720 · ERW: 700", v: true }],
    acts: [
      { id: 6, type: "Academic", pos: "Club Member", org: "Key Club", desc: "Part of a global group of students that volunteer to raise money for our communities.", gr: [10], timing: "During School Year", hrs: "2", wks: "30" },
      { id: 7, type: "Athletics: JV/Varsity", pos: "Trapeze Team Member", org: "STREB Trapeze Academy", desc: "Acrobatic and trapeze training focusing on precision, teamwork, and physical conditioning.", gr: [10, 11], timing: "During School Year", hrs: "6", wks: "20" }
    ],
    goals: [{ t: "Research TASP program", done: true }],
    sess: [{ date: "Dec 10, 2025", notes: "Rafi is interested in social justice and performance arts. Trapeze is a unique spike.", action: "Find 3 more summer programs" }]
  },
  {
    id: 4, name: "Neil Zhao", grade: 12, gpa: 4.0, sat: 1580, counselor: "Sarah Mitchell",
    status: "needs-attention", av: "NZ", school: "Phillips Academy", gradYear: 2026,
    lastLogin: "5 days ago", engagement: 42,
    schools: [
      { name: "Stanford", type: "reach", status: "Not started", deadline: "Jan 5", essay: "Not started" },
      { name: "Harvard", type: "reach", status: "Submitted", deadline: "Nov 1", essay: "Submitted" }
    ],
    dl: [{ id: 7, title: "Stanford Supplements", due: "2026-01-05", cat: "essays", status: "overdue", days: -1 }],
    tasks: [{ id: 401, cat: "College Applications", title: "Stanford Brainstorm", s: "2025-12-10", d: "2025-12-22", st: "overdue", team: ["NZ"] }],
    courses: [{ id: 6, name: "AP US History", lv: "Advanced Placement", s1: "A", s2: "In Progress" }],
    tests: [{ id: 4, type: "SAT", date: "2025-08-15", total: 1580, bd: "Math: 800 · ERW: 780", v: true }],
    acts: [{ id: 8, type: "Academic", pos: "Team Lead", org: "Debate Society", desc: "Compete in national circuit tournaments. Managed novice training sessions.", gr: [10, 11, 12], timing: "During School Year", hrs: "10", wks: "35" }],
    goals: [{ t: "Start Stanford essays", done: false }],
    sess: [{ date: "Dec 05, 2025", notes: "Neil has been quiet. We need to check in on the Stanford application progress.", action: "Emergency check-in call" }]
  }
];