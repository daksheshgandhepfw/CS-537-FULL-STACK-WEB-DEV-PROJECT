/// <reference types="cypress" />

const APP_URL = "http://localhost:5173";
const FIXED_NOW = new Date("2026-04-25T09:00:00.000Z").getTime();

// -----------------------------------
// Mock data for test cases

const testUser = {
  id: "user-cypress-001",
  name: "Test User",
  email: "test.user@example.com",
  password: "TestUser123!",
};

const setupFixtures = [
  {
    companyName: "Netflix",
    jobTitle: "Frontend Engineer",
    jobDescription:
      "Build scalable React interfaces, write tests, and collaborate with product teams.",
    resume:
      "React developer with TypeScript, Cypress, accessibility, and API integration experience.",
    companyPackLabel: "General Tech Standard",
    focusLabel: "Technical",
    difficultyLabel: "Hard",
    durationLabel: "45 mins",
    expectedDifficulty: "hard",
    expectedDuration: 45,
  },
  {
    companyName: "Stripe",
    jobTitle: "UI Engineer",
    jobDescription:
      "Own design systems, frontend quality, and accessible customer-facing experiences.",
    resume:
      "UI engineer with strong React, testing, design systems, and component architecture experience.",
    companyPackLabel: "Meta (Speed & Impact)",
    focusLabel: "Mixed",
    difficultyLabel: "Medium",
    durationLabel: "30 mins",
    expectedDifficulty: "medium",
    expectedDuration: 30,
  },
  {
    companyName: "Google",
    jobTitle: "Software Engineer",
    jobDescription:
      "Design polished frontend workflows and solve product problems with measurable impact.",
    resume:
      "Software engineer with experience shipping React apps, building charts, and improving performance.",
    companyPackLabel: "Google (GCA & Scale)",
    focusLabel: "Behavioral",
    difficultyLabel: "Easy",
    durationLabel: "15 mins",
    expectedDifficulty: "easy",
    expectedDuration: 15,
  },
];

const mockPlan = {
  sections: ["Warmup", "Technical"],
  questions: [
    {
      id: "q-1",
      section: "Warmup",
      questionText: "Tell me about yourself.",
      intent: "Check communication",
      skillTargeted: ["communication"],
    },
  ],
  skillsRequired: ["React", "Communication"],
  candidateGaps: ["Add more metrics to project examples"],
};

const mockEvaluation = {
  scores: {
    communication: 4,
    role_fit: 4,
    technical_depth: 4,
    problem_solving: 4,
    company_fit: 4,
  },
  feedback_bullets: ["Clear explanation", "Good structure"],
  improvement_suggestions: ["Add a measurable result"],
};

const completedSession = {
  id: "session-completed-001",
  userId: testUser.id,
  jobTitle: "Frontend Engineer",
  jobDescription: "Build accessible and reliable React interfaces.",
  resume: "React, TypeScript, testing, and UI engineering experience.",
  companyName: "Google",
  companyPack: "google",
  type: "technical",
  difficulty: "medium",
  duration: 30,
  status: "completed",
  plan: mockPlan,
  turns: [
    {
      id: "turn-ai-1",
      role: "ai",
      text: "Tell me about a frontend project you improved.",
      timestamp: FIXED_NOW - 2000,
    },
    {
      id: "turn-user-1",
      role: "user",
      text: "I improved load time and accessibility for a dashboard.",
      timestamp: FIXED_NOW - 1000,
    },
  ],
  createdAt: FIXED_NOW - 86400000,
};

const plannedSession = {
  ...completedSession,
  id: "session-planned-001",
  companyName: "Amazon",
  jobTitle: "Full Stack Developer",
  status: "planned",
  turns: [],
  createdAt: FIXED_NOW,
};

const mockReport = {
  sessionId: completedSession.id,
  summary: "Strong frontend fundamentals with clear communication.",
  strengths: ["Explains tradeoffs clearly", "Uses concrete examples"],
  weaknesses: ["Add more metrics", "Clarify edge-case handling"],
  redFlags: [],
  starExamples: [
    {
      question: "Tell me about a frontend project you improved.",
      answer: "Use Situation, Task, Action, and Result with measurable impact.",
    },
  ],
  studyPlan: ["Practice system design tradeoffs", "Review accessibility patterns"],
  overallScores: {
    communication: 4,
    role_fit: 4,
    technical_depth: 4,
    problem_solving: 5,
    company_fit: 4,
  },
};

