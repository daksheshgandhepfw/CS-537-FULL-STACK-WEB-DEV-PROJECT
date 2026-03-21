
import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import type { InterviewSession } from '@aimock/common';

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await db.getSessions();
        setSessions(data.sort((a, b) => b.createdAt - a.createdAt));
      } catch (err) {
        console.error('Failed to fetch sessions', err);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Interviews</h1>
          <p className="text-slate-500 mt-1">Review your progress and feedback</p>
        </div>
        <a
          href="#/setup"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition-all shadow-lg shadow-indigo-100"
        >
          <i className="fa-solid fa-plus"></i>
          New Session
        </a>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
            <i className="fa-solid fa-calendar-xmark"></i>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">No sessions yet</h2>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            Ready to prepare for your dream job? Start your first mock interview session now.
          </p>
          <a
            href="#/setup"
            className="mt-6 inline-block bg-indigo-600 text-white font-semibold py-3 px-8 rounded-xl"
          >
            Get Started
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wide">
                    {session.type}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${session.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {session.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{session.jobTitle}</h3>
                <p className="text-sm text-slate-500 mb-4">{session.companyName}</p>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock"></i>
                    {session.duration} mins
                  </span>
                  <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to delete this session?')) {
                      try {
                        await db.deleteSession(session.id);
                        setSessions(sessions.filter(s => s.id !== session.id));
                      } catch (err) {
                        alert('Failed to delete session');
                        console.error(err);
                      }
                    }
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Session"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
                {session.status === 'completed' ? (
                  <a
                    href={`#/report/${session.id}`}
                    className="flex-1 text-center py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    View Report
                  </a>
                ) : (
                  <a
                    href={`#/interview/${session.id}`}
                    className="flex-1 text-center py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Continue
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
