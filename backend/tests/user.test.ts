
// Mock Auth Middleware
jest.mock('../src/middleware/auth', () => {
    return (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    };
});

import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';
import authRoutes from '../src/routes/auth';

// Minimal mock setup
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Mock DB Models and Libraries
jest.mock('../src/models/User', () => ({
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
}));

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashedPassword'),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mockToken'),
}));

import UserModel from '../src/models/User';

describe('User CRUD Operations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/signup (Create)', () => {
        const mockUserData = { email: 'new@example.com', password: 'password', name: 'New User' };

        it('should create a new user', async () => {
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
            (UserModel.create as jest.Mock).mockResolvedValue({ id: 1, ...mockUserData });

            const res = await request(app).post('/api/auth/signup').send(mockUserData);
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(UserModel.create).toHaveBeenCalled();
        });

        it('should return 400 if user already exists', async () => {
            (UserModel.findByEmail as jest.Mock).mockResolvedValue({ id: 1 });

            const res = await request(app).post('/api/auth/signup').send(mockUserData);
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('User already exists');
        });
    });

    describe('GET /api/users/:id (Read)', () => {
        it('should return user details', async () => {
            (UserModel.findById as jest.Mock).mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test User' });

            const res = await request(app).get('/api/users/1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'test@example.com');
        });

        it('should return 404 if user not found', async () => {
            (UserModel.findById as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get('/api/users/1');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });
    });

    describe('PUT /api/users/:id (Update)', () => {
        const updateData = { name: 'Updated Name' };

        it('should update user details', async () => {
            (UserModel.update as jest.Mock).mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Updated Name' });

            const res = await request(app).put('/api/users/1').send(updateData);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('name', 'Updated Name');
        });

        it('should return 403 if trying to update another user', async () => {
            const res = await request(app).put('/api/users/2').send(updateData);
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        it('should return 404 if user not found during update', async () => {
            (UserModel.update as jest.Mock).mockResolvedValue(null);

            const res = await request(app).put('/api/users/1').send(updateData);
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });
    });

    describe('DELETE /api/users/:id (Delete)', () => {
        it('should delete user account', async () => {
            (UserModel.delete as jest.Mock).mockResolvedValue(true);

            const res = await request(app).delete('/api/users/1');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('User deleted successfully');
        });

        it('should return 403 if trying to delete another user', async () => {
            const res = await request(app).delete('/api/users/2');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized');
        });

        it('should return 404 if user not found during deletion', async () => {
            (UserModel.delete as jest.Mock).mockResolvedValue(false);

            const res = await request(app).delete('/api/users/1');
            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });
    });
});
