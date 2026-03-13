import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.SCORECARD_API_KEY || "DEMO_KEY";
const BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

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
  "latest.admissions.act_scores.midpoint.cumulative",
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

// GET /api/schools?q=harvard  or  GET /api/schools?id=166027
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const id = request.nextUrl.searchParams.get("id");

  let url: string;
  if (id) {
    url = `${BASE}?api_key=${API_KEY}&id=${id}&fields=${FIELDS}`;
  } else if (q) {
    url = `${BASE}?api_key=${API_KEY}&school.name=${encodeURIComponent(q)}&fields=${FIELDS}&per_page=15&school.operating=1&school.degrees_awarded.predominant=3`;
  } else {
    return NextResponse.json({ error: "Missing q or id param" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results) {
      return NextResponse.json({ schools: [], total: 0 });
    }

    const schools = data.results.map((r: any) => ({
      id: r.id,
      name: r["school.name"],
      city: r["school.city"],
      state: r["school.state"],
      url: r["school.school_url"],
      ownership: r["school.ownership"], // 1=Public, 2=Private nonprofit, 3=Private for-profit
      locale: r["school.locale"],
      admissionRate: r["latest.admissions.admission_rate.overall"],
      satAvg: r["latest.admissions.sat_scores.average.overall"],
      satReading: r["latest.admissions.sat_scores.midpoint.critical_reading"],
      satMath: r["latest.admissions.sat_scores.midpoint.math"],
      actAvg: r["latest.admissions.act_scores.midpoint.cumulative"],
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
        .filter((p: any) => p.credential?.level === 3) // Bachelor's
        .sort((a: any, b: any) => (b.counts?.ipeds_awards2 || 0) - (a.counts?.ipeds_awards2 || 0))
        .slice(0, 10)
        .map((p: any) => ({ title: p.title, count: p.counts?.ipeds_awards2 || 0 })),
    }));

    return NextResponse.json({ schools, total: data.metadata?.total || schools.length });
  } catch (err) {
    console.error("[schools API] Error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
