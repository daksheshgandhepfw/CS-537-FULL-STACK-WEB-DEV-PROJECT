import { pool } from '../db';

import { InterviewSession, InterviewType, Difficulty, CompanyPack } from 'aimock-common';

export class InterviewSessionModel {
    static async create(session: Omit<InterviewSession, 'id' | 'createdAt'>): Promise<any> {
        const {
            userId, jobTitle, jobDescription, resume, companyName,
            companyPack, type, difficulty, duration, status, turns, plan
        } = session;

      
        const result = await pool.query(
            `INSERT INTO interview_sessions 
            (user_id, job_title, job_description, resume, company_name, company_pack, 
             type, difficulty, duration, status, plan, scheduled_interview_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            RETURNING *`,
            [
                userId, jobTitle, jobDescription, resume, companyName,
                companyPack, type, difficulty, duration, status,
                JSON.stringify(plan || {}),
                session.scheduledInterviewId || null
            ]
        );
        const newSession = result.rows[0];

       
        if (turns && turns.length > 0) {
            for (const turn of turns) {
                await InterviewSessionModel.addTurn(newSession.id, turn);
            }
        }

        return await InterviewSessionModel.findById(newSession.id);
    }

    static async findByUserId(userId: string | number): Promise<any[]> {
        const result = await pool.query(
            'SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        const sessions = [];
        for (const row of result.rows) {
            
            const turnsRes = await pool.query(
                'SELECT * FROM interview_turns WHERE session_id = $1 ORDER BY timestamp ASC',
                [row.id]
            );
            sessions.push({
                ...row,
                userId: row.user_id,
                jobTitle: row.job_title,
                jobDescription: row.job_description,
                companyName: row.company_name,
                companyPack: row.company_pack,
                turns: turnsRes.rows.map(t => ({ ...t, id: t.id.toString() })),
                plan: row.plan
            });
        }
        return sessions;
    }

    static async findById(id: string | number): Promise<any | null> {
        const result = await pool.query(
            'SELECT * FROM interview_sessions WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) return null;

        const row = result.rows[0];

       
        const turnsRes = await pool.query(
            'SELECT * FROM interview_turns WHERE session_id = $1 ORDER BY timestamp ASC',
            [id]
        );

        return {
            ...row,
            userId: row.user_id,
            jobTitle: row.job_title,
            jobDescription: row.job_description,
            companyName: row.company_name,
            companyPack: row.company_pack,
            turns: turnsRes.rows.map(t => ({ ...t, id: t.id.toString() })),
            plan: row.plan
        };
    }

    static async update(id: string | number, updates: any): Promise<any> {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.status) {
            fields.push(`status = $${idx++}`);
            values.push(updates.status);
        }
        if (updates.plan) {
            fields.push(`plan = $${idx++}`);
            values.push(JSON.stringify(updates.plan));
        }


        if (fields.length === 0) return await InterviewSessionModel.findById(id);

        values.push(id);
        const result = await pool.query(
            `UPDATE interview_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        return await InterviewSessionModel.findById(id);
    }

    static async addTurn(sessionId: string | number, turn: any): Promise<any> {
        await pool.query(
            `INSERT INTO interview_turns (session_id, role, text, timestamp, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [sessionId, turn.role, turn.text, turn.timestamp || Date.now(), JSON.stringify(turn.evaluation || {})]
        );

     
        return await InterviewSessionModel.findById(sessionId);
    }

    static async delete(id: string | number): Promise<boolean> {
      

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

           
            await client.query('DELETE FROM reports WHERE session_id = $1', [id]);

            
            const result = await client.query('DELETE FROM interview_sessions WHERE id = $1', [id]);

            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
export default InterviewSessionModel;
