const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#primary-nav");
const navLinks = document.querySelectorAll(".primary-nav a");
const heroImage = document.querySelector(".hero-image");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const enrollmentForm = document.querySelector("#enrollment-form");
const enrollmentStatus = document.querySelector("#enrollment-status");
const resultForm = document.querySelector("#result-form");
const resultStatus = document.querySelector("#result-status");
const resultCard = document.querySelector("#result-card");
const year = document.querySelector("#year");
const ENROLLMENT_STORAGE_KEY = "better-tomorrow.enrollments.v1";

const quotes = [
  "Every child can learn, lead, and shine.",
  "Strong roots today. Brighter wings tomorrow.",
  "Discipline, curiosity, kindness, excellence.",
];

const demoResults = [
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
      { name: "Creative Arts", score: 76, grade: "B", remark: "Very good" },
    ],
    teacherRemark: "Amina is focused, respectful, and consistent. Keep building speed in problem solving.",
  },
];

year.textContent = new Date().getFullYear();

decorateHero();
bindNavigation();
revealOnScroll();
activateScrollEffects();
bindResultChecker();
bindEnrollmentForm();
bindContactForm();

function decorateHero() {
  const heroContent = document.querySelector(".hero-content");
  if (!heroContent) return;

  const quote = document.createElement("div");
  quote.className = "hero-quote reveal";
  quote.setAttribute("aria-live", "polite");
  quote.innerHTML = `
    <span>Quote of the day</span>
    <strong>${quotes[0]}</strong>
  `;
  heroContent.appendChild(quote);

  let quoteIndex = 0;
  window.setInterval(() => {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    quote.classList.add("is-changing");
    window.setTimeout(() => {
      quote.querySelector("strong").textContent = quotes[quoteIndex];
      quote.classList.remove("is-changing");
    }, 220);
  }, 4200);
}

