import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars if not already loaded
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const connectDB = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('PostgreSQL Connected');

        // Initialize Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Initialize Sessions Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                job_title VARCHAR(255),
                job_description TEXT,
                resume TEXT,
                company_name VARCHAR(255),
                company_pack VARCHAR(50),
                type VARCHAR(50),
                difficulty VARCHAR(50),
                duration INTEGER,
                status VARCHAR(50),
                turns JSONB DEFAULT '[]',
                plan JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Initialize Turns Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interview_turns (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                text TEXT NOT NULL,
                timestamp BIGINT NOT NULL,
                audio_url TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Initialize Reports Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES interview_sessions(id),
                summary TEXT,
                strengths JSONB,
                weaknesses JSONB,
                red_flags JSONB,
                star_examples JSONB,
                study_plan JSONB,
                overall_scores JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tables checked/created');
    } catch (error: any) {
        console.error(`Error connecting to PostgreSQL: ${error.message}`);
        console.log('Make sure DATABASE_URL is set in .env.local');
        process.exit(1);
    }
};

export { pool };
export default connectDB;
