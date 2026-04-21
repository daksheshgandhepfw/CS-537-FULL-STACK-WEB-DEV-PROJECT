import { InterviewType, Difficulty, CompanyPack } from '../enums';

export interface User {
    id: string;      // Used as string on frontend, we'll cast on backend or use union type if necessary. Backend usually has number. Let's use string | number for safety.
    email: string;
    name: string;
    password?: string;
    avatar?: string;
    created_at?: Date;
}

export interface ScheduledInterview {
    id: string;
    userId: string | number;
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    scheduledAt: string | Date;
    createdAt?: Date;
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
    userId: string | number;
    scheduledInterviewId?: string | number;
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
    sessionId: string | number;
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