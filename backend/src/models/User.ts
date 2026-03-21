import { pool } from '../db';

import { User } from '@aimock/common';

export class UserModel {
    static async create(user: Omit<User, 'id'>): Promise<User> {
        const result = await pool.query(
            'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
            [user.email, user.password, user.name]
        );
        return result.rows[0];
    }

    static async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async findById(id: number): Promise<User | null> {
        const result = await pool.query(
            'SELECT id, email, name, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    static async update(id: number, updates: Partial<User>): Promise<User | null> {
        const { email, name, password } = updates;
        const fields: string[] = [];
        const values: any[] = [];
        let query = 'UPDATE users SET ';

        if (email) {
            fields.push(`email = $${values.length + 1}`);
            values.push(email);
        }
        if (name) {
            fields.push(`name = $${values.length + 1}`);
            values.push(name);
        }
        if (password) {
            fields.push(`password = $${values.length + 1}`);
            values.push(password);
        }

        if (fields.length === 0) return null;

        query += fields.join(', ') + ` WHERE id = $${values.length + 1} RETURNING id, email, name, created_at`;
        values.push(id);

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1',
            [id]
        );
        return (result.rowCount ?? 0) > 0;
    }
}

export default UserModel;
