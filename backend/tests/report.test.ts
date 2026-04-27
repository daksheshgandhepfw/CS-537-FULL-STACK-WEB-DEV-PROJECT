// Mock Auth Middleware
jest.mock('../src/middleware/auth', () => {
    return (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    };
});

import request from 'supertest';
import express from 'express';
import reportRoutes from '../src/routes/reportRoutes';

// Minimal mock setup
const app = express();
app.use(express.json());
app.use('/api/reports', reportRoutes);

// Mock DB Models
jest.mock('../src/models/Report', () => ({
    findBySessionId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}));

jest.mock('../src/models/InterviewSession', () => ({
    findById: jest.fn(),
}));

import ReportModel from '../src/models/Report';
import InterviewSessionModel from '../src/models/InterviewSession';

describe('Report CRUD Operations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/reports/:sessionId', () => {
        // Test case: should return a report for a valid session owned by the user
        it('should return a report for a valid session owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue({ id: 1, summary: 'Test Summary' });

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('summary', 'Test Summary');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 404 if report not found
        it('should return 404 if report not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Report not found');
        });

        // Test case: should return 500 when fetching report fails
        it('should return 500 when fetching report fails', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockRejectedValue(new Error('DB error'));

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('DB error');
        });
    });

    describe('POST /api/reports', () => {
        const mockReportData = { sessionId: '123', summary: 'New Report' };

        // Test case: should create a new report if none exists
        it('should create a new report if none exists', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue(null);
            (ReportModel.create as jest.Mock).mockResolvedValue({ ...mockReportData, id: 1 });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id', 1);
            expect(ReportModel.create).toHaveBeenCalled();
        });

        // Test case: should update an existing report
        it('should update an existing report', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue({ id: 1 });
            (ReportModel.update as jest.Mock).mockResolvedValue({ ...mockReportData, id: 1, updated: true });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(200);
            expect(ReportModel.update).toHaveBeenCalled();
        });

        // Test case: should return 404 if session does not exist
        it('should return 404 if session does not exist', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(403);
        });

        // Test case: should return 400 when report save fails
        it('should return 400 when report save fails', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue(null);
            (ReportModel.create as jest.Mock).mockRejectedValue(new Error('Save failed'));

            const res = await request(app).post('/api/reports').send({
                sessionId: '123',
                summary: 'Test',
            });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Save failed');
        });
    });

    describe('DELETE /api/reports/:sessionId', () => {
        // Test case: should delete a report owned by the user
        it('should delete a report owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.delete as jest.Mock).mockResolvedValue(true);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Report deleted successfully');
        });

        // Test case: should return 404 if report not found during deletion
        it('should return 404 if report not found during deletion', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.delete as jest.Mock).mockResolvedValue(false);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Report not found');
        });

        // Test case: should return 404 if session does not exist
        it('should return 404 if session does not exist', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        // Test case: should return 403 if user does not own session
        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        // Test case: should return 500 when report delete fails unexpectedly
        it('should return 500 when report delete fails unexpectedly', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Delete failed');
        });
    });
});
