const http = require("http");
const fs = require("fs");
const path = require("path");
const tls = require("tls");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ENROLLMENTS_FILE = path.join(DATA_DIR, "enrollments.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const EMAIL_TO = process.env.ENROLLMENT_EMAIL_TO || "casnick27@gmail.com";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

ensureEnrollmentsFile();
ensureResultsFile();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${PORT}`);

    if (url.pathname === "/api/enrollments" && request.method === "POST") {
      const enrollment = await readJsonBody(request);
      const enrollments = readEnrollments();
      enrollments.push(enrollment);
      writeEnrollments(enrollments);

      const email = await sendEnrollmentNotification(enrollment);
      return sendJson(response, {
        ok: true,
        reference: enrollment.reference,
        emailSent: email.sent,
        emailStatus: email.status,
      });
    }

    if (url.pathname === "/api/results" && request.method === "GET") {
      const result = findStudentResult({
        studentId: url.searchParams.get("studentId"),
        term: url.searchParams.get("term"),
        pin: url.searchParams.get("pin"),
      });

      if (!result) {
        return sendJson(response, { error: "Result not found." }, 404);
      }

      return sendJson(response, publicResult(result));
    }

    serveStatic(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, { error: "Server error." }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`BETTER TOMORROW website running at http://localhost:${PORT}`);
});

function serveStatic(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, `http://localhost:${PORT}`).pathname);
  const filePath = requestedPath === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, requestedPath);
  const safePath = path.normalize(filePath);

  if (!safePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(safePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(safePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

function ensureEnrollmentsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(ENROLLMENTS_FILE)) {
    writeEnrollments([]);
  }
}

function ensureResultsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(RESULTS_FILE)) {
    writeResults([
      {
        studentId: "BT-2026-001",
        pin: "12345",
        term: "First Term 2026",
        name: "Amina Johnson",
        classLevel: "Primary 5",
        position: "2nd",
        subjects: [
          { name: "Mathematics", score: 88, grade: "A", remark: "Excellent" },
          { name: "English Language", score: 84, grade: "A", remark: "Excellent" },
          { name: "Basic Science", score: 79, grade: "B", remark: "Very good" },
          { name: "Social Studies", score: 81, grade: "A", remark: "Excellent" },
          { name: "Creative Arts", score: 76, grade: "B", remark: "Very good" }
        ],
        teacherRemark: "Amina is focused, respectful, and consistent. Keep building speed in problem solving."
      }
    ]);
  }
}

function readEnrollments() {
  return JSON.parse(fs.readFileSync(ENROLLMENTS_FILE, "utf8"));
}

function writeEnrollments(enrollments) {
  fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2));
}

function readResults() {
  return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
}

function writeResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function findStudentResult({ studentId, term, pin }) {
  const normalizedId = String(studentId || "").trim().toUpperCase();
  const normalizedTerm = String(term || "").trim();
  const normalizedPin = String(pin || "").trim();

  return readResults().find((result) => {
    return (
      String(result.studentId || "").trim().toUpperCase() === normalizedId &&
      String(result.term || "").trim() === normalizedTerm &&
      String(result.pin || "").trim() === normalizedPin
    );
  });
}

function publicResult(result) {
  const { pin, ...safeResult } = result;
  return safeResult;
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

async function sendEnrollmentNotification(enrollment) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("Enrollment saved. Email notification skipped because SMTP_USER and SMTP_PASS are not set.");
    return { sent: false, status: "smtp-not-configured" };
  }

  try {
    const message = formatEnrollmentEmail(enrollment);
    await sendSmtpMail({
      host: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
      from: SMTP_USER,
      to: EMAIL_TO,
      subject: `New BETTER TOMORROW registration - ${enrollment.reference || "No reference"}`,
      message,
    });

    console.log(`Enrollment email sent to ${EMAIL_TO} for ${enrollment.reference}.`);
    return { sent: true, status: "sent" };
  } catch (error) {
    console.error("Enrollment saved, but email notification failed:", error.message);
    return { sent: false, status: "send-failed" };
  }
}

function formatEnrollmentEmail(enrollment) {
  return [
    "A new student registration was submitted on the BETTER TOMORROW website.",
    "",
    `Reference: ${enrollment.reference || ""}`,
    `Submitted: ${enrollment.submittedAt || ""}`,
    "",
    "VISIT",
    `Guardian: ${enrollment.visit?.guardianName || enrollment.guardianName || ""}`,
    `Phone: ${enrollment.visit?.phone || ""}`,
    `Email: ${enrollment.visit?.email || ""}`,
    `Preferred visit date: ${enrollment.visit?.visitDate || ""}`,
    "",
    "APPLY",
    `Child name: ${enrollment.apply?.childName || ""}`,
    `Date of birth: ${enrollment.apply?.birthDate || ""}`,
    `Class applying for: ${enrollment.apply?.classLevel || ""}`,
    `Previous school: ${enrollment.apply?.previousSchool || ""}`,
    "",
    "ASSESS",
    `Preferred assessment date: ${enrollment.assess?.assessmentDate || ""}`,
    `Learning support needed: ${enrollment.assess?.learningSupport || ""}`,
    `Academic notes: ${enrollment.assess?.academicNotes || ""}`,
    "",
    "ENROLLMENT",
    `Preferred start term: ${enrollment.enrollment?.startTerm || ""}`,
    `Emergency contact: ${enrollment.enrollment?.emergencyContact || ""}`,
    `Home address: ${enrollment.enrollment?.address || ""}`,
    `Referral source: ${enrollment.enrollment?.referral || ""}`,
    `Consent: ${enrollment.enrollment?.consent ? "Yes" : "No"}`,
  ].join("\n");
}

function sendSmtpMail({ host, port, username, password, from, to, subject, message }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(port, host, { servername: host });
    let buffer = "";
    let step = 0;

    const commands = [
      `EHLO localhost`,
      `AUTH LOGIN`,
      Buffer.from(username).toString("base64"),
      Buffer.from(password).toString("base64"),
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      `DATA`,
      buildEmailData({ from, to, subject, message }),
      `QUIT`,
    ];

    socket.setEncoding("utf8");
    socket.setTimeout(15000);

    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        if (/^[45]\d\d/.test(line)) {
          socket.end();
          reject(new Error(`SMTP error: ${line}`));
          return;
        }

        if (/^\d\d\d[ -]/.test(line) && line[3] !== "-") {
          if (step >= commands.length) {
            resolve();
            socket.end();
            return;
          }

          socket.write(`${commands[step]}\r\n`);
          step += 1;
        }
      }
    });

    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out."));
    });
  });
}

function buildEmailData({ from, to, subject, message }) {
  const escapedMessage = message.replace(/^\./gm, "..").replace(/\n/g, "\r\n");

  return [
    `From: BETTER TOMORROW Website <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    escapedMessage,
    ".",
  ].join("\r\n");
}
