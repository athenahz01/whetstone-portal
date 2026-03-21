import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../lib/auth";
import { createClient } from "@supabase/supabase-js";

const API_KEY = process.env.SCORECARD_API_KEY || "DEMO_KEY";
const BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.carnegie_basic",
  "school.ownership",
  "school.locale",
  "school.region_id",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.average.overall",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.act_scores.midpoint.cumulative",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.student.size",
  "latest.student.demographics.race_ethnicity.white",
  "latest.student.demographics.race_ethnicity.black",
  "latest.student.demographics.race_ethnicity.hispanic",
  "latest.student.demographics.race_ethnicity.asian",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.cost.avg_net_price.overall",
  "latest.aid.median_debt.completers.overall",
  "latest.aid.pell_grant_rate",
  "latest.completion.rate_suppressed.overall",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.programs.cip_4_digit",
].join(",");

// Curated international schools (not in College Scorecard)
const INTL_SCHOOLS = [
  { id: 900001, name: "University of Oxford", city: "Oxford", state: "UK", url: "ox.ac.uk", ownership: 1, admissionRate: 0.17, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 27000, tuitionInState: null, tuitionOutState: 38000, avgNetPrice: 38000, medianDebt: null, pellGrantRate: null, completionRate: 0.95, medianEarnings: 52000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Philosophy, Politics & Economics (PPE)", count: 250 }, { title: "Medicine", count: 150 }, { title: "Law (Jurisprudence)", count: 200 }, { title: "Computer Science", count: 120 }, { title: "Mathematics", count: 170 }, { title: "History", count: 180 }, { title: "English Language & Literature", count: 200 }, { title: "Biochemistry", count: 100 }] },
  { id: 900002, name: "University of Cambridge", city: "Cambridge", state: "UK", url: "cam.ac.uk", ownership: 1, admissionRate: 0.20, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 24000, tuitionInState: null, tuitionOutState: 37000, avgNetPrice: 37000, medianDebt: null, pellGrantRate: null, completionRate: 0.95, medianEarnings: 50000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Natural Sciences", count: 300 }, { title: "Engineering", count: 250 }, { title: "Mathematics", count: 200 }, { title: "Law", count: 180 }, { title: "Computer Science", count: 150 }, { title: "Medicine", count: 140 }, { title: "Economics", count: 170 }, { title: "History", count: 130 }] },
  { id: 900003, name: "University of Edinburgh", city: "Edinburgh", state: "UK", url: "ed.ac.uk", ownership: 1, admissionRate: 0.37, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 36000, tuitionInState: null, tuitionOutState: 28000, avgNetPrice: 28000, medianDebt: null, pellGrantRate: null, completionRate: 0.89, medianEarnings: 38000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Medicine", count: 200 }, { title: "Computer Science & AI", count: 250 }, { title: "Law", count: 180 }, { title: "Business", count: 220 }, { title: "Biological Sciences", count: 190 }, { title: "Psychology", count: 170 }] },
  { id: 900004, name: "University of St Andrews", city: "St Andrews", state: "UK", url: "st-andrews.ac.uk", ownership: 1, admissionRate: 0.08, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 10000, tuitionInState: null, tuitionOutState: 30000, avgNetPrice: 30000, medianDebt: null, pellGrantRate: null, completionRate: 0.93, medianEarnings: 36000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "International Relations", count: 180 }, { title: "Computer Science", count: 120 }, { title: "Management", count: 150 }, { title: "Psychology", count: 130 }, { title: "History", count: 100 }, { title: "Art History", count: 80 }] },
  { id: 900005, name: "London School of Economics (LSE)", city: "London", state: "UK", url: "lse.ac.uk", ownership: 1, admissionRate: 0.10, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 13000, tuitionInState: null, tuitionOutState: 33000, avgNetPrice: 33000, medianDebt: null, pellGrantRate: null, completionRate: 0.91, medianEarnings: 55000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Economics", count: 300 }, { title: "Finance", count: 250 }, { title: "International Relations", count: 200 }, { title: "Law", count: 180 }, { title: "Management", count: 170 }, { title: "Philosophy", count: 90 }] },
  { id: 900006, name: "University College London (UCL)", city: "London", state: "UK", url: "ucl.ac.uk", ownership: 1, admissionRate: 0.25, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 50000, tuitionInState: null, tuitionOutState: 30000, avgNetPrice: 30000, medianDebt: null, pellGrantRate: null, completionRate: 0.90, medianEarnings: 42000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Medicine", count: 250 }, { title: "Architecture", count: 200 }, { title: "Computer Science", count: 220 }, { title: "Law", count: 190 }, { title: "Economics", count: 180 }, { title: "Psychology", count: 170 }] },
  { id: 900007, name: "Universit\u00e9 Paris-Sorbonne (Sorbonne University)", city: "Paris", state: "France", url: "sorbonne-universite.fr", ownership: 1, admissionRate: 0.30, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 55000, tuitionInState: null, tuitionOutState: 3800, avgNetPrice: 3800, medianDebt: null, pellGrantRate: null, completionRate: 0.85, medianEarnings: 35000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Literature & Humanities", count: 400 }, { title: "Medicine", count: 300 }, { title: "Mathematics", count: 200 }, { title: "Physics", count: 180 }, { title: "History", count: 250 }, { title: "Philosophy", count: 150 }] },
  { id: 900008, name: "Sciences Po", city: "Paris", state: "France", url: "sciencespo.fr", ownership: 1, admissionRate: 0.15, satAvg: null, satReading: null, satMath: null, actAvg: null, studentSize: 14000, tuitionInState: null, tuitionOutState: 14500, avgNetPrice: 14500, medianDebt: null, pellGrantRate: null, completionRate: 0.92, medianEarnings: 45000, demographics: { white: null, black: null, hispanic: null, asian: null }, programs: [{ title: "Political Science", count: 300 }, { title: "International Relations", count: 280 }, { title: "Economics", count: 200 }, { title: "Law", count: 180 }, { title: "Journalism", count: 120 }, { title: "Urban Policy", count: 100 }] },
];

// GET /api/schools?q=harvard  or  GET /api/schools?id=166027
export async function GET(request: NextRequest) {
  const auth_GET = await getAuthUser(request);
  if (!auth_GET) return unauthorized();

  const q = request.nextUrl.searchParams.get("q");
  const id = request.nextUrl.searchParams.get("id");

  // Check international schools first for ID lookups
  if (id) {
    const intlMatch = INTL_SCHOOLS.find(s => s.id === Number(id));
    if (intlMatch) return NextResponse.json({ schools: [intlMatch], total: 1 });
  }

  // Search international schools by name
  const intlResults = q ? INTL_SCHOOLS.filter(s => s.name.toLowerCase().includes(q.toLowerCase())) : [];

  // ── Check Supabase cache first ──
  if (q) {
    try {
      const { data: cached } = await supabase
        .from("school_stats_cache")
        .select("data")
        .ilike("name", `%${q}%`)
        .limit(15);
      if (cached && cached.length > 0) {
        const cachedSchools = cached.map((c: any) => c.data);
        return NextResponse.json({ schools: [...intlResults, ...cachedSchools], total: cachedSchools.length + intlResults.length, cached: true });
      }
    } catch {} // Table may not exist yet — fall through to API
  }
  if (id) {
    try {
      const { data: cached } = await supabase
        .from("school_stats_cache")
        .select("data")
        .eq("scorecard_id", parseInt(id as string))
        .single();
      if (cached?.data) return NextResponse.json({ schools: [cached.data], total: 1, cached: true });
    } catch {}
  }

  // Common school name aliases
  const ALIASES: Record<string, string> = {
    "unc": "University of North Carolina at Chapel Hill",
    "unc chapel hill": "University of North Carolina at Chapel Hill",
    "mit": "Massachusetts Institute of Technology",
    "caltech": "California Institute of Technology",
    "usc": "University of Southern California",
    "ucla": "University of California-Los Angeles",
    "ucb": "University of California-Berkeley",
    "uc berkeley": "University of California-Berkeley",
    "nyu": "New York University",
    "uva": "University of Virginia",
    "umich": "University of Michigan",
    "upenn": "University of Pennsylvania",
    "gatech": "Georgia Institute of Technology",
    "georgia tech": "Georgia Institute of Technology",
    "uiuc": "University of Illinois Urbana-Champaign",
    "cmu": "Carnegie Mellon University",
    "bu": "Boston University",
    "bc": "Boston College",
    "uw": "University of Washington-Seattle Campus",
    "ut austin": "University of Texas at Austin",
    "washu": "Washington University in St Louis",
  };

  let searchQuery = q;
  if (q) {
    const lower = q.toLowerCase().trim();
    if (ALIASES[lower]) searchQuery = ALIASES[lower];
  }

  let url: string;
  if (id) {
    url = `${BASE}?api_key=${API_KEY}&id=${id}&fields=${FIELDS}`;
  } else if (searchQuery) {
    url = `${BASE}?api_key=${API_KEY}&school.name=${encodeURIComponent(searchQuery)}&fields=${FIELDS}&per_page=15&school.operating=1&school.degrees_awarded.predominant=3`;
  } else {
    return NextResponse.json({ error: "Missing q or id param" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results) {
      return NextResponse.json({ schools: intlResults, total: intlResults.length });
    }

    const schools = data.results.map((r: any) => ({
      id: r.id,
      name: r["school.name"],
      city: r["school.city"],
      state: r["school.state"],
      url: r["school.school_url"],
      ownership: r["school.ownership"],
      locale: r["school.locale"],
      admissionRate: r["latest.admissions.admission_rate.overall"],
      satAvg: r["latest.admissions.sat_scores.average.overall"],
      satReading: r["latest.admissions.sat_scores.midpoint.critical_reading"],
      satMath: r["latest.admissions.sat_scores.midpoint.math"],
      sat25: (r["latest.admissions.sat_scores.25th_percentile.critical_reading"] && r["latest.admissions.sat_scores.25th_percentile.math"]) ? r["latest.admissions.sat_scores.25th_percentile.critical_reading"] + r["latest.admissions.sat_scores.25th_percentile.math"] : null,
      sat75: (r["latest.admissions.sat_scores.75th_percentile.critical_reading"] && r["latest.admissions.sat_scores.75th_percentile.math"]) ? r["latest.admissions.sat_scores.75th_percentile.critical_reading"] + r["latest.admissions.sat_scores.75th_percentile.math"] : null,
      actAvg: r["latest.admissions.act_scores.midpoint.cumulative"],
      act25: r["latest.admissions.act_scores.25th_percentile.cumulative"],
      act75: r["latest.admissions.act_scores.75th_percentile.cumulative"],
      studentSize: r["latest.student.size"],
      tuitionInState: r["latest.cost.tuition.in_state"],
      tuitionOutState: r["latest.cost.tuition.out_of_state"],
      avgNetPrice: r["latest.cost.avg_net_price.overall"],
      medianDebt: r["latest.aid.median_debt.completers.overall"],
      pellGrantRate: r["latest.aid.pell_grant_rate"],
      completionRate: r["latest.completion.rate_suppressed.overall"],
      medianEarnings: r["latest.earnings.10_yrs_after_entry.median"],
      demographics: {
        white: r["latest.student.demographics.race_ethnicity.white"],
        black: r["latest.student.demographics.race_ethnicity.black"],
        hispanic: r["latest.student.demographics.race_ethnicity.hispanic"],
        asian: r["latest.student.demographics.race_ethnicity.asian"],
      },
      programs: (r["latest.programs.cip_4_digit"] || [])
        .filter((p: any) => p.credential?.level === 3)
        .sort((a: any, b: any) => (b.counts?.ipeds_awards2 || 0) - (a.counts?.ipeds_awards2 || 0))
        .slice(0, 10)
        .map((p: any) => ({ title: p.title, count: p.counts?.ipeds_awards2 || 0 })),
    }));

    // ── Save to Supabase cache (fire-and-forget) ──
    for (const school of schools) {
      supabase.from("school_stats_cache").upsert({
        scorecard_id: school.id,
        name: school.name,
        data: school,
        updated_at: new Date().toISOString(),
      }, { onConflict: "scorecard_id" }).then(() => {});
    }

    return NextResponse.json({ schools: [...intlResults, ...schools], total: (data.metadata?.total || schools.length) + intlResults.length });
  } catch (err) {
    console.error("[schools API] Error:", err);
    if (intlResults.length > 0) return NextResponse.json({ schools: intlResults, total: intlResults.length });
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}