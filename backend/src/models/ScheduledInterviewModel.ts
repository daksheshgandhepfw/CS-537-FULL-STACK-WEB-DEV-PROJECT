import { pool } from '../db';
import { ScheduledInterview, Report } from 'aimock-common';

export class ScheduledInterviewModel {
    static async create(data: Omit<ScheduledInterview, 'id' | 'createdAt'>): Promise<ScheduledInterview> {
        const { userId, companyName, jobTitle, jobDescription, scheduledAt } = data;
        const result = await pool.query(
            `INSERT INTO scheduled_interviews (user_id, company_name, job_title, job_description, scheduled_at, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [userId, companyName, jobTitle, jobDescription, scheduledAt]
        );
        const row = result.rows[0];
        return {
            id: row.id.toString(),
            userId: row.user_id,
            companyName: row.company_name,
            jobTitle: row.job_title,
            jobDescription: row.job_description,
            scheduledAt: row.scheduled_at,
            createdAt: row.created_at
        };
    }

    static async findByUserId(userId: string | number): Promise<ScheduledInterview[]> {
        const result = await pool.query(
            'SELECT * FROM scheduled_interviews WHERE user_id = $1 ORDER BY scheduled_at ASC',
            [userId]
        );
        return result.rows.map(row => ({
            id: row.id.toString(),
            userId: row.user_id,
            companyName: row.company_name,
            jobTitle: row.job_title,
            jobDescription: row.job_description,
            scheduledAt: row.scheduled_at,
            createdAt: row.created_at
        }));
    }

    static async findById(id: string | number): Promise<ScheduledInterview | null> {
        const result = await pool.query(
            'SELECT * FROM scheduled_interviews WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            id: row.id.toString(),
            userId: row.user_id,
            companyName: row.company_name,
            jobTitle: row.job_title,
            jobDescription: row.job_description,
            scheduledAt: row.scheduled_at,
            createdAt: row.created_at
        };
    }

    static async delete(id: string | number): Promise<boolean> {
        // Since interview_sessions has ON DELETE CASCADE to scheduled_interviews
        // deleting the scheduled_interview will delete related sessions, 
        // turns, and reports (if properly cascaded in PostgreSQL).
        // Wait, interview_sessions deletion needs to cascade to reports and turns.
        // interview_turns has ON DELETE CASCADE.
        // reports table DOES NOT have ON DELETE CASCADE to interview_sessions in db.ts!
        // So we explicitly delete reports for associated sessions first!

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get all sessions associated with this scheduled_interview
            const sessionsResult = await client.query('SELECT id FROM interview_sessions WHERE scheduled_interview_id = $1', [id]);
            const sessionIds = sessionsResult.rows.map(row => row.id);
            
            if (sessionIds.length > 0) {
                // Delete reports for these sessions
                await client.query('DELETE FROM reports WHERE session_id = ANY($1)', [sessionIds]);
                // Delete turns for these sessions (not strictly needed if ON DELETE CASCADE, but safe)
                await client.query('DELETE FROM interview_turns WHERE session_id = ANY($1)', [sessionIds]);
            }
            
            // Delete the scheduled interview (which will cascade to interview_sessions)
            const result = await client.query('DELETE FROM scheduled_interviews WHERE id = $1', [id]);

            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async getReadinessReport(id: string | number): Promise<any> {
        // Aggregate statistics from multiple reports
        const result = await pool.query(
            `SELECT r.* FROM reports r
             JOIN interview_sessions s ON r.session_id = s.id
             WHERE s.scheduled_interview_id = $1`,
            [id]
        );

        const reports = result.rows;
        if (reports.length === 0) return null;

        let totalCommunication = 0;
        let totalRoleFit = 0;
        let totalTechnical = 0;
        let totalProblem = 0;
        let totalCompany = 0;

        const allWeaknesses = new Set<string>();
        const allStrengths = new Set<string>();

        let validScoresCount = 0;

        reports.forEach(r => {
            const scores = r.overall_scores;
            if (scores) {
                totalCommunication += (scores.communication || 0);
                totalRoleFit += (scores.role_fit || 0);
                totalTechnical += (scores.technical_depth || 0);
                totalProblem += (scores.problem_solving || 0);
                totalCompany += (scores.company_fit || 0);
                validScoresCount++;
            }
            if (Array.isArray(r.weaknesses)) {
                r.weaknesses.forEach((w: string) => allWeaknesses.add(w));
            }
            if (Array.isArray(r.strengths)) {
                r.strengths.forEach((s: string) => allStrengths.add(s));
            }
        });

        if (validScoresCount === 0) return null;

        return {
            interviewCount: reports.length,
            averageScores: {
                communication: Math.round(totalCommunication / validScoresCount),
                role_fit: Math.round(totalRoleFit / validScoresCount),
                technical_depth: Math.round(totalTechnical / validScoresCount),
                problem_solving: Math.round(totalProblem / validScoresCount),
                company_fit: Math.round(totalCompany / validScoresCount)
            },
            aggregatedWeaknesses: Array.from(allWeaknesses),
            aggregatedStrengths: Array.from(allStrengths)
        };
    }

    static async getSessions(id: string | number): Promise<any[]> {
        const result = await pool.query(
            'SELECT * FROM interview_sessions WHERE scheduled_interview_id = $1 ORDER BY created_at DESC',
            [id]
        );
        return result.rows.map(row => ({
            id: row.id.toString(),
            userId: row.user_id,
            scheduledInterviewId: row.scheduled_interview_id,
            jobTitle: row.job_title,
            jobDescription: row.job_description,
            companyName: row.company_name,
            companyPack: row.company_pack,
            type: row.type,
            difficulty: row.difficulty,
            duration: row.duration,
            status: row.status,
            createdAt: row.created_at
        }));
    }
}
export default ScheduledInterviewModel;
