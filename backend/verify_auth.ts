import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const API_URL = 'http://localhost:5500/api';

async function testAuth() {
    console.log('--- Starting Auth Verification ---');

    // Unique email
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test Verification';

    try {
        // 1. Signup
        console.log(`1. Testing Signup (${email})...`);
        const signupRes = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });

        if (!signupRes.ok) {
            const err = await signupRes.text();
            throw new Error(`Signup failed: ${signupRes.status} ${err}`);
        }

        const signupData = await signupRes.json();
        console.log('✅ Signup successful');
        console.log('Token:', signupData.token ? 'Received' : 'Missing');

        // 2. Login
        console.log('\n2. Testing Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} ${err}`);
        }

        const loginData = await loginRes.json();
        console.log('✅ Login successful');
        const token = loginData.token;

        // 3. Protected Route (Get Sessions)
        console.log('\n3. Testing Protected Route (Get Sessions)...');
        const sessionsRes = await fetch(`${API_URL}/sessions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!sessionsRes.ok) {
            const err = await sessionsRes.text();
            throw new Error(`Get Sessions failed: ${sessionsRes.status} ${err}`);
        }

        const sessions = await sessionsRes.json();
        console.log('✅ Protected Route access successful');
        console.log('Sessions count:', sessions.length);

        // 4. Create Session (Protected)
        console.log('\n4. Testing Create Session...');
        const newSessionRes = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobTitle: 'Software Engineer',
                jobDescription: 'React Node',
                status: 'planned'
            })
        });

        if (!newSessionRes.ok) {
            const err = await newSessionRes.text();
            throw new Error(`Create Session failed: ${newSessionRes.status} ${err}`);
        }

        const newSession = await newSessionRes.json();
        console.log('✅ Create Session successful');
        console.log('New Session ID:', newSession.id);

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

testAuth();
