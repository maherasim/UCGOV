<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Your Account — PA to ADLG</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.65; color: #1f2937; max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; background: #ffffff; }
        h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
        .updated { color: #6b7280; font-size: 0.9rem; margin-bottom: 2rem; }
        h2 { font-size: 1.15rem; margin-top: 2.25rem; margin-bottom: 0.5rem; color: #111827; }
        p, li { font-size: 0.97rem; }
        ul, ol { padding-left: 1.4rem; }
        li { margin-bottom: 0.5rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; vertical-align: top; }
        th { background: #f9fafb; }
        a { color: #4f46e5; }
        .contact { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-top: 1rem; }
        .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin: 1.25rem 0; font-size: 0.92rem; }
    </style>
</head>
<body>
    <h1>Delete Your Account &amp; Data</h1>
    <p class="updated">PA to ADLG (Personal Assistant to ADLG for UCs' Management) — Last updated: {{ now()->format('F j, Y') }}</p>

    <div class="note">
        Accounts on this platform are official department accounts issued to Secretaries, ADLGs, DDLGs, and Directors
        Local Government by their office — there is no public self-signup. Because of this, account deletion is
        handled as an administrative request rather than a self-service in-app button, consistent with how the
        underlying employment/official record is managed.
    </div>

    <h2>How to Request Deletion</h2>
    <ol>
        <li>Contact your reporting officer, or the office that issued your account (ADLG, DDLG, or the Local
            Government &amp; Community Development Department administrator), and request account deletion.</li>
        <li>Alternatively, email the platform support address below with your registered username and the account
            you'd like removed.</li>
        <li>We will confirm your identity and process the request. Deletion is typically completed within 30 days.</li>
    </ol>

    <h2>What Gets Deleted</h2>
    <table>
        <tr><th>Data</th><th>What happens</th></tr>
        <tr>
            <td>Login credentials, profile photo, contact details</td>
            <td>Permanently deleted</td>
        </tr>
        <tr>
            <td>Device push-notification token</td>
            <td>Permanently deleted / unregistered</td>
        </tr>
        <tr>
            <td>Location and biometric check-in data</td>
            <td>Permanently deleted</td>
        </tr>
        <tr>
            <td>Official work records you created or acted on (attendance history, submitted reports,
                case files, registrations)</td>
            <td>Retained in de-identified/archival form as required by government record-keeping policy — these are
                official department records, not personal data, and remain necessary for audit and continuity even
                after an employee's account is removed.</td>
        </tr>
    </table>

    <p>For full details on what is collected and why, see our
        <a href="{{ url('/privacy-policy') }}">Privacy Policy</a>.</p>

    <h2>Contact Us</h2>
    <div class="contact">
        <p style="margin:0">
            Local Government &amp; Community Development Department<br>
            PA to ADLG Platform Support<br>
            <a href="https://pa-to-adlg.com">https://pa-to-adlg.com</a>
        </p>
    </div>
</body>
</html>
