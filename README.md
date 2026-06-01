# BETTER TOMORROW School Website

A clean, responsive school website for **BETTER TOMORROW**. The homepage includes a front hero image, school values, academic programs, student life, admissions steps, events, and a contact form.

## Project Files

- `index.html` - Main website page and content.
- `styles.css` - Layout, colors, responsive design, and visual styling.
- `app.js` - Mobile menu, scroll animations, rotating hero quote, active navigation, and contact form feedback.
- `server.js` - Optional local static server.
- `assets/` - Website images, including the front classroom background image.
- `data/enrollments.json` - Submitted enrollment registrations when the local server is running.
- `data/results.json` - Student result records used by the result checker.

## Open the Website

You can open `index.html` directly in a browser.

## Run With the Local Server

If Node.js is available, run:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

## Customization

- Replace school contact details in `index.html`.
- Edit colors and spacing in `styles.css`.
- Update the rotating hero quotes in `app.js`.
- Add or replace images in the `assets/` folder.

## Enrollment Form

The Apply Now button scrolls to the enrollment form. The form collects details for Visit, Apply, Assess, and Enrollment. If you run the website with `node server.js`, submitted registrations are saved in `data/enrollments.json`. If the website is opened directly as an HTML file, registrations are saved in the visitor's browser storage instead.

## Email Notifications

New registrations can be emailed to:

```text
casnick27@gmail.com
```

To enable email notifications, run the local server with SMTP login details. For Gmail, create an App Password in your Google Account, then run these commands in PowerShell:

```powershell
cd "C:\Users\zikor\OneDrive\Documents\New project"
$env:SMTP_USER="casnick27@gmail.com"
$env:SMTP_PASS="your-gmail-app-password"
node server.js
```

Then open:

```text
http://localhost:3000
```

Keep the PowerShell window open while the website is receiving registrations. Each registration will still be saved in `data/enrollments.json`; if SMTP is configured correctly, an email notification will also be sent to `casnick27@gmail.com`.

## Result Checker

The website includes a Result Checker section. When the local server is running, the checker reads student records from `data/results.json`.

Demo result login:

```text
Admission number: BT-2026-001
Term: First Term 2026
PIN: 12345
```

To add real results, edit `data/results.json` and add each student's admission number, term, PIN, class, subjects, scores, grades, and teacher remark. Keep result PINs private and share them only with the correct parent or student.
