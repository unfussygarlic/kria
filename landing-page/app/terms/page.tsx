import type { Metadata } from "next";
import LegalPage, { LegalSection, P, UL } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service · kria",
  description: "The rules and expectations for using the Kria platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Legal"
      effectiveDate="24 June 2026"
      otherHref="/privacy"
      otherLabel="Privacy Policy"
    >
      <LegalSection heading="About Kria">
        <P>
          Kria is a gig marketplace that connects Runners (individuals looking for short-term
          event work) with Hosts (businesses and event organisers posting gigs). By creating an
          account or using the Kria app or trykria.com, you agree to these Terms of Service.
        </P>
        <P>
          Kria is a platform — not an employer, staffing agency, or party to any agreement between
          a Runner and a Host. We do not guarantee work availability or payment.
        </P>
      </LegalSection>

      <LegalSection heading="Eligibility">
        <UL items={[
          "You must be at least 18 years old to use Kria.",
          "You must be located in India.",
          "You must provide accurate, current, and complete information during registration.",
          "You may only hold one account. Creating multiple accounts is grounds for immediate termination.",
        ]} />
      </LegalSection>

      <LegalSection heading="Runner Responsibilities">
        <P>As a Runner, you agree to:</P>
        <UL items={[
          "Apply only to gigs you genuinely intend to attend and are eligible for.",
          "Arrive on time and stay for the full duration of the shift.",
          "Complete the OTP check-in process at the start of your gig — this is required for your assignment to be marked complete and for your Momentum score to be updated.",
          "Notify the Host as early as possible if you are unable to attend. Unexplained no-shows will result in a penalty to your Momentum score and may lead to account suspension.",
          "Behave professionally and respectfully toward Hosts, other workers, and event attendees.",
          "Not share your OTP or account credentials with anyone.",
        ]} />
      </LegalSection>

      <LegalSection heading="Host Responsibilities">
        <P>As a Host, you agree to:</P>
        <UL items={[
          "Post gigs with accurate descriptions — correct location, dates, shift times, pay, and requirements.",
          "Pay Runners the agreed amount, in full, at or before the end of the shift. Kria does not process payments and is not liable for non-payment.",
          "Be present or designate a representative to provide the OTP to Runners at the start of their shift.",
          "Treat Runners with respect and provide a safe working environment.",
          "Not post gigs for activities that are illegal, unsafe, or violate these Terms.",
        ]} />
      </LegalSection>

      <LegalSection heading="Momentum Score">
        <P>
          Kria operates a Momentum scoring system (0–1000) for Runners that reflects reliability,
          completion rate, punctuality, and ratings from Hosts. Momentum is used to rank Runners
          in search results and may affect future gig opportunities.
        </P>
        <UL items={[
          "Scores increase through completed gigs, positive ratings, and consistent behaviour.",
          "Scores decrease through no-shows, disputes, and negative ratings.",
          "Kria's scoring decisions are final. We do not offer manual adjustments except in the case of a verified platform error.",
        ]} />
      </LegalSection>

      <LegalSection heading="Identity Verification">
        <P>
          Runners may optionally verify their identity using a government-issued ID. Verified
          Runners display a verified badge on their profile. Verification is processed securely
          and governed by our{" "}
          <a href="/privacy" style={{ color: "#D4FF00" }}>Privacy Policy</a>.
          Submitting false or another person's documents is a serious violation and will result
          in permanent account termination and may be reported to authorities.
        </P>
      </LegalSection>

      <LegalSection heading="Payments">
        <P>
          Kria does not process, hold, or guarantee any payments between Runners and Hosts.
          All payment arrangements are made directly between the parties. Any disputes about
          payment must be resolved between the Runner and the Host.
        </P>
        <P>
          Kria may in future offer payment processing features, at which point separate terms
          will apply.
        </P>
      </LegalSection>

      <LegalSection heading="Prohibited Conduct">
        <P>You must not:</P>
        <UL items={[
          "Create false profiles, use someone else's identity, or misrepresent your qualifications.",
          "Spam-apply to gigs with no genuine intent to attend.",
          "Harass, threaten, or discriminate against any user.",
          "Attempt to contact users outside the platform to circumvent Kria's marketplace.",
          "Use the platform to facilitate any illegal activity.",
          "Scrape, reverse-engineer, or otherwise misuse Kria's systems or data.",
          "Attempt to manipulate ratings, reviews, or Momentum scores.",
        ]} />
      </LegalSection>

      <LegalSection heading="Termination">
        <P>
          Kria may suspend or permanently terminate your account at any time for violations of
          these Terms, fraudulent activity, or behaviour that harms other users or the platform.
          We will notify you unless doing so would compromise an investigation or is prohibited by law.
        </P>
        <P>
          You may delete your account at any time from the app settings. Deletion does not erase
          records of past gigs or disputes, which may be retained as required by law.
        </P>
      </LegalSection>

      <LegalSection heading="Limitation of Liability">
        <P>
          To the maximum extent permitted by Indian law, Kria is not liable for:
        </P>
        <UL items={[
          "Any loss of earnings, missed gig opportunities, or disputes between Runners and Hosts.",
          "Actions or omissions of any user on the platform.",
          "Temporary unavailability of the app or services.",
          "Any indirect, incidental, or consequential damages arising from your use of Kria.",
        ]} />
        <P>
          Our total liability to you for any claim arising out of or relating to these Terms
          shall not exceed ₹500.
        </P>
      </LegalSection>

      <LegalSection heading="Governing Law">
        <P>
          These Terms are governed by the laws of India. Any disputes arising from these Terms
          or your use of Kria shall be subject to the exclusive jurisdiction of the courts of India.
        </P>
      </LegalSection>

      <LegalSection heading="Changes to These Terms">
        <P>
          We may update these Terms as the platform grows. Material changes will be communicated
          via in-app notification at least 7 days before taking effect. Continued use of Kria
          after that date constitutes your acceptance of the updated Terms.
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
