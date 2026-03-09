export function getGoogleAuthUrl(profileId: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ].join(" ");

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${profileId}`
  );
}
  
  export async function pushToGoogleCalendar(profileId: string, title: string, date: string, description?: string, startMinutes?: number, durationMinutes?: number) {
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, title, date, description, startMinutes, durationMinutes }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to push to Google Calendar:", err);
      return null;
    }
  }
  
  export async function pullFromGoogleCalendar(profileId: string) {
    try {
      const res = await fetch(`/api/calendar/sync?profileId=${profileId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.events || [])
        .filter((e: any) => !e.title?.startsWith("[Whetstone]") && !e.title?.endsWith("[Whetstone]"))
        .map((e: any) => ({
          id: e.id,
          title: e.title || "Untitled",
          date: e.date || "",
          source: "google" as const,
          allDay: e.allDay || false,
          startMinutes: e.startMinutes ?? null,
          durationMinutes: e.durationMinutes ?? null,
          attendees: e.attendees || [],
          meetingLink: e.meetingLink || "",
          location: e.location || "",
        }));
    } catch (err) {
      console.error("Failed to pull from Google Calendar:", err);
      return [];
    }
  }

  export async function syncAllDeadlinesToGoogle(profileId: string, students: any[]) {
    // First, pull existing Google Calendar events to check for duplicates
    const existing = await pullExistingWhetstoneEvents(profileId);
    const existingTitles = new Set(existing.map((e: any) => e.title));
  
    const results = [];
    for (const student of students) {
      for (const dl of student.dl || []) {
        if (dl.due && dl.status !== "completed") {
          const eventTitle = `${dl.title} (${student.name})`;
          // Skip if already synced (check both old prefix and new suffix format)
          if (existingTitles.has(`[Whetstone] ${eventTitle}`) || existingTitles.has(`${eventTitle} [Whetstone]`)) continue;
  
          const result = await pushToGoogleCalendar(
            profileId,
            eventTitle,
            dl.due,
            `Student: ${student.name}\nCategory: ${dl.cat}\nStatus: ${dl.status}`
          );
          results.push(result);
        }
      }
    }
    return results;
  }
  
  export async function syncAllCounselorEventsToGoogle(profileId: string, events: any[], students: any[]) {
    const existing = await pullExistingWhetstoneEvents(profileId);
    const existingTitles = new Set(existing.map((e: any) => e.title));
  
    const results = [];
    for (const event of events) {
      // Skip if already synced (check both old prefix and new suffix format)
      if (existingTitles.has(`[Whetstone] ${event.title}`) || existingTitles.has(`${event.title} [Whetstone]`)) continue;
  
      const studentNames = students
        .filter((s: any) => event.studentIds?.includes(s.id))
        .map((s: any) => s.name)
        .join(", ");
      const result = await pushToGoogleCalendar(
        profileId,
        event.title,
        event.date,
        `Students: ${studentNames}\n${event.notes || ""}`
      );
      results.push(result);
    }
    return results;
  }

  async function pullExistingWhetstoneEvents(profileId: string) {
    try {
      const res = await fetch(`/api/calendar/sync?profileId=${profileId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.events || [])
        .filter((e: any) => e.title?.startsWith("[Whetstone]") || e.title?.endsWith("[Whetstone]"))
        .map((e: any) => ({
          title: e.title,
          date: e.date,
        }));
    } catch {
      return [];
    }
  }

  export async function pullGoogleEventsForStudent(profileId: string, studentEmail: string) {
    const allEvents = await pullFromGoogleCalendar(profileId);
    return allEvents.filter((e: any) =>
      e.attendees && e.attendees.includes(studentEmail.toLowerCase())
    );
  }