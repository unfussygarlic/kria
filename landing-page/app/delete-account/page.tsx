import type { Metadata } from "next";
import LegalPage, { LegalSection, P, UL } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Delete Account · kria",
  description: "How to delete your Kria account and associated data.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete Your Account"
      subtitle="Account"
      effectiveDate="24 June 2026"
      otherHref="/privacy"
      otherLabel="Privacy Policy"
    >
      <LegalSection heading="What Gets Deleted">
        <P>
          When you delete your Kria account, the following data is permanently removed within
          30 days:
        </P>
        <UL items={[
          "Your profile — name, date of birth, gender, city, bio, skills, work experience, and education",
          "Your phone number and login credentials",
          "Your identity verification status and associated document references",
          "Your Momentum score, gig history, and ratings",
          "Your push notification token",
        ]} />
        <P>
          Aggregated and anonymised platform statistics (such as total gigs completed in a city)
          are not linked to your identity and are retained.
        </P>
      </LegalSection>

      <LegalSection heading="Option 1 — Delete from the App">
        <P>
          The fastest way to delete your account is directly inside the Kria app:
        </P>
        <UL items={[
          "Open the Kria app and log in",
          "Tap your avatar (top right) to open your Profile",
          "Tap Settings",
          'Scroll to the bottom and tap "Delete Account"',
          "Confirm when prompted — your account will be queued for deletion immediately",
        ]} />
      </LegalSection>

      <LegalSection heading="Option 2 — Email Request">
        <P>
          If you cannot access the app, email us at{" "}
          <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>
            support@trykria.com
          </a>{" "}
          from the address or phone number associated with your account. Include:
        </P>
        <UL items={[
          "The phone number registered to your account (with country code)",
          'Subject line: "Account Deletion Request"',
        ]} />
        <P>
          We will confirm deletion within 7 days and complete the removal of your data
          within 30 days of confirmation.
        </P>
      </LegalSection>

      <LegalSection heading="Things to Know Before You Delete">
        <UL items={[
          "Deletion is permanent and cannot be undone.",
          "Any pending gig applications will be automatically withdrawn.",
          "Hosts who have already accepted you for a gig will be notified that you are no longer available.",
          "Your Momentum score cannot be transferred or recovered after deletion.",
          "If you change your mind, you can create a new account with the same phone number — but your history and score will start from zero.",
        ]} />
      </LegalSection>

      <LegalSection heading="Questions">
        <P>
          For any questions about account deletion or your data, contact us at{" "}
          <a href="mailto:support@trykria.com" style={{ color: "#D4FF00" }}>
            support@trykria.com
          </a>
          . We typically respond within 2 business days.
        </P>
      </LegalSection>
    </LegalPage>
  );
}
