export const ACTIVITY_TYPES = [
  "Academic", "Art", "Athletics: Club", "Athletics: JV/Varsity",
  "Career Oriented", "Community Service (Volunteer)", "Computer/Technology",
  "Cultural", "Dance", "Debate/Speech", "Environmental",
  "Family Responsibilities", "Foreign Exchange", "Journalism/Publication",
  "Junior R.O.T.C.", "Music: Instrumental", "Music: Vocal", "Religious",
  "Research", "Robotics", "Science/Math", "Student Govt./Politics",
  "Theater/Drama", "Work (Paid)", "Other"
];

export const PARTICIPATION_TIMES = [
  "All Year", "During School Year", "During School Break"
];

// Mentors are the core counselors — they also count as specialists
export const MENTOR_EMAILS = [
"ren@whetstoneadmissions.com",
"cole@whetstoneadmissions.com",
"athena@whetstoneadmissions.com",
];

export const MENTOR_NAMES = ["Ren Yu", "Cole Whetstone", "Athena Huo"];

// Check if a staff member is a mentor (by email or name)
export function isMentor(emailOrName: string): boolean {
const lower = (emailOrName || "").toLowerCase();
return MENTOR_EMAILS.some(e => e === lower) ||
  MENTOR_NAMES.some(n => n.toLowerCase() === lower);
}