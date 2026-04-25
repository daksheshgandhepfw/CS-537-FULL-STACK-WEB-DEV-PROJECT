import { GoogleGenAI, Type, Modality } from "@google/genai";
import { OpenRouter } from '@openrouter/sdk';
import type { InterviewPlan, InterviewSession, InterviewType } from "aimock-common";
import { CompanyPack } from "aimock-common";

// Switch flag
const USE_OPENROUTER = import.meta.env.VITE_USEOPENROUTER;
const OR_MODEL = 'google/gemma-4-26b-a4b-it';

const getOpenRouterKey = () => {
  try {
    return import.meta.env.VITE_OPENROUTER_API_KEY || '';
  } catch (e) {
    return '';
  }
};

const openRouter = new OpenRouter({
  apiKey: getOpenRouterKey(),
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Optional. Site URL for rankings on openrouter.ai.
    'X-OpenRouter-Title': 'AIMock', // Optional. Site title for rankings on openrouter.ai.
  },
});

// Safety check for process.env in various environments
const getApiKey = () => {
  try {
    return import.meta.env.VITE_API_KEY || '';
  } catch (e) {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const COMPANY_STRATEGIES = {
  [CompanyPack.AMAZON]: "Prioritize the 16 Leadership Principles (Ownership, Bias for Action, etc.). Focus on the 'BAR' - Behavioral questions that require deep digging using the STAR method.",
  [CompanyPack.GOOGLE]: "Focus on General Cognitive Ability (GCA), Googliness, and technical scale. Ask questions that test open-ended problem solving, logic, and architectural trade-offs at scale.",
  [CompanyPack.MICROSOFT]: "Emphasize Growth Mindset, collaboration, and Technical Excellence. Focus on how the candidate learns from failure and adapts to new technologies.",
  [CompanyPack.META]: "Focus on speed, impact, and 'shipping' value. High emphasis on system design and navigating through ambiguity to deliver products.",
  [CompanyPack.GENERAL]: "Use industry standard best practices for hiring top-tier talent, focusing on clear communication and core technical competencies."
};

/**
 * Helper to get clean JSON from OpenRouter
 */
async function callOpenRouterJSON(systemPrompt: string, userPrompt: string, schemaString: string) {
  const promptWithSchema = `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON matching this exact structure. No markdown blocks like \`\`\`json, no introductory conversational text. Just the raw JSON object:\n${schemaString}`;

  const completion = await openRouter.chat.send({
    chatRequest: {
      model: OR_MODEL,
      messages: [
        { role: 'user', content: promptWithSchema }
      ],
      stream: false,
    }
  });

  let text = completion.choices[0]?.message?.content || '{}';
  // Strip markdown code fences if added
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

/**
 * Helper to convert a readable stream to base64 string
 */
async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

export const geminiService = {
  async createInterviewPlan(
    jobTitle: string,
    jd: string,
    resume: string,
    company: string,
    pack: CompanyPack,
    type: InterviewType
  ): Promise<InterviewPlan> {
    const strategy = COMPANY_STRATEGIES[pack] || COMPANY_STRATEGIES[CompanyPack.GENERAL];
    const prompt = `
      As an expert Interview Architect at ${company}, create a structured interview plan for:
      Role: ${jobTitle}
      Interview Type: ${type}
      Job Description: ${jd}
      Candidate Resume: ${resume}

      Company Specific Strategy: ${strategy}

      Task:
      1. Extract 5-7 key skills required.
      2. Identify 2-3 candidate gaps based on resume vs JD.
      3. Create 5-8 structured questions.
    `;

    if (USE_OPENROUTER) {
      try {
        const schema = `{
          "sections": ["string"],
          "questions": [
            {
              "id": "string",
              "section": "string",
              "questionText": "string",
              "intent": "string",
              "skillTargeted": ["string"]
            }
          ],
          "skillsRequired": ["string"],
          "candidateGaps": ["string"]
        }`;
        return await callOpenRouterJSON("", prompt, schema);
      } catch (e) {
        console.error("OpenRouter Plan Generation Failed", e);
        throw e;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt + "\nReturn JSON only.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sections: { type: Type.ARRAY, items: { type: Type.STRING } },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    section: { type: Type.STRING },
                    questionText: { type: Type.STRING },
                    intent: { type: Type.STRING },
                    skillTargeted: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "section", "questionText", "intent", "skillTargeted"]
                }
              },
              skillsRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
              candidateGaps: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["sections", "questions", "skillsRequired", "candidateGaps"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
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
    `;

    if (USE_OPENROUTER) {
      const schema = `{
        "question": "string",
        "question_type": "string",
        "skill_targeted": ["string"],
        "expected_signal": ["string"],
        "followup_if_needed": ["string"],
        "stop_condition": "string",
        "ui_tone": "string"
      }`;
      try {
        return await callOpenRouterJSON(systemPrompt, `Conversation:\n${pastTurns}\n\nProvide the next interviewer turn.`, schema);
      } catch (e) {
        console.error("OpenRouter Next Question Generation Failed", e);
        throw e;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Conversation:\n${pastTurns}\n\nProvide the next interviewer turn in JSON.`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              question_type: { type: Type.STRING },
              skill_targeted: { type: Type.ARRAY, items: { type: Type.STRING } },
              expected_signal: { type: Type.ARRAY, items: { type: Type.STRING } },
              followup_if_needed: { type: Type.ARRAY, items: { type: Type.STRING } },
              stop_condition: { type: Type.STRING },
              ui_tone: { type: Type.STRING }
            },
            required: ["question"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Next Question Generation Failed", e);
      throw e;
    }
  },

  async evaluateTurn(question: string, answer: string): Promise<any> {
    if (USE_OPENROUTER) {
      const schema = `{
        "scores": {
          "communication": 0,
          "role_fit": 0,
          "technical_depth": 0,
          "problem_solving": 0,
          "company_fit": 0
        },
        "overall_score": 0,
        "feedback_bullets": ["string"],
        "improvement_suggestions": ["string"]
      }`;
      try {
        return await callOpenRouterJSON("", `Q: ${question}\nA: ${answer}\nScore 1-5 across categories.`, schema);
      } catch (e) {
        console.warn("OpenRouter Evaluation failed", e);
        return null;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Q: ${question}\nA: ${answer}\nScore 1-5 across categories.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  communication: { type: Type.NUMBER },
                  role_fit: { type: Type.NUMBER },
                  technical_depth: { type: Type.NUMBER },
                  problem_solving: { type: Type.NUMBER },
                  company_fit: { type: Type.NUMBER }
                }
              },
              overall_score: { type: Type.NUMBER },
              feedback_bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvement_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.warn("Evaluation failed", e);
      return null;
    }
  },

  async getHint(question: string, transcript: string): Promise<string> {
    const prompt = `Question: ${question}\nTranscript: ${transcript}\nProvide a brief hint (<30 words).`;

    if (USE_OPENROUTER) {
      try {
        const completion = await openRouter.chat.send({
          chatRequest: {
            model: OR_MODEL,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
          }
        });
        return completion.choices[0]?.message?.content || "Focus on specifics.";
      } catch (e) {
        return "Try focusing on a real-world example from your past.";
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      return response.text || "Focus on specifics.";
    } catch (e) {
      return "Try focusing on a real-world example from your past.";
    }
  },

  async generateSpeech(text: string): Promise<string> {
    if (USE_OPENROUTER) {
      try {
        const stream = await openRouter.tts.createSpeech({
          speechRequest: {
            model: 'openai/gpt-4o-mini-tts-2025-12-15',
            input: text,
            voice: 'alloy',
            responseFormat: 'pcm'
          }
        });
        return await streamToBase64(stream);
      } catch (e) {
        console.error("OpenRouter TTS failed", e);
        // Fallback to Gemini if OpenRouter fails
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Speak clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (e) {
      console.error("TTS failed", e);
      return '';
    }
  },

  async generateFinalReport(session: InterviewSession): Promise<any> {
    const transcript = session.turns.map(t => `${t.role}: ${t.text}`).join('\n');
    const prompt = `Analyze transcript:\n${transcript}\n\nIMPORTANT: For overallScores, rate the candidate from 1 to 5 for each category.`;

    if (USE_OPENROUTER) {
      const schema = `{
        "summary": "string",
        "strengths": ["string"],
        "weaknesses": ["string"],
        "redFlags": ["string"],
        "starExamples": [
          { "question": "string", "answer": "string" }
        ],
        "studyPlan": ["string"],
        "overallScores": {
          "communication": 0,
          "role_fit": 0,
          "technical_depth": 0,
          "problem_solving": 0,
          "company_fit": 0
        }
      }`;
      try {
        return await callOpenRouterJSON("", prompt, schema);
      } catch (e) {
        console.error("OpenRouter Report Synthesis Failed", e);
        throw e;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              starExamples: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } } } },
              studyPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
              overallScores: { type: Type.OBJECT, properties: { communication: { type: Type.NUMBER }, role_fit: { type: Type.NUMBER }, technical_depth: { type: Type.NUMBER }, problem_solving: { type: Type.NUMBER }, company_fit: { type: Type.NUMBER } } }
            }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Report Synthesis Failed", e);
      throw e;
    }
  }
};
