import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "../../lib/auth";

const API_KEY = "FNiEPcbqYrmPyhPJbOvFcjjdVROiHKfUJnTjRGhl";
const BASE = "https://api.data.gov/ed/collegescorecard/v1/schools.json";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) return unauthorized();

  const query = request.nextUrl.searchParams.get("q");
  const schoolId = request.nextUrl.searchParams.get("id");

  const fields = [
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.school_url",
    "school.ownership",        // 1=Public, 2=Private NP, 3=Private FP
    "school.carnegie_basic",
    "latest.admissions.admission_rate.overall",
    "latest.admissions.sat_scores.25th_percentile.critical_reading",
    "latest.admissions.sat_scores.75th_percentile.critical_reading",
    "latest.admissions.sat_scores.25th_percentile.math",
    "latest.admissions.sat_scores.75th_percentile.math",
    "latest.admissions.sat_scores.midpoint.critical_reading",
    "latest.admissions.sat_scores.midpoint.math",
    "latest.admissions.act_scores.25th_percentile.cumulative",
    "latest.admissions.act_scores.75th_percentile.cumulative",
    "latest.admissions.act_scores.midpoint.cumulative",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
    "latest.student.size",
    "latest.student.demographics.race_ethnicity.white",
    "latest.completion.rate_suppressed.overall",
    "latest.earnings.10_yrs_after_entry.median",
  ].join(",");

  try {
    let url: string;
    if (schoolId) {
      url = `${BASE}?api_key=${API_KEY}&id=${schoolId}&fields=${fields}`;
    } else if (query) {
      url = `${BASE}?api_key=${API_KEY}&school.name=${encodeURIComponent(query)}&fields=${fields}&per_page=10&sort=latest.admissions.admission_rate.overall`;
    } else {
      return NextResponse.json({ error: "Missing q or id" }, { status: 400 });
    }

    const res = await fetch(url);
    const data = await res.json();

    const schools = (data.results || []).map((r: any) => {
      const adm = r["latest.admissions.admission_rate.overall"];
      const sat25r = r["latest.admissions.sat_scores.25th_percentile.critical_reading"];
      const sat75r = r["latest.admissions.sat_scores.75th_percentile.critical_reading"];
      const sat25m = r["latest.admissions.sat_scores.25th_percentile.math"];
      const sat75m = r["latest.admissions.sat_scores.75th_percentile.math"];
      const satMidR = r["latest.admissions.sat_scores.midpoint.critical_reading"];
      const satMidM = r["latest.admissions.sat_scores.midpoint.math"];
      const act25 = r["latest.admissions.act_scores.25th_percentile.cumulative"];
      const act75 = r["latest.admissions.act_scores.75th_percentile.cumulative"];
      const actMid = r["latest.admissions.act_scores.midpoint.cumulative"];
      const ownership = r["school.ownership"];

      return {
        scorecardId: r.id,
        name: r["school.name"],
        city: r["school.city"],
        state: r["school.state"],
        url: r["school.school_url"],
        type: ownership === 1 ? "Public" : ownership === 2 ? "Private" : "For-Profit",
        admissionRate: adm != null ? Math.round(adm * 100) : null,
        satRange: (sat25r && sat75r && sat25m && sat75m) ? `${sat25r + sat25m}–${sat75r + sat75m}` : null,
        satMid: (satMidR && satMidM) ? satMidR + satMidM : null,
        actRange: (act25 && act75) ? `${act25}–${act75}` : null,
        actMid: actMid || null,
        tuitionInState: r["latest.cost.tuition.in_state"],
        tuitionOutState: r["latest.cost.tuition.out_of_state"],
        studentSize: r["latest.student.size"],
        gradRate: r["latest.completion.rate_suppressed.overall"] != null
          ? Math.round(r["latest.completion.rate_suppressed.overall"] * 100) : null,
        medianEarnings: r["latest.earnings.10_yrs_after_entry.median"],
      };
    });

    return NextResponse.json({ schools });
  } catch (err) {
    console.error("[school-search] Error:", err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
