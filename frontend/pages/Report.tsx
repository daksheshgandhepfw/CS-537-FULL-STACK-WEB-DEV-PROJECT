
import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Report as ReportType, InterviewSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Report: React.FC<{ id: string }> = ({ id }) => {
  const [report, setReport] = useState<ReportType | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [r, s] = await Promise.all([
          db.getReportBySessionId(id),
          db.getSessionById(id)
        ]);
        if (r) {
          console.log('Fetched Report:', r);
          setReport(r);
        }
        if (s) setSession(s);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load report. It may not exist yet.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-600 mb-4"></i>
        <p className="text-slate-500">Loading analysis...</p>
      </div>
    </div>
  );

  if (error || !report || !session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-slate-600 mb-6">
          {error || "We couldn't find the analysis for this session. Please ensure the interview is completed."}
        </p>
        <a href="#/dashboard" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
          Return to Dashboard
        </a>
      </div>
    </div>
  );

  const scoreData = [
    { name: 'Comm.', val: report.overallScores.communication },
    { name: 'Role Fit', val: report.overallScores.role_fit },
    { name: 'Tech', val: report.overallScores.technical_depth },
    { name: 'Problem', val: report.overallScores.problem_solving },
    { name: 'Comp.', val: report.overallScores.company_fit },
  ];

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Performance Report</h1>
          <p className="text-slate-500 mt-1">{session.jobTitle} • {session.companyName}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 shadow-sm transition-colors"
        >
          <i className="fa-solid fa-file-pdf"></i>
          Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Score Breakdown</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide domain={[0, 5]} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="val" radius={[0, 4, 4, 0]}>
                    {scoreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 text-sm">Overall Quality</span>
              <span className="text-2xl font-black text-indigo-600">
                {/* Fix: Cast Object.values to number[] and type reduce parameters to fix arithmetic operator errors */}
                {((Object.values(report.overallScores) as number[]).reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)}/5
              </span>
            </div>
          </div>

          <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-lg shadow-indigo-100">
            <h3 className="font-bold mb-4">Interview Summary</h3>
            <p className="text-sm text-indigo-100 leading-relaxed italic">
              "{report.summary}"
            </p>
          </div>
        </div>

        {/* Main Feedback Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 font-bold mb-4">
                <i className="fa-solid fa-circle-check"></i>
                <span>Key Strengths</span>
              </div>
              <ul className="space-y-3">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-green-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 font-bold mb-4">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>Growth Areas</span>
              </div>
              <ul className="space-y-3">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-red-400">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Improved Answer Examples (STAR) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <i className="fa-solid fa-star text-amber-400"></i>
              Ideal STAR Responses
            </h3>
            <div className="space-y-6">
              {report.starExamples.map((ex, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-bold text-slate-800 mb-2">Q: {ex.question}</p>
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    <span className="font-semibold text-indigo-600">Model Answer:</span> {ex.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Study Plan */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <i className="fa-solid fa-book-open text-indigo-500"></i>
              Actionable Study Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.studyPlan.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-50 hover:border-slate-200 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-400 text-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
