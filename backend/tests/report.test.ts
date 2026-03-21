
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
        it('should return a report for a valid session owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue({ id: 1, summary: 'Test Summary' });

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('summary', 'Test Summary');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        it('should return 404 if report not found', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Report not found');
        });
    });

    describe('POST /api/reports', () => {
        const mockReportData = { sessionId: '123', summary: 'New Report' };

        it('should create a new report if none exists', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue(null);
            (ReportModel.create as jest.Mock).mockResolvedValue({ ...mockReportData, id: 1 });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id', 1);
            expect(ReportModel.create).toHaveBeenCalled();
        });

        it('should update an existing report', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.findBySessionId as jest.Mock).mockResolvedValue({ id: 1 });
            (ReportModel.update as jest.Mock).mockResolvedValue({ ...mockReportData, id: 1, updated: true });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(200);
            expect(ReportModel.update).toHaveBeenCalled();
        });

        it('should return 404 if session does not exist', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).post('/api/reports').send(mockReportData);
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/reports/:sessionId', () => {
        it('should delete a report owned by the user', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.delete as jest.Mock).mockResolvedValue(true);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Report deleted successfully');
        });

        it('should return 404 if report not found during deletion', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 1 });
            (ReportModel.delete as jest.Mock).mockResolvedValue(false);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Report not found');
        });

        it('should return 404 if session does not exist', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Session not found');
        });

        it('should return 403 if user does not own session', async () => {
            (InterviewSessionModel.findById as jest.Mock).mockResolvedValue({ userId: 2 });

            const res = await request(app).delete('/api/reports/123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });
    });
});
