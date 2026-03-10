
import React, { useState } from 'react';
import { db } from '../lib/db';
import { Difficulty, InterviewType, CompanyPack, InterviewSession } from '@aimock/common';
import { geminiService } from '../lib/geminiService';

export const Setup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    resume: '',
    companyName: '',
    companyPack: CompanyPack.GENERAL,
    type: InterviewType.MIXED,
    difficulty: Difficulty.MEDIUM,
    duration: 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = db.getCurrentUser();
      const token = db.getToken();
      if (!user || !token) {
        alert("You are not logged in. Please log in again.");
        return;
      }

      const plan = await geminiService.createInterviewPlan(
        formData.jobTitle,
        formData.jobDescription,
        formData.resume,
        formData.companyName,
        formData.companyPack,
        formData.type
      );

      const newSessionPayload = {
        userId: user.id,
        ...formData,
        status: 'planned' as const,
        plan,
        turns: [],
      };

      const savedSession = await db.saveSession(newSessionPayload as InterviewSession);
      window.location.hash = `#/interview/${savedSession.id}`;
    } catch (err) {
      console.error(err);
      alert('Failed to generate interview plan. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Setup Your Session</h1>
        <p className="text-slate-500 mt-2">Personalize your AI mock interview experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
            <input
              required
              type="text"
              placeholder="Google, Amazon, etc."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Company Style Pack</label>
            <select
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
              value={formData.companyPack}
              onChange={e => setFormData({ ...formData, companyPack: e.target.value as CompanyPack })}
            >
              <option value={CompanyPack.GENERAL}>General Tech Standard</option>
              <option value={CompanyPack.GOOGLE}>Google (GCA & Scale)</option>
              <option value={CompanyPack.AMAZON}>Amazon (LPs & Probing)</option>
              <option value={CompanyPack.MICROSOFT}>Microsoft (Growth Mindset)</option>
              <option value={CompanyPack.META}>Meta (Speed & Impact)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Target Job Title</label>
          <input
            required
            type="text"
            placeholder="e.g. Senior Backend Engineer"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={formData.jobTitle}
            onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Job Description</label>
          <textarea
            required
            rows={4}
            placeholder="Paste the Job Description here..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            value={formData.jobDescription}
            onChange={e => setFormData({ ...formData, jobDescription: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your Resume Text</label>
          <textarea
            required
            rows={4}
            placeholder="Paste your resume content or upload a file..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            value={formData.resume}
            onChange={e => setFormData({ ...formData, resume: e.target.value })}
          />
          <div className="mt-2 text-right">
            <input
              type="file"
              accept=".pdf,.docx"
              id="resume-upload"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  try {
                    setLoading(true);
                    const text = await db.parseResume(file);
                    setFormData(prev => ({ ...prev, resume: text }));
                  } catch (err: any) {
                    alert('Failed to parse resume: ' + err.message);
                  } finally {
                    setLoading(false);
                    // Reset input
                    e.target.value = '';
                  }
                }
              }}
            />
            <label
              htmlFor="resume-upload"
              className={`cursor-pointer inline-flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-800 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              Upload Resume (PDF/DOCX)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Focus</label>
            <select
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as InterviewType })}
            >
              <option value={InterviewType.BEHAVIORAL}>Behavioral</option>
              <option value={InterviewType.TECHNICAL}>Technical</option>
              <option value={InterviewType.SYSTEM_DESIGN}>System Design</option>
              <option value={InterviewType.MIXED}>Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
            <select
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
              value={formData.difficulty}
              onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
            >
              <option value={Difficulty.EASY}>Easy</option>
              <option value={Difficulty.MEDIUM}>Medium</option>
              <option value={Difficulty.HARD}>Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Total Time</label>
            <select
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
              value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Constructing Interview...
              </>
            ) : (
              <>
                <i className="fa-solid fa-play"></i>
                Initialize Simulation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
