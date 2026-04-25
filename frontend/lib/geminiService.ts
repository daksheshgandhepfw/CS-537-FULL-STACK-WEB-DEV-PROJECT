import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { InterviewPlan, InterviewSession, InterviewType } from "aimock-common";
import { CompanyPack } from "aimock-common";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

const getApiKey = () => {
  try {
    return import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_API_KEY || '';
  } catch (e) {
    return '';
  }
};

const getGoogleApiKey = () => {
  try {
    return import.meta.env.VITE_API_KEY || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });

interface OpenRouterRequest {
  model?: string;
  messages: any[];
  response_format?: { type: string };
  modalities?: string[];
  audio?: { voice: string; format: string };
}

const callOpenRouter = async (payload: OpenRouterRequest) => {
  const apiKey = getApiKey();
  const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "AI Mock Interviewer"
    },
    body: JSON.stringify({
      model: payload.model || DEFAULT_MODEL,
      ...payload
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "OpenRouter Request Failed");
  }

  return response.json();
};

const COMPANY_STRATEGIES = {
  [CompanyPack.AMAZON]: "Prioritize the 16 Leadership Principles (Ownership, Bias for Action, etc.). Focus on the 'BAR' - Behavioral questions that require deep digging using the STAR method.",
  [CompanyPack.GOOGLE]: "Focus on General Cognitive Ability (GCA), Googliness, and technical scale. Ask questions that test open-ended problem solving, logic, and architectural trade-offs at scale.",
  [CompanyPack.MICROSOFT]: "Emphasize Growth Mindset, collaboration, and Technical Excellence. Focus on how the candidate learns from failure and adapts to new technologies.",
  [CompanyPack.META]: "Focus on speed, impact, and 'shipping' value. High emphasis on system design and navigating through ambiguity to deliver products.",
  [CompanyPack.GENERAL]: "Use industry standard best practices for hiring top-tier talent, focusing on clear communication and core technical competencies."
};

export const geminiService = {
  async createInterviewPlan(
    jobTitle: string,
    jd: string,
    resume: string,
    company: string,
    pack: CompanyPack,
    type: InterviewType,
    previousExperience?: string
  ): Promise<InterviewPlan> {
    const strategy = COMPANY_STRATEGIES[pack] || COMPANY_STRATEGIES[CompanyPack.GENERAL];
    const prompt = `
      As an expert Interview Architect at ${company}, create a structured interview plan for:
      Role: ${jobTitle}
      Interview Type: ${type}
      Job Description: ${jd}
      Candidate Resume: ${resume}

      ${previousExperience ? `IMPORTANT CONTEXT: The candidate has already completed a previous round of interviews for this role/company. 
      Their previous experience/feedback: "${previousExperience}". 
      Please ensure this new interview plan is a progressive follow-up that avoids repeating basic questions and instead probes deeper based on this context.` : ''}

      Company Specific Strategy: ${strategy}

      Return JSON only with this structure:
      {
        "sections": ["string"],
        "questions": [{ "id": "uuid", "section": "string", "questionText": "string", "intent": "string", "skillTargeted": ["string"] }],
        "skillsRequired": ["string"],
        "candidateGaps": ["string"]
      }
    `;

    try {
      const result = await callOpenRouter({
        messages: [{ role: "system", content: prompt + "\nReturn JSON only." }],
        response_format: { type: "json_object" }
      });
      return JSON.parse(result.choices[0].message.content || '{}');
    } catch (e) {
      console.error("Plan Generation Failed", e);
      throw e;
    }
  },

  async getNextQuestion(session: InterviewSession): Promise<any> {
    const pastTurns = session.turns.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
    const strategy = COMPANY_STRATEGIES[session.companyPack] || COMPANY_STRATEGIES[CompanyPack.GENERAL];

    const systemPrompt = `
      You are a senior interviewer at ${session.companyName}. Strategy: ${strategy}
      Difficulty: ${session.difficulty}. Plan: ${JSON.stringify(session.plan)}
      Guidelines: Ask ONE question. Use follow-ups if vague. Don't reveal rubric.
      Return JSON only: { "question": "string" }
    `;

    try {
      const result = await callOpenRouter({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversation:\n${pastTurns}\n\nProvide the next interviewer turn in JSON.` }
        ],
        response_format: { type: "json_object" }
      });
      return JSON.parse(result.choices[0].message.content || '{}');
    } catch (e) {
      console.error("Next Question Generation Failed", e);
      throw e;
    }
  },

  async evaluateTurn(question: string, answer: string): Promise<any> {
    try {
      const result = await callOpenRouter({
        messages: [{ role: "user", content: `Q: ${question}\nA: ${answer}\nScore 1-5. Return JSON: { "scores": { "communication": 0, "role_fit": 0, "technical_depth": 0, "problem_solving": 0, "company_fit": 0 }, "feedback_bullets": [], "improvement_suggestions": [] }` }],
        response_format: { type: "json_object" }
      });
      return JSON.parse(result.choices[0].message.content || '{}');
    } catch (e) {
      console.warn("Evaluation failed", e);
      return null;
    }
  },

  async getHint(question: string, transcript: string): Promise<string> {
    try {
      const result = await callOpenRouter({
        messages: [{ role: "user", content: `Question: ${question}\nTranscript: ${transcript}\nProvide a brief hint (<30 words).` }]
      });
      return result.choices[0].message.content || "Focus on specifics.";
    } catch (e) {
      return "Try focusing on a real-world example from your past.";
    }
  },

  async generateSpeech(text: string): Promise<string> {
    try {
      const result = await callOpenRouter({
        messages: [{ role: "user", content: `Speak clearly: ${text}` }],
        modalities: ["text", "audio"],
        audio: { voice: "alloy", format: "wav" }
      });
      return result.choices[0].message.audio?.data || '';
    } catch (e) {
      console.error("TTS failed", e);
      return '';
    }
  },

  async generateFinalReport(session: InterviewSession): Promise<any> {
    const transcript = session.turns.map(t => `${t.role}: ${t.text}`).join('\n');
    try {
      const result = await callOpenRouter({
        messages: [{ role: "user", content: `Analyze transcript:\n${transcript}\nReturn JSON with EXACT keys: { "summary": "string", "strengths": [], "weaknesses": [], "redFlags": [], "starExamples": [{ "question": "string", "answer": "string" }], "studyPlan": [], "overallScores": { "communication": 0, "role_fit": 0, "technical_depth": 0, "problem_solving": 0, "company_fit": 0 } }` }],
        response_format: { type: "json_object" }
      });
      return JSON.parse(result.choices[0].message.content || '{}');
    } catch (e) {
      console.error("Report Synthesis Failed", e);
      throw e;
    }
  }
};
