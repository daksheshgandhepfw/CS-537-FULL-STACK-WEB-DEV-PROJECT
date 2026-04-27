import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

jest.mock('../src/models/User', () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mockToken'),
}));

import UserModel from '../src/models/User';
import bcrypt from 'bcrypt';

describe('Auth Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    // Test case: signup should fail when required fields are missing
    it('should return 400 if required signup fields are missing', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'test@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('All fields are required');
    });

    // Test case: signup should fail if user already exists
    it('should return 400 if user already exists', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({ id: 1 });

      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });

    // Test case: signup should create user and return token
    it('should create user and return token', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      });

      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token', 'mockToken');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(UserModel.create).toHaveBeenCalled();
    });

    // Test case: signup should return 500 when model throws unexpected error
    it('should return 500 if signup throws unexpected error', async () => {
      (UserModel.findByEmail as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB error');
    });
  });

  describe('POST /api/auth/login', () => {
    // Test case: login should fail when email is missing
    it('should return 400 if email is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    // Test case: login should fail when password is missing
    it('should return 400 if password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });

    // Test case: login should fail when user does not exist
    it('should return 400 if user does not exist', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });

    // Test case: login should fail when password is incorrect
    it('should return 400 if password is incorrect', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongPassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });

    // Test case: login should succeed with valid credentials and return token
    it('should login successfully with valid credentials', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'mockToken');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    // Test case: login should return 500 when model throws unexpected error
    it('should return 500 if login throws unexpected error', async () => {
      (UserModel.findByEmail as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB error');
    });
  });
});
