export function getGoogleAuthUrl(profileId: string) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
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
  
  export async function pushToGoogleCalendar(profileId: string, title: string, date: string, description?: string) {
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, title, date, description }),
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
      return (data.items || []).map((e: any) => ({
        id: e.id,
        title: e.summary || "Untitled",
        date: e.start?.date || e.start?.dateTime?.split("T")[0] || "",
        source: "google" as const,
      }));
    } catch (err) {
      console.error("Failed to pull from Google Calendar:", err);
      return [];
    }
  }