const buildUpcomingInterview = () => {
  const base = new Date(FIXED_NOW);
  const scheduled = new Date(base);
  scheduled.setDate(Math.min(base.getDate() + 1, 28));
  scheduled.setHours(10, 30, 0, 0);

  return {
    id: "scheduled-001",
    userId: testUser.id,
    companyName: "Meta",
    jobTitle: "Software Engineer Intern",
    jobDescription: "Practice frontend problem solving and product thinking.",
    scheduledAt: scheduled.toISOString(),
    createdAt: base.toISOString(),
  };
};

// -----------------------------------
// Helpers

const getRandomSetupData = () => Cypress._.sample(setupFixtures) || setupFixtures[0];

const visitApp = (hash = "", options: Partial<Cypress.VisitOptions> = {}) => {
  const normalizedHash = hash
    ? hash.startsWith("#")
      ? hash
      : `#${hash}`
    : "";

  cy.visit(`${APP_URL}/${normalizedHash}`, options);
};

const seedLoggedInUser = (hash = "#/dashboard") => {
  visitApp(hash, {
    onBeforeLoad(win) {
      win.localStorage.setItem("ai_interviewer_token", "fake-token");
      win.localStorage.setItem(
        "ai_interviewer_current_user",
        JSON.stringify({
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
        }),
      );
    },
  });
};

const signUp = () => {
  cy.contains("AI Mock Interviewer").should("be.visible");
  cy.contains("Level up your career with AI-driven practice").should("be.visible");
  cy.get("form").should("be.visible");
  cy.get('input[type="text"]').should("have.length", 1);
  cy.get('input[type="email"]').should("have.length", 1);
  cy.get('input[type="password"]').should("have.length", 1);

  cy.get('input[type="text"]').type(testUser.name, { delay: 25 });
  cy.get('input[type="email"]').type(testUser.email, { delay: 25 });
  cy.get('input[type="password"]').type(testUser.password, { delay: 25 });
  cy.contains("button", "Create Account").click();
};

const signIn = (password = testUser.password) => {
  cy.contains("button", "Already have an account? Sign in").click();
  cy.contains("button", "Sign In").should("be.visible");
  cy.contains("Full Name").should("not.exist");
  cy.get('input[type="email"]').type(testUser.email, { delay: 25 });
  cy.get('input[type="password"]').type(password, { delay: 25 });
  cy.contains("button", "Sign In").click();
};

const fillSetupForm = (data = getRandomSetupData()) => {
  cy.contains("Setup Your Session").should("be.visible");
  cy.contains("Company Name").parent().find("input").clear().type(data.companyName, { delay: 25 });
  cy.contains("Target Job Title").parent().find("input").clear().type(data.jobTitle, { delay: 25 });
  cy.contains("Job Description").parent().find("textarea").eq(0).clear().type(data.jobDescription, {
    delay: 10,
  });
  cy.contains("Your Resume Text").parent().find("textarea").eq(0).clear().type(data.resume, {
    delay: 10,
  });
  cy.contains("Company Style Pack").parent().find("select").select(data.companyPackLabel);
  cy.contains("Focus").parent().find("select").select(data.focusLabel);
  cy.contains("Difficulty").parent().find("select").select(data.difficultyLabel);
  cy.contains("Total Time").parent().find("select").select(data.durationLabel);

  return data;
};

const mockAuthRoutes = () => {
  cy.intercept("POST", "**/api/auth/signup", {
    statusCode: 200,
    body: {
      token: "fake-token",
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
      },
    },
  }).as("signupRequest");

  cy.intercept("POST", "**/api/auth/login", {
    statusCode: 200,
    body: {
      token: "fake-token",
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
      },
    },
  }).as("loginRequest");
};

const mockSessionRoutes = (sessions = []) => {
  cy.intercept("GET", "**/api/sessions?userId=*", {
    statusCode: 200,
    body: sessions,
  }).as("getSessions");
};

