import dotenv from 'dotenv';
import path from 'path';
// import fetch from 'node-fetch'; // Native fetch in Node 18+

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const API_URL = 'http://localhost:5500/api';

async function verifyInterview() {
    console.log('--- Starting Interview Persistence Verification ---');

    // Unique email
    const email = `interviewer_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Interview Tester';

    try {
        // 1. Signup/Login
        console.log(`1. Authenticating as ${email}...`);
        const signupRes = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });

        let token;
        if (signupRes.ok) {
            const data = await signupRes.json();
            token = data.token;
        } else {
            throw new Error(`Signup failed: ${signupRes.status}`);
        }
        console.log('✅ Authenticated');

        // 2. Create Session
        console.log('\n2. Creating Session...');
        const sessionRes = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobTitle: 'Backend Dev',
                jobDescription: 'Node.js',
                status: 'planned' // Initial status
            })
        });

        if (!sessionRes.ok) throw new Error(`Create Session failed: ${sessionRes.status}`);

        const session = await sessionRes.json();
        console.log(`✅ Session Created: ${session.id}`);

        // 3. Add Turns (Incremental Save)
        console.log('\n3. Adding Turns...');

        // Turn 1: AI Welcome
        const turn1 = {
            role: 'ai',
            text: 'Hello, tell me about yourself.',
            timestamp: Date.now()
        };
        const t1Res = await fetch(`${API_URL}/sessions/${session.id}/turns`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(turn1)
        });
        if (!t1Res.ok) throw new Error(`Failed to add Turn 1: ${t1Res.status}`);
        console.log('  - Added Turn 1 (AI)');

        // Turn 2: User Response
        const turn2 = {
            role: 'user',
            text: 'I am a software engineer.',
            timestamp: Date.now() + 1000
        };
        const t2Res = await fetch(`${API_URL}/sessions/${session.id}/turns`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(turn2)
        });
        if (!t2Res.ok) throw new Error(`Failed to add Turn 2: ${t2Res.status}`);
        console.log('  - Added Turn 2 (User)');

        // 4. Fetch Session & Verify History
        console.log('\n4. Fetching Session to Verify History...');
        const getRes = await fetch(`${API_URL}/sessions/${session.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!getRes.ok) throw new Error(`Get Session failed: ${getRes.status}`);

        const fetchedSession = await getRes.json();
        const turns = fetchedSession.turns;

        console.log(`✅ Session Fetched. Turns count: ${turns.length}`);

        if (turns.length !== 2) throw new Error(`Expected 2 turns, got ${turns.length}`);
        if (turns[0].text !== turn1.text) throw new Error('Turn 1 text mismatch');
        if (turns[1].text !== turn2.text) throw new Error('Turn 2 text mismatch');

        console.log('✅ History Verification Passed: Turns are persisted and retrieved correctly.');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

verifyInterview();
