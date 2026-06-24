import type { Metadata } from "next";
import LegalPage, { LegalSection, P, UL } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · kria",
  description: "How kria collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="Legal"
      effectiveDate="24 June 2026"
      otherHref="/terms"
      otherLabel="Terms of Service"
    >
      <LegalSection heading="Who We Are">
        <P>
          Kria is a gig marketplace that connects Runners (workers) with Hosts (businesses and
          event organisers) across India. This Privacy Policy explains how we collect, use,
          share, and protect your personal data when you use the Kria Android app or
          visit trykria.com.
        </P>
        <P>
          For any privacy-related queries, contact us at{" "}
          <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>support@trykria.com</a>.
        </P>
      </LegalSection>

      <LegalSection heading="Data We Collect">
        <P><strong style={{ color: "#F4EFE3" }}>Account & profile</strong></P>
        <UL items={[
          "Phone number — used for login via OTP",
          "First name, last name, date of birth, gender",
          "City and state of residence",
          "Bio, skills, work experience, and education details you choose to add",
          "College name and year (optional, for student users)",
        ]} />

        <P><strong style={{ color: "#F4EFE3" }}>Location</strong></P>
        <UL items={[
          "GPS coordinates, collected in the foreground when you open the Explore tab — used to surface nearby gigs and display your current locality in the app",
          "We do not collect background location",
        ]} />

        <P><strong style={{ color: "#F4EFE3" }}>Identity verification (Runners only)</strong></P>
        <UL items={[
          "Government-issued ID type and document image (Aadhaar, PAN, Voter ID, Driving Licence, or Passport)",
          "Selfie photograph for face-matching against your ID document",
          "Liveness detection data to confirm you are physically present",
          "This data is processed by our secure verification pipeline and not used for any other purpose",
        ]} />

        <P><strong style={{ color: "#F4EFE3" }}>Device & usage</strong></P>
        <UL items={[
          "Push notification token (Expo) to send you application updates and OTPs",
          "Gigs applied to, accepted, and completed",
          "Check-in timestamps and OTP verification events",
          "Momentum score signals (punctuality, completion, ratings received)",
        ]} />
      </LegalSection>

      <LegalSection heading="How We Use Your Data">
        <UL items={[
          "Match you with nearby gigs based on your location, skills, and availability",
          "Verify your identity to build trust between Runners and Hosts",
          "Send push notifications — application status updates, OTP codes for check-in, and platform announcements",
          "Calculate and display your Momentum score, which reflects your reliability and performance on the platform",
          "Detect and prevent fraudulent activity, no-shows, and abuse",
          "Improve the app by understanding how features are used (aggregated, not linked to individuals)",
        ]} />
      </LegalSection>

      <LegalSection heading="Third Parties We Share Data With">
        <P>We do not sell your personal data. We share data only with the service providers below, who are contractually bound to protect it.</P>
        <UL items={[
          "Supabase Inc. — database and authentication infrastructure. Servers located in the United States. Data is encrypted in transit and at rest.",
          "Expo (Expo Technology Inc.) — push notification delivery. Only your push token and notification payload are shared.",
          "Google LLC — reverse geocoding (converting GPS coordinates to a city name for display in the app). Only your coordinates are sent; no identifying information is attached.",
        ]} />
        <P>
          We may disclose your data if required by Indian law, a court order, or to protect the safety of our users.
        </P>
      </LegalSection>

      <LegalSection heading="Data Retention">
        <UL items={[
          "Your account data is retained for as long as your account is active.",
          "If you delete your account, we delete your personal data within 30 days, except where retention is required by law.",
          "Identity verification documents and biometric data are deleted within 7 days of verification completion — we retain only the verified ID type (e.g. 'Aadhaar') as a boolean record.",
          "Aggregated and anonymised usage data may be retained indefinitely.",
        ]} />
      </LegalSection>

      <LegalSection heading="Security">
        <P>
          All data is transmitted over HTTPS. Personal and biometric data is encrypted at rest.
          Access to production systems is restricted to authorised personnel. We regularly review
          our security practices.
        </P>
        <P>
          No system is perfectly secure. If you suspect a security issue, please contact us immediately
          at <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>support@trykria.com</a>.
        </P>
      </LegalSection>

      <LegalSection heading="Your Rights (DPDPA 2023)">
        <P>
          Under the Digital Personal Data Protection Act, 2023 (India), you have the right to:
        </P>
        <UL items={[
          "Access — request a copy of the personal data we hold about you",
          "Correct — ask us to fix inaccurate or incomplete information",
          "Erase — request deletion of your data (subject to legal obligations)",
          "Withdraw consent — withdraw consent to processing at any time, which may affect your ability to use the platform",
          "Nominate — designate a nominee to exercise your data rights in the event of your death or incapacity",
        ]} />
        <P>
          To exercise any of these rights, email{" "}
          <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>support@trykria.com</a>{" "}
          from the phone number registered with your account. We will respond within 30 days.
        </P>
      </LegalSection>

      <LegalSection heading="Children">
        <P>
          Kria is intended for users who are 18 years of age or older. We do not knowingly collect
          personal data from anyone under 18. If we become aware that a user is under 18, we will
          delete their account and associated data.
        </P>
      </LegalSection>

      <LegalSection heading="Changes to This Policy">
        <P>
          We may update this policy as the platform evolves. Material changes will be communicated
          via an in-app notification at least 7 days before taking effect. Your continued use of
          Kria after that date constitutes acceptance of the updated policy.
        </P>
      </LegalSection>

      <LegalSection heading="Contact">
        <P>
          Kria<br />
          Email: <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>support@trykria.com</a><br />
          Country of operation: India
        </P>
      </LegalSection>
    </LegalPage>
  );
}
