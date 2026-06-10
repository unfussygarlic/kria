"""On-brand HTML email templates for Kria notifications."""

from app.config import settings


def _base(*, content: str, unsubscribe_href: str | None = None) -> str:
    footer_extra = ""
    if unsubscribe_href:
        footer_extra = f"""
        <tr>
          <td style="padding: 4px 0 0; text-align: center;">
            <a href="{unsubscribe_href}"
               style="color:#555; font-size:11px; text-decoration:underline;">
              Unsubscribe from these reminders
            </a>
          </td>
        </tr>"""

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kria</title>
</head>
<body style="margin:0; padding:0; background-color:#0e0e0e; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0e0e0e; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#131313; border:1px solid rgba(255,255,255,0.08);
                      border-radius:16px; overflow:hidden; max-width:520px; width:100%;">

          <!-- Header bar -->
          <tr>
            <td style="background-color:#D4FF00; padding: 18px 32px;">
              <span style="font-size:18px; font-weight:900; color:#0e0e0e;
                           letter-spacing:-0.5px; text-transform:uppercase;">
                KRIA
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid rgba(255,255,255,0.08);
                              padding-top: 20px; text-align:center;">
                    <p style="margin:0; color:#555; font-size:11px; line-height:1.6;">
                      You're receiving this because you have a Kria host account.<br />
                      &copy; {__import__("datetime").date.today().year} Kria
                    </p>
                  </td>
                </tr>
                {footer_extra}
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _btn(href: str, label: str) -> str:
    return f"""
    <a href="{href}"
       style="display:inline-block; margin-top:24px; padding:12px 28px;
              background-color:#D4FF00; color:#0e0e0e; font-weight:800;
              font-size:12px; letter-spacing:1px; text-transform:uppercase;
              text-decoration:none; border-radius:8px;">
      {label}
    </a>"""


def first_application_email(
    *,
    host_name: str,
    gig_title: str,
    applicant_name: str,
    gig_url: str,
) -> tuple[str, str]:
    """Returns (subject, html) for the first-application notification."""
    subject = f"Someone applied to '{gig_title}' 🎯"
    content = f"""
      <h2 style="margin:0 0 8px; color:#ffffff; font-size:22px;
                 font-weight:800; letter-spacing:-0.5px; line-height:1.3;">
        Your first applicant is here
      </h2>
      <p style="margin:0 0 20px; color:#aaa; font-size:14px; line-height:1.6;">
        Hey {host_name} — <strong style="color:#fff;">{applicant_name}</strong>
        just applied to your gig <strong style="color:#D4FF00;">{gig_title}</strong>.
        You're off to a great start.
      </p>
      <table cellpadding="0" cellspacing="0" border="0"
             style="background-color:#1a1919; border:1px solid rgba(255,255,255,0.10);
                    border-radius:10px; width:100%; margin-bottom:4px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0; color:#aaa; font-size:10px; font-weight:700;
                      letter-spacing:1.5px; text-transform:uppercase;">Gig</p>
            <p style="margin:4px 0 0; color:#fff; font-size:15px;
                      font-weight:700;">{gig_title}</p>
          </td>
        </tr>
      </table>
      {_btn(gig_url, "View Applicant")}
    """
    return subject, _base(content=content)


def burst_application_email(
    *,
    host_name: str,
    gig_title: str,
    count: int,
    minutes: int,
    gig_url: str,
) -> tuple[str, str]:
    """Returns (subject, html) for the application-burst notification."""
    subject = f"{count} new applicants for '{gig_title}'"
    content = f"""
      <h2 style="margin:0 0 8px; color:#ffffff; font-size:22px;
                 font-weight:800; letter-spacing:-0.5px; line-height:1.3;">
        You&rsquo;re getting traction
      </h2>
      <p style="margin:0 0 20px; color:#aaa; font-size:14px; line-height:1.6;">
        Hey {host_name} — <strong style="color:#D4FF00;">{count} runners</strong>
        applied to <strong style="color:#fff;">{gig_title}</strong>
        in the last {minutes} minutes. Jump in before the momentum slows down.
      </p>
      <table cellpadding="0" cellspacing="0" border="0"
             style="background-color:#1a1919; border:1px solid rgba(255,255,255,0.10);
                    border-radius:10px; width:100%; margin-bottom:4px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0; color:#aaa; font-size:10px; font-weight:700;
                      letter-spacing:1.5px; text-transform:uppercase;">New Applicants</p>
            <p style="margin:4px 0 0; color:#D4FF00; font-size:28px;
                      font-weight:900;">{count}</p>
          </td>
        </tr>
      </table>
      {_btn(gig_url, "Review Applicants")}
    """
    return subject, _base(content=content)


def profile_reminder_email(
    *,
    host_name: str,
    missing_fields: list[str],
    profile_url: str,
    unsubscribe_href: str,
) -> tuple[str, str]:
    """Returns (subject, html) for incomplete-profile reminder."""
    subject = "Complete your Kria profile to attract better runners"
    missing_html = "".join(
        f'<li style="margin-bottom:4px; color:#aaa; font-size:13px;">{f}</li>'
        for f in missing_fields
    )
    content = f"""
      <h2 style="margin:0 0 8px; color:#ffffff; font-size:22px;
                 font-weight:800; letter-spacing:-0.5px; line-height:1.3;">
        Your profile is incomplete
      </h2>
      <p style="margin:0 0 16px; color:#aaa; font-size:14px; line-height:1.6;">
        Hey {host_name} — hosts with complete profiles get up to
        <strong style="color:#D4FF00;">3&times; more applicants</strong>.
        You're still missing:
      </p>
      <ul style="margin:0 0 20px; padding-left:20px;">
        {missing_html}
      </ul>
      <p style="margin:0; color:#aaa; font-size:13px; line-height:1.6;">
        It only takes a minute — and it makes a big difference to runners evaluating your gigs.
      </p>
      {_btn(profile_url, "Complete Profile")}
    """
    return subject, _base(content=content, unsubscribe_href=unsubscribe_href)


def unsubscribe_confirmation_html(category: str) -> str:
    label = "profile reminders" if category == "reminders" else f"{category} emails"
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Unsubscribed — Kria</title>
  <style>
    body {{ margin:0; background:#0e0e0e; font-family:'Helvetica Neue',Arial,sans-serif;
            display:flex; align-items:center; justify-content:center; min-height:100vh; }}
    .card {{ background:#131313; border:1px solid rgba(255,255,255,0.08);
             border-radius:16px; padding:48px 40px; max-width:440px; text-align:center; }}
    h1 {{ color:#fff; font-size:22px; font-weight:800; margin:0 0 12px; }}
    p  {{ color:#aaa; font-size:14px; line-height:1.6; margin:0; }}
    .dot {{ display:inline-block; width:8px; height:8px; background:#D4FF00;
            border-radius:50%; margin-bottom:24px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="dot"></div>
    <h1>You're unsubscribed</h1>
    <p>You've been removed from <strong style="color:#fff">{label}</strong>.<br />
       You can re-enable notifications from your Kria profile settings.</p>
  </div>
</body>
</html>"""