const mockAiRoutes = () => {
  cy.intercept("POST", "https://openrouter.ai/api/v1/chat/completions", (req) => {
    const body = JSON.stringify(req.body);

    if (body.includes("Analyze transcript")) {
      req.reply({
        statusCode: 200,
        body: {
          choices: [{ message: { content: JSON.stringify(mockReport) } }],
        },
      });
      return;
    }

    if (body.includes("Provide the next interviewer turn")) {
      req.reply({
        statusCode: 200,
        body: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  question: "Tell me about your strongest React project.",
                }),
              },
            },
          ],
        },
      });
      return;
    }

    if (body.includes("Score 1-5")) {
      req.reply({
        statusCode: 200,
        body: {
          choices: [{ message: { content: JSON.stringify(mockEvaluation) } }],
        },
      });
      return;
    }

    if (body.includes("Provide a brief hint")) {
      req.reply({
        statusCode: 200,
        body: {
          choices: [{ message: { content: "Lead with impact, ownership, and measurable results." } }],
        },
      });
      return;
    }

    if (body.includes("Speak clearly:") || body.includes('"modalities"')) {
      req.reply({
        statusCode: 200,
        body: {
          choices: [{ message: { audio: { data: "" } } }],
        },
      });
      return;
    }

    req.reply({
      statusCode: 200,
      body: {
        choices: [{ message: { content: JSON.stringify(mockPlan) } }],
      },
    });
  }).as("aiRequest");
};

const openCalendarEvent = (primaryText: string, fallbackText?: string) => {
  cy.contains(primaryText, { timeout: 10000 })
    .should("exist")
    .scrollIntoView()
    .click({ force: true });

  if (fallbackText) {
    cy.contains(fallbackText, { timeout: 10000 }).should("exist");
  }
};

// -----------------------------------
// Test cases

