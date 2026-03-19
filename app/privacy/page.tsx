export default function PrivacyPolicy() {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#e0e0e0", background: "#181820", minHeight: "100vh" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: "#717171", marginBottom: 32 }}>Last updated: March 19, 2026</p>
  
        <Section title="1. Introduction">
          Whetstone Admissions ("we," "our," or "us") operates the Whetstone Portal at whetstone-portal.com (the "Service"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service.
        </Section>
  
        <Section title="2. Information We Collect">
          <strong>Account Information:</strong> When your account is created by a Whetstone mentor, we store your name, email address, school, graduation year, and role (student, parent, or staff).
          <br /><br />
          <strong>Academic Information:</strong> You may provide GPA, test scores, coursework, extracurricular activities, honors, school lists, and essay drafts through the portal.
          <br /><br />
          <strong>Session & Planning Data:</strong> Information about scheduled sessions, task deadlines, receptacle planning entries, and close & commit reflections.
          <br /><br />
          <strong>Google Calendar Data:</strong> If you choose to connect your Google Calendar, we access your calendar events solely to sync session schedules between our platform and your Google Calendar. We read event titles, dates, times, and attendee emails to identify sessions between staff and students. We do not access or store the content of events unrelated to Whetstone sessions.
          <br /><br />
          <strong>Usage Data:</strong> We record login timestamps and basic engagement metrics to help mentors support students effectively.
        </Section>
  
        <Section title="3. How We Use Your Information">
          We use your information to:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Provide and operate the admissions coaching platform</li>
            <li>Enable mentors and specialists to track student progress</li>
            <li>Sync sessions and deadlines with your Google Calendar (if connected)</li>
            <li>Generate Apple Calendar subscription feeds (if requested)</li>
            <li>Display school admissions statistics from public data sources</li>
            <li>Send session reminders and notifications (when enabled)</li>
          </ul>
        </Section>
  
        <Section title="4. Google Calendar Integration">
          When you connect your Google Calendar:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>We request access to read and write calendar events using the <code>calendar.events</code> scope</li>
            <li>We create events tagged with "[Whetstone]" for confirmed sessions</li>
            <li>We read event attendees to detect sessions between staff and student email addresses</li>
            <li>Your Google OAuth tokens are stored securely in our database and used only to sync calendar data</li>
            <li>You can disconnect Google Calendar at any time by revoking access in your Google Account settings</li>
            <li>We do not share your Google Calendar data with third parties</li>
          </ul>
          Our use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#5A83F3" }}>Google API Services User Data Policy</a>, including the Limited Use requirements.
        </Section>
  
        <Section title="5. Data Storage & Security">
          Your data is stored securely using Supabase (PostgreSQL) with row-level security policies. Our application is hosted on Vercel. We use HTTPS encryption for all data in transit. Access to student data is restricted by role — students can only see their own data, parents can view their child's data, and staff access is controlled by caseload assignments.
        </Section>
  
        <Section title="6. Data Sharing">
          We do not sell, rent, or share your personal information with third parties except:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>With your assigned Whetstone mentors and specialists as part of the coaching service</li>
            <li>With infrastructure providers (Supabase, Vercel, Google) as necessary to operate the Service</li>
            <li>If required by law or to protect our legal rights</li>
          </ul>
        </Section>
  
        <Section title="7. Data Retention">
          We retain your data for as long as your account is active or as needed to provide the Service. If you request account deletion, we will remove your personal data within 30 days, except where we are required to retain it by law.
        </Section>
  
        <Section title="8. Your Rights">
          You have the right to:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Access your personal data through the portal</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Disconnect Google Calendar integration at any time</li>
            <li>Export your data upon request</li>
          </ul>
          To exercise these rights, contact us at athena@whetstoneadmissions.com.
        </Section>
  
        <Section title="9. Children's Privacy">
          Our Service is designed for high school and college students. We do not knowingly collect personal information from children under 13. If a parent or guardian becomes aware that their child has provided us with personal information without their consent, please contact us.
        </Section>
  
        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify users of significant changes by updating the "Last updated" date at the top of this page.
        </Section>
  
        <Section title="11. Contact Us">
          If you have questions about this Privacy Policy, please contact us at:
          <br /><br />
          <strong>Whetstone Admissions</strong><br />
          Email: athena@whetstoneadmissions.com<br />
          Website: whetstone-portal.com
        </Section>
      </div>
    );
  }
  
  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 10 }}>{title}</h2>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "#a0a0a0" }}>{children}</div>
      </div>
    );
  }