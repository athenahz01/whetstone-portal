export default function TermsOfService() {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#e0e0e0", background: "#181820", minHeight: "100vh" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#717171", marginBottom: 32 }}>Last updated: March 19, 2026</p>
  
        <Section title="1. Acceptance of Terms">
          By accessing or using the Whetstone Portal ("Service") operated by Whetstone Admissions ("we," "our," or "us"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
        </Section>
  
        <Section title="2. Description of Service">
          The Whetstone Portal is a college admissions coaching platform that provides tools for students, parents, mentors, and specialists to manage the admissions process. Features include task management, session scheduling, calendar integration, school research, essay tracking, and academic planning.
        </Section>
  
        <Section title="3. Accounts">
          Accounts are created by Whetstone staff on behalf of students and parents. You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately of any unauthorized use of your account.
        </Section>
  
        <Section title="4. Acceptable Use">
          You agree not to:
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Share your login credentials with unauthorized individuals</li>
            <li>Upload malicious content or interfere with the Service's operation</li>
            <li>Scrape, copy, or redistribute data from the Service</li>
          </ul>
        </Section>
  
        <Section title="5. Intellectual Property">
          The Service, including its design, code, and content, is owned by Whetstone Admissions. Content you create (essays, notes, reflections) remains your intellectual property. By using the Service, you grant us a limited license to store and display your content as necessary to provide the Service.
        </Section>
  
        <Section title="6. Third-Party Integrations">
          The Service integrates with third-party services including Google Calendar, Supabase, and Vercel. Your use of these integrations is subject to their respective terms of service and privacy policies. We are not responsible for the availability or practices of third-party services.
        </Section>
  
        <Section title="7. Limitation of Liability">
          The Service is provided "as is" without warranties of any kind. Whetstone Admissions is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid for the Service in the 12 months preceding the claim.
        </Section>
  
        <Section title="8. Termination">
          We may suspend or terminate your account at any time for violation of these Terms or at our discretion. Upon termination, your right to use the Service will immediately cease. You may request deletion of your data upon account termination.
        </Section>
  
        <Section title="9. Changes to Terms">
          We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
        </Section>
  
        <Section title="10. Contact">
          For questions about these Terms, contact us at:
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