
export enum InterviewType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  SYSTEM_DESIGN = 'system_design',
  MIXED = 'mixed'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum CompanyPack {
  GENERAL = 'general',
  GOOGLE = 'google',
  AMAZON = 'amazon',
  MICROSOFT = 'microsoft',
  META = 'meta'
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
}

export interface InterviewPlanQuestion {
  id: string;
  section: string;
  questionText: string;
  intent: string;
  skillTargeted: string[];
}

export interface InterviewPlan {
  sections: string[];
  questions: InterviewPlanQuestion[];
  skillsRequired: string[];
  candidateGaps: string[];
}

export interface InterviewTurn {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
  evaluation?: {
    scores: {
      communication: number;
      role_fit: number;
      technical_depth: number;
      problem_solving: number;
      company_fit: number;
    };
    feedback_bullets: string[];
    improvement_suggestions: string[];
  };
}

export interface InterviewSession {
  id: string;
  userId: string;
  jobTitle: string;
  jobDescription: string;
  resume: string;
  companyName: string;
  companyPack: CompanyPack;
  type: InterviewType;
  difficulty: Difficulty;
  duration: number; // Total minutes
  status: 'planned' | 'active' | 'completed';
  plan?: InterviewPlan;
  turns: InterviewTurn[];
  createdAt: number;
}

export interface Report {
  sessionId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  starExamples: { question: string; answer: string }[];
  studyPlan: string[];
  overallScores: {
    communication: number;
    role_fit: number;
    technical_depth: number;
    problem_solving: number;
    company_fit: number;
  };
}