describe("AI Mock Interviewer frontend flows", () => {
  beforeEach(() => {
    cy.clock(FIXED_NOW, ["Date"]);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearAllSessionStorage();
    mockAuthRoutes();
  });

  // Test case 1: SignUp and SignIn with a test user, plus auth component layout checks.
  it("allows a test user to sign up, log out, and sign back in", () => {
    mockSessionRoutes([]);
    visitApp();

    signUp();

    cy.wait("@signupRequest").its("request.body").should("include", {
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    });
    cy.wait("@getSessions");
    cy.contains("Your Interviews").should("be.visible");
    cy.contains("Test User").should("be.visible");
    cy.contains(testUser.email).should("be.visible");

    cy.contains("button", "Logout").click();
    cy.contains("AI Mock Interviewer").should("be.visible");

    signIn();

    cy.wait("@loginRequest").its("request.body").should("include", {
      email: testUser.email,
      password: testUser.password,
    });
    cy.wait("@getSessions");
    cy.contains("Your Interviews").should("be.visible");
  });

  // Extra test case: Signup validation blocks an empty submit before any signup API call happens.
  it("shows validation when signup fields are missing", () => {
    visitApp();

    cy.contains("button", "Create Account").click();
    cy.contains("Please fill in all fields.").should("be.visible");
    cy.get("@signupRequest.all").should("have.length", 0);
  });

  // Test case 2: Dashboard CTAs stay clickable and route the user to setup.
  it("keeps dashboard CTAs clickable and routes users to setup", () => {
    mockSessionRoutes([]);
    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");

    cy.contains("No sessions yet").should("be.visible");

    cy.contains("a", "Get Started").click();
    cy.location("hash").should("eq", "#/setup");
    cy.contains("Setup Your Session").should("be.visible");

    cy.contains("a", "Dashboard").click();
    cy.contains("a", "New Session").click();
    cy.location("hash").should("eq", "#/setup");

    cy.contains("a", "Dashboard").click();
    cy.contains("a", "New Interview").click();
    cy.location("hash").should("eq", "#/setup");
  });

  // Test case 3: Setup Your Session accepts mock details and Initialize Simulation creates an interview.
  it("fills setup details with random mock data and initializes an interview simulation", () => {
    const setupData = getRandomSetupData();

    mockSessionRoutes([]);
    mockAiRoutes();
    cy.intercept("POST", "**/api/sessions", {
      statusCode: 200,
      body: {
        ...plannedSession,
        id: "session-created-001",
      },
    }).as("createSession");
    cy.intercept("GET", "**/api/sessions/session-created-001", {
      statusCode: 200,
      body: {
        ...plannedSession,
        id: "session-created-001",
      },
    }).as("getCreatedSession");
    cy.intercept("PATCH", "**/api/sessions/session-created-001", {
      statusCode: 200,
      body: {
        ...plannedSession,
        id: "session-created-001",
        status: "active",
      },
    }).as("updateSession");
    cy.intercept("POST", "**/api/sessions/session-created-001/turns", {
      statusCode: 200,
      body: {},
    }).as("createTurn");

    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");
    cy.contains("a", "New Interview").click();

    fillSetupForm(setupData);
    cy.contains("button", "Initialize Simulation").click();

    cy.wait("@createSession").its("request.body").should("include", {
      companyName: setupData.companyName,
      jobTitle: setupData.jobTitle,
      difficulty: setupData.expectedDifficulty,
      duration: setupData.expectedDuration,
    });
    cy.location("hash").should("eq", "#/interview/session-created-001");
  });

  // Test case 5: Calendar page loads, schedule CTA works, and the user can jump into mock setup from an event.
  it("checks calendar UI, schedule form, agenda/grid toggle, and Take Mock CTA", () => {
    const upcomingInterview = buildUpcomingInterview();
    const scheduled = [upcomingInterview];

    cy.intercept("GET", "**/api/scheduled-interviews?userId=*", (req) => {
      req.reply({
        statusCode: 200,
        body: scheduled,
      });
    }).as("getScheduledInterviews");

    cy.intercept("GET", "**/api/scheduled-interviews/*/readiness", {
      statusCode: 200,
      body: { message: "No readiness yet" },
    }).as("getReadiness");

    cy.intercept("GET", "**/api/scheduled-interviews/*/sessions", {
      statusCode: 200,
      body: [],
    }).as("getScheduledSessions");

    cy.intercept("POST", "**/api/scheduled-interviews", (req) => {
      const created = {
        id: "scheduled-new-001",
        createdAt: new Date(FIXED_NOW).toISOString(),
        ...req.body,
      };

      scheduled.push(created);
      req.reply({
        statusCode: 200,
        body: created,
      });
    }).as("createScheduledInterview");

    seedLoggedInUser("#/calendar");
    cy.wait("@getScheduledInterviews");

    cy.contains("Interview Calendar").should("be.visible");
    cy.contains("Agenda").should("be.visible");
    cy.contains("button", "Grid").click();
    cy.contains(upcomingInterview.companyName, { timeout: 10000 }).should("exist");
    cy.contains("button", "Agenda").click();

    cy.contains("button", "Schedule New").click();
    cy.contains(/Schedule Upcoming Interview/i).should("be.visible");
    cy.contains("Company Name").parent().find("input").type("Stripe", { delay: 25 });
    cy.contains(/Job Title/i).parent().find("input").type("UI Engineer", { delay: 25 });
    cy.get('input[type="date"]').clear().type("2026-04-29", { delay: 10 });
    cy.get('input[type="time"]').clear().type("10:30", { delay: 10 });
    cy.contains(/Job Description/i)
      .parent()
      .find("textarea")
      .first()
      .type("Own frontend quality, component testing, and user-facing polish.", { delay: 10 });
    cy.contains("button", "Save Schedule").click();

    cy.wait("@createScheduledInterview").its("request.body").should("include", {
      companyName: "Stripe",
      jobTitle: "UI Engineer",
    });

    cy.wait("@getScheduledInterviews");
    cy.contains("UI Engineer", { timeout: 10000 }).should("exist");
    cy.contains("Stripe", { timeout: 10000 }).should("exist");

    openCalendarEvent(upcomingInterview.jobTitle, upcomingInterview.companyName);
    cy.contains("button", "Take Mock").click();

    cy.location("hash").should("eq", "#/setup");
    cy.contains("Setup Your Session").should("exist");
    cy.contains("Company Name").parent().find("input").should("have.value", upcomingInterview.companyName);
    cy.contains("Target Job Title").parent().find("input").should("have.value", upcomingInterview.jobTitle);
  });

  // Test case 6 and 8: Report UI renders key sections and Export PDF triggers the export CTA.
  it("checks report UI elements and verifies Export PDF CTA", () => {
    mockSessionRoutes([completedSession]);
    cy.intercept("GET", `**/api/sessions/${completedSession.id}`, {
      statusCode: 200,
      body: completedSession,
    }).as("getReportSession");
    cy.intercept("GET", `**/api/reports/${completedSession.id}`, {
      statusCode: 200,
      body: mockReport,
    }).as("getReport");

    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");
    cy.contains("a", "View Report").click();
    cy.wait(["@getReport", "@getReportSession"]);

    cy.contains("Performance Report").should("be.visible");
    cy.contains("Score Breakdown").should("be.visible");
    cy.contains("Key Strengths").should("exist");
    cy.contains("Growth Areas").should("exist");
    cy.contains("Ideal STAR Responses").should("exist");
    cy.contains("Actionable Study Plan").should("exist");

    cy.window().then((win) => {
      cy.stub(win, "print").as("print");
    });

    cy.contains("button", "Export PDF").click();
    cy.get("@print").should("have.been.calledOnce");
  });

  // Test case 7: Missing report state should still keep the user moving with a safe CTA.
  it("shows a useful empty state when a report is missing", () => {
    cy.intercept("GET", "**/api/reports/missing-session", {
      statusCode: 404,
      body: {},
    }).as("missingReport");
    cy.intercept("GET", "**/api/sessions/missing-session", {
      statusCode: 404,
      body: {},
    }).as("missingSession");

    seedLoggedInUser("#/report/missing-session");
    cy.wait(["@missingReport", "@missingSession"]);
    cy.contains("Report Not Found").should("be.visible");
    cy.contains("Return to Dashboard").click();
    cy.location("hash").should("eq", "#/dashboard");
  });

  // Test case 9: Left navigation buttons route correctly and stay usable.
  it("checks all left navigation buttons", () => {
    mockSessionRoutes([completedSession]);
    cy.intercept("GET", "**/api/scheduled-interviews?userId=*", {
      statusCode: 200,
      body: [],
    }).as("getScheduledInterviews");

    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");

    cy.contains("a", "Dashboard").click();
    cy.location("hash").should("eq", "#/dashboard");
    cy.contains("Your Interviews").should("be.visible");

    cy.contains("a", "Calendar").click();
    cy.wait("@getScheduledInterviews");
    cy.location("hash").should("eq", "#/calendar");
    cy.contains("Interview Calendar").should("be.visible");

    cy.contains("a", "New Interview").click();
    cy.location("hash").should("eq", "#/setup");
    cy.contains("Setup Your Session").should("be.visible");

    cy.contains("button", "Logout").click();
    cy.contains("AI Mock Interviewer").should("be.visible");
  });

  // Extra test case: Continue CTA resumes a planned interview session.
  it("opens a planned interview from the Continue CTA", () => {
    mockSessionRoutes([plannedSession]);
    mockAiRoutes();
    cy.intercept("GET", `**/api/sessions/${plannedSession.id}`, {
      statusCode: 200,
      body: plannedSession,
    }).as("getPlannedSession");
    cy.intercept("PATCH", `**/api/sessions/${plannedSession.id}`, {
      statusCode: 200,
      body: {
        ...plannedSession,
        status: "active",
      },
    }).as("activateSession");
    cy.intercept("POST", `**/api/sessions/${plannedSession.id}/turns`, {
      statusCode: 200,
      body: {},
    }).as("addTurn");

    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");

    cy.contains("a", "Continue").click();
    cy.wait("@getPlannedSession");
    cy.location("hash").should("eq", `#/interview/${plannedSession.id}`);
    cy.contains("Interviewer: AI Expert").should("be.visible");
    cy.contains("Tell me about your strongest React project.", {
      timeout: 10000,
    }).should("be.visible");
  });

  // Extra test case: Invalid sign-in should show a helpful auth error.
  it("shows a helpful error when sign in fails", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 401,
      body: { message: "Invalid credentials" },
    }).as("failedLogin");

    visitApp();
    signIn("WrongPassword123!");

    cy.wait("@failedLogin");
    cy.contains("Invalid credentials").should("be.visible");
  });

  // Extra test case: Completed interview cards expose key CTAs on the dashboard.
  it("shows completed interview actions on the dashboard", () => {
    mockSessionRoutes([completedSession]);
    seedLoggedInUser("#/dashboard");
    cy.wait("@getSessions");

    cy.contains(completedSession.companyName).should("be.visible");
    cy.contains(completedSession.jobTitle).should("be.visible");
    cy.contains("a", "View Report").should("be.visible");
  });
});
