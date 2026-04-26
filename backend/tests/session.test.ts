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

    describe('GET /api/sessions (List)', () => {
        // Test case: should return all sessions for logged-in user
        it('should return all sessions for logged-in user', async () => {
            (InterviewSessionModel.findByUserId as jest.Mock).mockResolvedValue([
                { id: '123', userId: 1, status: 'planned' },
            ]);

            const res = await request(app).get('/api/sessions');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(InterviewSessionModel.findByUserId).toHaveBeenCalledWith(1);
        });

        // Test case: should use query userId when provided
        it('should return sessions using query userId', async () => {
            (InterviewSessionModel.findByUserId as jest.Mock).mockResolvedValue([
                { id: '456', userId: 99, status: 'completed' },
            ]);

            const res = await request(app).get('/api/sessions?userId=99');
            expect(res.status).toBe(200);
            expect(InterviewSessionModel.findByUserId).toHaveBeenCalledWith('99');
        });

        // Test case: should return 500 when listing sessions fails
        it('should return 500 when listing sessions fails', async () => {
            (InterviewSessionModel.findByUserId as jest.Mock).mockRejectedValue(new Error('DB error'));

            const res = await request(app).get('/api/sessions');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('DB error');
        });
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

        // Test case: should create a new session
        it('should create a new session', async () => {
            (InterviewSessionModel.create as jest.Mock).mockResolvedValue({ id: '123', userId: 1, ...mockSessionData });

            const res = await request(app).post('/api/sessions').send(mockSessionData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id', '123');
            expect(InterviewSessionModel.create).toHaveBeenCalled();
        });

        // Test case: should return 400 on error
        it('should return 400 on error', async () => {
            (InterviewSessionModel.create as jest.Mock).mockRejectedValue(new Error('Validation failed'));

            const res = await request(app).post('/api/sessions').send(mockSessionData);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Validation failed');
        });
    });

    describe('GET /api/sessions/:id (Read)', () => {
        // Test case: should return session details if owned by user
        it('should return session details if owned by user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1, status: 'planned' });

            const res = await request(app).get('/api/sessions/123');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id', '123');
        });

        // Test case: should return 404 if session not found
        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/api/sessions/999');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).get('/api/sessions/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized access to session');
        });
    });

    describe('PATCH /api/sessions/:id (Update)', () => {
        const updateData = { status: 'completed' };

        // Test case: should update session details
        it('should update session details', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.update as jest.Mock).mockResolvedValue({ id: '123', userId: 1, status: 'completed' });

            const res = await request(app).patch('/api/sessions/123').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('completed');
        });

        // Test case: should return 404 if session not found
        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).patch('/api/sessions/999').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).patch('/api/sessions/123').send(updateData);
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 400 when patch update fails
        it('should return 400 when patch update fails', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const res = await request(app).patch('/api/sessions/123').send({ status: 'active' });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Update failed');
        });
    });

    describe('DELETE /api/sessions/:id', () => {
        // Test case: should delete a session owned by the user
        it('should delete a session owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.delete as jest.Mock).mockResolvedValue(true);

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session deleted successfully');
        });

        // Test case: should return 404 if session not found
        it('should return 404 if session not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).delete('/api/sessions/999');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 501 when delete is not implemented
        it('should return 501 when delete is not implemented', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.delete as jest.Mock).mockRejectedValue(new Error('Not implemented'));

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(501);
            expect(res.body.message).toBe('Not implemented');
        });

        // Test case: should return 500 for unexpected delete error
        it('should return 500 for unexpected delete error', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            const res = await request(app).delete('/api/sessions/123');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Delete failed');
        });
    });

    describe('POST /api/sessions/:id/turns', () => {
        const turnData = { role: 'user', text: 'My answer' };

        // Test case: should add turn successfully
        it('should add a turn to a session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.addTurn as jest.Mock).mockResolvedValue({
                id: '123',
                turns: [turnData],
            });

            const res = await request(app).post('/api/sessions/123/turns').send(turnData);
            expect(res.status).toBe(201);
            expect(InterviewSessionModel.addTurn).toHaveBeenCalledWith('123', turnData);
        });

        // Test case: should return 404 if session missing
        it('should return 404 when adding turn to missing session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).post('/api/sessions/123/turns').send(turnData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 for unauthorized turn add
        it('should return 403 when adding turn to another user session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 2 });

            const res = await request(app).post('/api/sessions/123/turns').send(turnData);
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 400 when add turn fails
        it('should return 400 when add turn fails', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ id: '123', userId: 1 });
            (InterviewSessionModel.addTurn as jest.Mock).mockRejectedValue(new Error('Turn failed'));

            const res = await request(app).post('/api/sessions/123/turns').send(turnData);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Turn failed');
        });
    });

    describe('PUT /api/sessions/:id/plan', () => {
        const planData = { sections: ['Warmup'] };

        // Test case: should update plan and activate planned session
        it('should update plan and activate planned session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 1,
                status: 'planned',
            });
            (InterviewSessionModel.update as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 1,
                status: 'active',
                plan: planData,
            });

            const res = await request(app).put('/api/sessions/123/plan').send(planData);
            expect(res.status).toBe(200);
            expect(InterviewSessionModel.update).toHaveBeenCalledWith('123', {
                plan: planData,
                status: 'active',
            });
        });

        // Test case: should update plan without changing status when session is not planned
        it('should update plan without changing status when session is not planned', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 1,
                status: 'active',
            });
            (InterviewSessionModel.update as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 1,
                status: 'active',
                plan: planData,
            });

            const res = await request(app).put('/api/sessions/123/plan').send(planData);
            expect(res.status).toBe(200);
            expect(InterviewSessionModel.update).toHaveBeenCalledWith('123', {
                plan: planData,
            });
        });

        // Test case: should return 404 if plan update session missing
        it('should return 404 when updating plan for missing session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).put('/api/sessions/123/plan').send(planData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 when updating another user plan
        it('should return 403 when updating another user plan', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 2,
            });

            const res = await request(app).put('/api/sessions/123/plan').send(planData);
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 400 when plan update fails
        it('should return 400 when plan update fails', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({
                id: '123',
                userId: 1,
                status: 'planned',
            });
            (InterviewSessionModel.update as jest.Mock).mockRejectedValue(new Error('Plan update failed'));

            const res = await request(app).put('/api/sessions/123/plan').send(planData);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Plan update failed');
        });
    });
});
