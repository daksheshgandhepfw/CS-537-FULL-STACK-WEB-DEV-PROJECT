-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Interview Sessions Table
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

-- Create Interview Turns Table (for incremental saving)
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

-- Create Reports Table
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
