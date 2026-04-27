import type { InterviewSession, User, Report } from 'aimock-common';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api';

export const db = {
    // --- AUTH / USER ---

    signup: async (user: Omit<User, 'id'>) => {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user), // { email, password, name }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Signup failed');
        }

        const data = await response.json();
        // data = { token, user }
        if (data.token) {
            localStorage.setItem('ai_interviewer_token', data.token);
            localStorage.setItem('ai_interviewer_current_user', JSON.stringify(data.user));
        }
        return data.user;
    },

    login: async (creds: { email: string; password?: string }) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('ai_interviewer_token', data.token);
            localStorage.setItem('ai_interviewer_current_user', JSON.stringify(data.user));
        }
        return data.user;
    },

    // Deprecated legacy method wrapper
    saveUser: async (user: User) => {
        // Logic: if name is present, assume signup? Or just try login?
        // The original Login.tsx uses saveUser for both. 
        // We will need to update Login.tsx to call login/signup specifically.
        // For backward compatibility until we update Login.tsx:
        if (user.name) {
            return db.signup(user);
        } else {
            return db.login(user);
        }
    },

    logout: () => {
        localStorage.removeItem('ai_interviewer_token');
        localStorage.removeItem('ai_interviewer_current_user');
    },

    getCurrentUser: (): User | null => {
        try {
            const data = localStorage.getItem('ai_interviewer_current_user');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    getToken: (): string | null => {
        return localStorage.getItem('ai_interviewer_token');
    },

    getHeaders: () => {
        const token = localStorage.getItem('ai_interviewer_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    // --- SESSIONS ---
    saveSession: async (session: InterviewSession) => {
        // Decide if create or update based on if it exists? 
        // Usually saveSession is used for updates in the local storage version.
        // We'll check if we have an ID that looks like a MongoDB ID, or try update.
        // Actually, best to split into create/update or use upsert logic.
        // For now, let's assume if it has an ID, we try to update. 
        // NOTE: The frontend generates IDs? Or backend? 
        // If frontend generates UUIDs, we might need to handle that. 
        // Backend assigns _id. 

        // Strategy: If session.id exists and is 24 chars (Mongo) -> PATCH
        // Else POST. But wait, local storage version generated IDs.

        // Simplification: We will strictly use backend APIs. 
        // If the ID is a valid Mongo ID, we update. 

        if (session.id) {
            const response = await fetch(`${API_URL}/sessions/${session.id}`, {
                method: 'PATCH',
                headers: db.getHeaders(),
                body: JSON.stringify(session),
            });
            if (!response.ok) throw new Error('Failed to update session');
            return await response.json(); // returns updated session
        } else {
            // Create new
            const response = await fetch(`${API_URL}/sessions`, {
                method: 'POST',
                headers: db.getHeaders(),
                body: JSON.stringify(session),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create session');
            }
            const newSession = await response.json();
            return newSession;
        }
    },

    // NEW: Specialized method for adding a turn
    addTurn: async (sessionId: string, turn: any) => {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/turns`, {
            method: 'POST',
            headers: db.getHeaders(),
            body: JSON.stringify(turn),
        });
        if (!response.ok) throw new Error('Failed to add turn');
        return await response.json();
    },

    getAllSessions: async (): Promise<InterviewSession[]> => {
        // Admin / Debug mostly
        console.warn('getAllSessions (all users) is not implemented publicly');
        return [];
    },

    deleteSession: async (id: string) => {
        const token = localStorage.getItem('ai_interviewer_token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/sessions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete session');
        }
        return true;
    },

    getSessions: async (): Promise<InterviewSession[]> => {
        const user = db.getCurrentUser();
        if (!user) return [];

        const response = await fetch(`${API_URL}/sessions?userId=${user.id}`, {
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    },

    getSessionById: async (id: string): Promise<InterviewSession | undefined> => {
        const response = await fetch(`${API_URL}/sessions/${id}`, {
            headers: db.getHeaders(),
        });
        if (response.status === 404) return undefined;
        if (!response.ok) throw new Error('Failed to fetch session');
        return await response.json();
    },

    // --- REPORTS ---
    saveReport: async (report: Report) => {
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: db.getHeaders(),
            body: JSON.stringify(report),
        });
        if (!response.ok) throw new Error('Failed to save report');
        return await response.json();
    },

    getReports: async (): Promise<Report[]> => {
        // Not commonly used in this flow, usually by session ID
        return [];
    },

    getReportBySessionId: async (sessionId: string): Promise<Report | undefined> => {
        const response = await fetch(`${API_URL}/reports/${sessionId}`, {
            headers: db.getHeaders(),
        });
        if (response.status === 404) return undefined;
        if (!response.ok) throw new Error('Failed to fetch report');
        return await response.json();
    },

    parseResume: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('resume', file);

        const token = localStorage.getItem('ai_interviewer_token');

        const response = await fetch(`${API_URL}/resume/parse`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to parse resume');
        }
        const data = await response.json();
        return data.text;
    },

    // --- SCHEDULED INTERVIEWS ---
    createScheduledInterview: async (data: Omit<import('aimock-common').ScheduledInterview, 'id' | 'createdAt'>) => {
        const response = await fetch(`${API_URL}/scheduled-interviews`, {
            method: 'POST',
            headers: db.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create scheduled interview');
        return await response.json();
    },

    getScheduledInterviews: async (): Promise<import('aimock-common').ScheduledInterview[]> => {
        const user = db.getCurrentUser();
        if (!user) return [];
        const response = await fetch(`${API_URL}/scheduled-interviews?userId=${user.id}`, {
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch scheduled interviews');
        return await response.json();
    },

    getScheduledInterviewById: async (id: string): Promise<import('aimock-common').ScheduledInterview> => {
        const response = await fetch(`${API_URL}/scheduled-interviews/${id}`, {
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch scheduled interview');
        return await response.json();
    },

    deleteScheduledInterview: async (id: string) => {
        const response = await fetch(`${API_URL}/scheduled-interviews/${id}`, {
            method: 'DELETE',
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete scheduled interview');
        return true;
    },

    getScheduledInterviewReadiness: async (id: string): Promise<any> => {
        const response = await fetch(`${API_URL}/scheduled-interviews/${id}/readiness`, {
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch readiness report');
        return await response.json();
    },

    getScheduledInterviewSessions: async (id: string): Promise<import('aimock-common').InterviewSession[]> => {
        const response = await fetch(`${API_URL}/scheduled-interviews/${id}/sessions`, {
            headers: db.getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch mock sessions');
        return await response.json();
    },

    updateScheduledInterviewFeedback: async (id: string, feedback: any) => {
        const response = await fetch(`${API_URL}/scheduled-interviews/${id}/feedback`, {
            method: 'PATCH',
            headers: db.getHeaders(),
            body: JSON.stringify(feedback),
        });
        if (!response.ok) throw new Error('Failed to update feedback');
        return await response.json();
    }
};
