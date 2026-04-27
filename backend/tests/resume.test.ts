import request from 'supertest';
import express from 'express';
import resumeRoutes from '../src/routes/resumeRoutes';

jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
app.use('/api/resume', resumeRoutes);

describe('Resume Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/resume/parse', () => {
    // Test case: resume parse should fail when no file is uploaded
    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app).post('/api/resume/parse');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('No file uploaded');
    });

    // Test case: resume parse should reject unsupported file types
    it('should return 400 for unsupported file type', async () => {
      const res = await request(app)
        .post('/api/resume/parse')
        .attach('resume', Buffer.from('hello world'), {
          filename: 'resume.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Unsupported file type. Please upload PDF or DOCX.');
    });

    // Test case: resume parse should parse PDF successfully
    it('should parse PDF successfully', async () => {
      pdf.mockResolvedValue({ text: 'My PDF Resume' });

      const res = await request(app)
        .post('/api/resume/parse')
        .attach('resume', Buffer.from('fake pdf'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe('My PDF Resume');
    });

    // Test case: resume parse should parse DOCX successfully
    it('should parse DOCX successfully', async () => {
      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: 'My DOCX Resume',
      });

      const res = await request(app)
        .post('/api/resume/parse')
        .attach('resume', Buffer.from('fake docx'), {
          filename: 'resume.docx',
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe('My DOCX Resume');
    });

    // Test case: resume parse should trim extracted text
    it('should trim extracted text before returning response', async () => {
      pdf.mockResolvedValue({ text: '   Trim me please   ' });

      const res = await request(app)
        .post('/api/resume/parse')
        .attach('resume', Buffer.from('fake pdf'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.text).toBe('Trim me please');
    });

    // Test case: resume parse should return 500 when parser throws error
    it('should return 500 when parser throws error', async () => {
      pdf.mockRejectedValue(new Error('PDF parse failed'));

      const res = await request(app)
        .post('/api/resume/parse')
        .attach('resume', Buffer.from('fake pdf'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to parse resume');
      expect(res.body.error).toBe('PDF parse failed');
    });
  });
});