function bindNavigation() {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      header.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      header.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function revealOnScroll() {
  const revealTargets = document.querySelectorAll(
    ".quick-facts article, .section-copy, .section-heading, .values-grid article, .program-card, .feature-image-wrap, .feature-copy, .result-form, .result-card, .admission-steps article, .form-intro, .enrollment-form fieldset, .news-grid article, .contact-copy, .contact-form, .hero-quote"
  );

  revealTargets.forEach((target, index) => {
    target.classList.add("reveal");
    target.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((target) => observer.observe(target));
}

function activateScrollEffects() {
  const sections = [...document.querySelectorAll("main section[id]")];

  const setScrolledState = () => {
    const scrollY = window.scrollY;
    header.classList.toggle("is-scrolled", scrollY > 24);

    if (heroImage && scrollY < window.innerHeight) {
      heroImage.style.transform = `scale(1.04) translateY(${scrollY * 0.04}px)`;
    }
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-35% 0px -55% 0px" }
  );

  sections.forEach((section) => sectionObserver.observe(section));
  setScrolledState();
  window.addEventListener("scroll", setScrolledState, { passive: true });
}

function bindResultChecker() {
  if (!resultForm) return;

  resultForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(resultForm);
    const query = {
      studentId: clean(data.get("studentId")).toUpperCase(),
      term: clean(data.get("term")),
      pin: clean(data.get("pin")),
    };

    resultStatus.textContent = "Checking result...";

    try {
      const result = await fetchStudentResult(query);
      renderStudentResult(result);
      resultStatus.textContent = "Result found.";
    } catch {
      const result = findDemoResult(query);
      if (result) {
        renderStudentResult(result);
        resultStatus.textContent = "Demo result loaded. Use server data for real student results.";
      } else {
        renderResultEmpty("No result found. Please check the admission number, term, and PIN.");
        resultStatus.textContent = "No result found.";
      }
    }
  });
}

async function fetchStudentResult({ studentId, term, pin }) {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    throw new Error("Local file mode.");
  }

  const params = new URLSearchParams({ studentId, term, pin });
  const response = await fetch(`/api/results?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Result not found.");
  }

  return response.json();
}

function findDemoResult({ studentId, term, pin }) {
  return demoResults.find((result) => result.studentId === studentId && result.term === term && result.pin === pin);
}

function renderStudentResult(result) {
  const total = result.subjects.reduce((sum, subject) => sum + Number(subject.score || 0), 0);
  const average = result.subjects.length ? Math.round((total / result.subjects.length) * 10) / 10 : 0;
  const overallGrade = gradeFromAverage(average);

  resultCard.innerHTML = `
    <div class="result-header">
      <div>
        <h3>${escapeHtml(result.name)}</h3>
        <p>${escapeHtml(result.studentId)} - ${escapeHtml(result.classLevel)} - ${escapeHtml(result.term)}</p>
      </div>
      <strong>${escapeHtml(overallGrade)}</strong>
    </div>
    <div class="result-summary">
      <div><span>Total</span><strong>${total}</strong></div>
      <div><span>Average</span><strong>${average}%</strong></div>
      <div><span>Position</span><strong>${escapeHtml(result.position || "N/A")}</strong></div>
      <div><span>Subjects</span><strong>${result.subjects.length}</strong></div>
    </div>
    <div class="result-table-wrap">
      <table class="result-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Score</th>
            <th>Grade</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          ${result.subjects
            .map(
              (subject) => `
                <tr>
                  <td>${escapeHtml(subject.name)}</td>
                  <td>${escapeHtml(String(subject.score))}</td>
                  <td>${escapeHtml(subject.grade)}</td>
                  <td>${escapeHtml(subject.remark)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="result-remark">Teacher's remark: ${escapeHtml(result.teacherRemark || "No remark available.")}</p>
  `;
}

function renderResultEmpty(message) {
  resultCard.innerHTML = `
    <div class="empty-result">
      <span>BT</span>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function gradeFromAverage(average) {
  if (average >= 80) return "A";
  if (average >= 70) return "B";
  if (average >= 60) return "C";
  if (average >= 50) return "D";
  return "E";
}

function bindEnrollmentForm() {
  if (!enrollmentForm) return;

  enrollmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = enrollmentForm.querySelector("button[type='submit']");
    const enrollment = buildEnrollmentRecord(new FormData(enrollmentForm));

    submitButton.disabled = true;
    enrollmentStatus.textContent = "Submitting registration...";

    try {
      const result = await saveEnrollment(enrollment);
      enrollmentStatus.textContent = result.emailSent
        ? `Registration submitted and email notification sent. Reference: ${enrollment.reference}.`
        : `Registration submitted. Reference: ${enrollment.reference}. Email notification needs SMTP setup.`;
      enrollmentForm.reset();
    } catch {
      saveEnrollmentLocally(enrollment);
      enrollmentStatus.textContent = `Registration saved in this browser. Reference: ${enrollment.reference}.`;
    } finally {
      submitButton.disabled = false;
    }
  });
}

function buildEnrollmentRecord(data) {
  return {
    reference: `BT-${Date.now().toString(36).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    visit: {
      guardianName: clean(data.get("guardianName")),
      phone: clean(data.get("phone")),
      email: clean(data.get("email")),
      visitDate: clean(data.get("visitDate")),
    },
    apply: {
      childName: clean(data.get("childName")),
      birthDate: clean(data.get("birthDate")),
      classLevel: clean(data.get("classLevel")),
      previousSchool: clean(data.get("previousSchool")),
    },
    assess: {
      assessmentDate: clean(data.get("assessmentDate")),
      learningSupport: clean(data.get("learningSupport")),
      academicNotes: clean(data.get("academicNotes")),
    },
    enrollment: {
      startTerm: clean(data.get("startTerm")),
      emergencyContact: clean(data.get("emergencyContact")),
      address: clean(data.get("address")),
      referral: clean(data.get("referral")),
      consent: data.get("consent") === "on",
    },
    guardianName: clean(data.get("guardianName")),
  };
}

async function saveEnrollment(enrollment) {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    throw new Error("Local file mode.");
  }

  const response = await fetch("/api/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enrollment),
  });

  if (!response.ok) {
    throw new Error("Enrollment request failed.");
  }

  return response.json();
}

function saveEnrollmentLocally(enrollment) {
  const existing = JSON.parse(localStorage.getItem(ENROLLMENT_STORAGE_KEY) || "[]");
  existing.push(enrollment);
  localStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(existing));
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindContactForm() {
  if (!contactForm) return;

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "there").trim();

    formStatus.textContent = `Thank you, ${name}. Your enquiry is ready for the admissions team.`;
    contactForm.reset();

    window.setTimeout(() => {
      formStatus.textContent = "";
    }, 6000);
  });
}
