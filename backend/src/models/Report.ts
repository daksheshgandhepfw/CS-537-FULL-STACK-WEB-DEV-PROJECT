import { pool } from '../db';

import { Report } from 'aimock-common';

export class ReportModel {
    private static mapRow(row: any): any {
        if (!row) return null;
        return {
            ...row,
            sessionId: row.session_id,
            strengths: row.strengths,
            weaknesses: row.weaknesses,
            redFlags: row.red_flags,
            starExamples: row.star_examples,
            studyPlan: row.study_plan,
            overallScores: row.overall_scores
        };
    }

    static async create(report: Omit<Report, 'id'>): Promise<any> {
        const {
            sessionId, summary, strengths, weaknesses, redFlags,
            starExamples, studyPlan, overallScores
        } = report;

        const result = await pool.query(
            `INSERT INTO reports 
            (session_id, summary, strengths, weaknesses, red_flags, 
             star_examples, study_plan, overall_scores, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *`,
            [
                sessionId, summary,
                JSON.stringify(strengths), JSON.stringify(weaknesses), JSON.stringify(redFlags),
                JSON.stringify(starExamples), JSON.stringify(studyPlan), JSON.stringify(overallScores)
            ]
        );
        return ReportModel.mapRow(result.rows[0]);
    }

    static async findBySessionId(sessionId: string | number): Promise<any | null> {
        const result = await pool.query(
            'SELECT * FROM reports WHERE session_id = $1',
            [sessionId]
        );
        if (result.rows.length === 0) return null;
        return ReportModel.mapRow(result.rows[0]);
    }

    static async update(sessionId: string | number, updates: any): Promise<any> {
        const {
            summary, strengths, weaknesses, redFlags,
            starExamples, studyPlan, overallScores
        } = updates;

        const result = await pool.query(
            `UPDATE reports SET 
                summary = $1, strengths = $2, weaknesses = $3, red_flags = $4,
                star_examples = $5, study_plan = $6, overall_scores = $7
              WHERE session_id = $8
              RETURNING *`,
            [
                summary,
                JSON.stringify(strengths), JSON.stringify(weaknesses), JSON.stringify(redFlags),
                JSON.stringify(starExamples), JSON.stringify(studyPlan), JSON.stringify(overallScores),
                sessionId
            ]
        );
        return ReportModel.mapRow(result.rows[0]);
    }

    static async delete(sessionId: string | number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM reports WHERE session_id = $1',
            [sessionId]
        );
        return (result.rowCount ?? 0) > 0;
    }
}
export default ReportModel;
