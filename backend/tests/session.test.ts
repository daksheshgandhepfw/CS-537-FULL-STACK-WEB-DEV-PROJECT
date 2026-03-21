// Mock Auth Middleware Module
jest.mock('../src/middleware/auth', () => {
    return (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    };
});

import request from 'supertest';
import express from 'express';
import sessionRoutes from '../src/routes/sessionRoutes';

// Minimal mock setup
const app = express();
app.use(express.json());
app.use('/api/sessions', sessionRoutes);

// Mock DB
jest.mock('../src/models/InterviewSession', () => ({
    findById: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    addTurn: jest.fn(),
}));

import InterviewSessionModel from '../src/models/InterviewSession';

describe('Session CRUD Operations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/sessions (Create)', () => {
        const mockSessionData = {
            jobTitle: 'Software Engineer',
            jobDescription: 'Develop stuff',
            resume: 'Resume content',
            companyName: 'Tech Co',
            type: 'Technical',
            difficulty: 'Medium',
            duration: 30
        };

        it('should create a new session', async () => {
            (InterviewSessionModel.create as jest.Mock).mockResolvedValue({ id: '123', userId: 1, ...mockSessionData });

            const res = await request(app).post('/api/sessions').send(mockSessionData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id', '123');
            expect(InterviewSessionModel.create).toHaveBeenCalled();
        });

        it('should return 400 on error', async () => {
            (InterviewSessionModel.create as jest.Mock).mockRejectedValue(new Error('Validation failed'));

            const res = await request(app).post('/api/sessions').send(mockSessionData);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Validation failed');
        });
    });

    describe('GET /api/sessions/:id (Read)', () => {
        it('should return session details if owned by user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1, status: 'planned' });

            const res = await request(app).get('/api/sessions/123');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', '123');
        });

        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/api/sessions/999');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).get('/api/sessions/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized access to session');
        });
    });

    describe('PATCH /api/sessions/:id (Update)', () => {
        const updateData = { status: 'completed' };

        it('should update session details', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.update as jest.Mock).mockResolvedValue({ id: '123', userId: 1, status: 'completed' });

            const res = await request(app).patch('/api/sessions/123').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('completed');
        });

        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).patch('/api/sessions/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).patch('/api/sessions/123').send(updateData);
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });
    });

    describe('DELETE /api/sessions/:id (Delete)', () => {
        it('should delete a session owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.delete as jest.Mock).mockResolvedValue(true);

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session deleted successfully');
        });

        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).delete('/api/sessions/999');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });
    });
});
