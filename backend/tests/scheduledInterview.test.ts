jest.mock('../src/middleware/auth', () => {
  return (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  };
});

import request from 'supertest';
import express from 'express';
import scheduledInterviewRoutes from '../src/routes/scheduledInterviewRoutes';

const app = express();
app.use(express.json());
app.use('/api/scheduled-interviews', scheduledInterviewRoutes);

jest.mock('../src/models/ScheduledInterviewModel', () => ({
  findByUserId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getReadinessReport: jest.fn(),
  getSessions: jest.fn(),
}));

import ScheduledInterviewModel from '../src/models/ScheduledInterviewModel';

describe('Scheduled Interview Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/scheduled-interviews', () => {
    // Test case: get all scheduled interviews for logged-in user
    it('should return all scheduled interviews for the user', async () => {
      (ScheduledInterviewModel.findByUserId as jest.Mock).mockResolvedValue([
        { id: '1', companyName: 'Meta', userId: 1 },
      ]);

      const res = await request(app).get('/api/scheduled-interviews');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(ScheduledInterviewModel.findByUserId).toHaveBeenCalledWith(1);
    });

    // Test case: should return 500 when listing scheduled interviews fails
    it('should return 500 when listing scheduled interviews fails', async () => {
      (ScheduledInterviewModel.findByUserId as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/scheduled-interviews');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB error');
    });
  });

  describe('GET /api/scheduled-interviews/:id', () => {
    // Test case: get scheduled interview by id when owned by user
    it('should return scheduled interview when owned by user', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 1,
        companyName: 'Meta',
      });

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('companyName', 'Meta');
    });

    // Test case: get scheduled interview by id returns 404 when missing
    it('should return 404 when scheduled interview is missing', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Interview not found');
    });

    // Test case: get scheduled interview by id returns 403 for wrong owner
    it('should return 403 when user does not own the interview', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 2,
      });

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized access to interview');
    });
  });

  describe('POST /api/scheduled-interviews', () => {
    const payload = {
      companyName: 'Stripe',
      jobTitle: 'UI Engineer',
      jobDescription: 'Frontend role',
      scheduledAt: '2026-04-29T10:30:00.000Z',
    };

    // Test case: create scheduled interview successfully
    it('should create a scheduled interview', async () => {
      (ScheduledInterviewModel.create as jest.Mock).mockResolvedValue({
        id: 'scheduled-new-001',
        userId: 1,
        ...payload,
      });

      const res = await request(app).post('/api/scheduled-interviews').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 'scheduled-new-001');
      expect(ScheduledInterviewModel.create).toHaveBeenCalledWith({
        ...payload,
        userId: 1,
      });
    });

    // Test case: create scheduled interview returns 400 on validation error
    it('should return 400 when create throws validation error', async () => {
      (ScheduledInterviewModel.create as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      const res = await request(app).post('/api/scheduled-interviews').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/scheduled-interviews/:id', () => {
    // Test case: delete scheduled interview successfully
    it('should delete scheduled interview when owned by user', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 1,
      });
      (ScheduledInterviewModel.delete as jest.Mock).mockResolvedValue(true);

      const res = await request(app).delete('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Interview deleted successfully');
    });

    // Test case: delete scheduled interview returns 404 when interview missing
    it('should return 404 when deleting a missing interview', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).delete('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Interview not found');
    });

    // Test case: delete scheduled interview returns 403 for wrong owner
    it('should return 403 when deleting interview owned by someone else', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 2,
      });

      const res = await request(app).delete('/api/scheduled-interviews/scheduled-001');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/scheduled-interviews/:id/readiness', () => {
    // Test case: readiness endpoint returns readiness report
    it('should return readiness report', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 1,
      });
      (ScheduledInterviewModel.getReadinessReport as jest.Mock).mockResolvedValue({
        score: 82,
        message: 'Good progress',
      });

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/readiness');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('score', 82);
    });

    // Test case: readiness endpoint returns fallback message when no report exists
    it('should return fallback message when no readiness report exists', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 1,
      });
      (ScheduledInterviewModel.getReadinessReport as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/readiness');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No mock interviews recorded yet');
    });

    // Test case: readiness endpoint returns 404 when interview is missing
    it('should return 404 when readiness interview is missing', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/readiness');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Interview not found');
    });

    // Test case: readiness endpoint returns 403 for wrong owner
    it('should return 403 for readiness report of another user', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 2,
      });

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/readiness');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized');
    });

    // Test case: should return 500 when readiness lookup fails
    it('should return 500 when readiness lookup fails', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({ id: 'scheduled-001', userId: 1 });
      (ScheduledInterviewModel.getReadinessReport as jest.Mock).mockRejectedValue(new Error('Readiness failed'));

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/readiness');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Readiness failed');
    });
  });

  describe('GET /api/scheduled-interviews/:id/sessions', () => {
    // Test case: sessions endpoint returns linked mock sessions
    it('should return linked sessions for a scheduled interview', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 1,
      });
      (ScheduledInterviewModel.getSessions as jest.Mock).mockResolvedValue([
        { id: 'session-1', status: 'completed' },
      ]);

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('id', 'session-1');
    });

    // Test case: sessions endpoint returns 404 when interview is missing
    it('should return 404 when sessions interview is missing', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/sessions');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Interview not found');
    });

    // Test case: sessions endpoint returns 403 for wrong owner
    it('should return 403 when requesting sessions for another user interview', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({
        id: 'scheduled-001',
        userId: 2,
      });

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/sessions');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Unauthorized');
    });

    // Test case: should return 500 when fetching linked sessions fails
    it('should return 500 when fetching linked sessions fails', async () => {
      (ScheduledInterviewModel.findById as jest.Mock).mockResolvedValue({ id: 'scheduled-001', userId: 1 });
      (ScheduledInterviewModel.getSessions as jest.Mock).mockRejectedValue(new Error('Sessions failed'));

      const res = await request(app).get('/api/scheduled-interviews/scheduled-001/sessions');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Sessions failed');
    });
  });
});
