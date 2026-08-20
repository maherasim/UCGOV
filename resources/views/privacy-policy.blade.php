<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy — PA to ADLG</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.65; color: #1f2937; max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; background: #ffffff; }
        h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
        .updated { color: #6b7280; font-size: 0.9rem; margin-bottom: 2rem; }
        h2 { font-size: 1.15rem; margin-top: 2.25rem; margin-bottom: 0.5rem; color: #111827; }
        p, li { font-size: 0.97rem; }
        ul { padding-left: 1.4rem; }
        li { margin-bottom: 0.4rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; vertical-align: top; }
        th { background: #f9fafb; }
        a { color: #4f46e5; }
        .contact { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-top: 1rem; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="updated">PA to ADLG (Personal Assistant to ADLG for UCs' Management) — Last updated: {{ now()->format('F j, Y') }}</p>

    <p>
        This Privacy Policy explains how the PA to ADLG mobile application and web platform ("the App", "the Platform")
        collect, use, and protect information. The App is an internal government field-operations tool used by
        Secretaries, ADLGs, DDLGs, and Directors Local Government for Union Council governance, civil registration
        (birth/death), attendance tracking, and reporting under the Local Government &amp; Community Development
        Department. It is not available to the general public and is not used for advertising.
    </p>

    <h2>Information We Collect</h2>
    <table>
        <tr><th>Category</th><th>What's collected</th><th>Why</th></tr>
        <tr>
            <td>Account &amp; identity</td>
            <td>Name, username, CNIC, phone number, email, employee grade, department role, profile photo</td>
            <td>To create and secure your official account and route work to the correct office</td>
        </tr>
        <tr>
            <td>Location</td>
            <td>Precise (GPS) and, while on duty, background location</td>
            <td>To verify field-staff attendance is marked from the correct Union Council (geofencing) and to log
                approved out-of-office movement. Background location is only collected during active duty hours and
                is tied to your employment attendance record, never sold or used for advertising.</td>
        </tr>
        <tr>
            <td>Camera / photos</td>
            <td>Attendance check-in selfies, scanned documents/attachments you choose to upload</td>
            <td>To verify identity at check-in and attach supporting documents to cases, reports, and registrations</td>
        </tr>
        <tr>
            <td>Biometric</td>
            <td>Device fingerprint/biometric prompt result</td>
            <td>Authenticated entirely on your device via the operating system's biometric API. We never receive or
                store your fingerprint data itself — only a yes/no confirmation that the device verified you.</td>
        </tr>
        <tr>
            <td>Work records</td>
            <td>Attendance logs, daily activity reports, case files (Divorce/Khula, Birth &amp; Death registration),
                newsletters, inquiries, and any files you upload to these</td>
            <td>This is the core operational data the App exists to manage</td>
        </tr>
        <tr>
            <td>Device &amp; push token</td>
            <td>Device push-notification token (Firebase Cloud Messaging)</td>
            <td>To deliver work-related alerts (new case assigned, report due, document published)</td>
        </tr>
    </table>

    <h2>How Information Is Used</h2>
    <ul>
        <li>To operate core features: attendance marking, case/report submission and review, document sharing, and
            the internal notification system.</li>
        <li>To let supervising officers (ADLG/DDLG/DG) view and export activity within their own jurisdiction, as
            defined by each user's official role.</li>
        <li>To maintain an audit trail of official actions, as required for government record-keeping.</li>
    </ul>
    <p>We do not sell, rent, or use your data for advertising or marketing. We do not share data with third parties
        except infrastructure providers strictly necessary to run the service (e.g. cloud hosting, Firebase push
        notifications), who are bound to use it only to provide that service.</p>

    <h2>Data Storage &amp; Retention</h2>
    <p>Data is stored on secured servers operated for the Local Government &amp; Community Development Department.
        Official records (attendance, case files, registrations) are retained for as long as required by government
        record-keeping policy. You can request access to or correction of your own account details at any time
        through your reporting officer or the contact below.</p>

    <h2>Your Choices</h2>
    <ul>
        <li>Location and camera permissions can be managed from your device's app settings, though attendance-related
            features will not function without them, as they are core to the App's purpose.</li>
        <li>You may request a copy of, or deletion of, your personal account data by contacting us below, subject to
            the government's official record-retention requirements for work-related records.</li>
    </ul>

    <h2>Children's Privacy</h2>
    <p>The App is a workplace tool for department employees and is not directed at or knowingly used by children.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this policy as the App evolves. Material changes will be reflected here with an updated date.</p>

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
