import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { ScheduledInterview, InterviewSession, Report as ReportType } from 'aimock-common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Calendar: React.FC = () => {
    const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
    const [view, setView] = useState<'grid' | 'agenda'>('agenda');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showReportId, setShowReportId] = useState<string | null>(null);
    
    // New Interview state
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    // Readiness Reports state & Expanded view state
    const [reports, setReports] = useState<Record<string, any>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Record<string, InterviewSession[]>>({});

    useEffect(() => {
        loadInterviews();
    }, []);

    const loadInterviews = async () => {
        try {
            setLoading(true);
            const data = await db.getScheduledInterviews();
            setInterviews(data);
            
            // Background fetch readiness for all
            data.forEach(async (inv) => {
                try {
                    const report = await db.getScheduledInterviewReadiness(inv.id);
                    if (report && !report.message) {
                        setReports(prev => ({ ...prev, [inv.id]: report }));
                    }
                } catch (e) {
                    // ignore fetch errors for reports
                }
            });
        } catch (error) {
            console.error('Failed to load interviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!date || !time || !jobDescription || !companyName || !jobTitle) return;
            const scheduledAt = new Date(`${date}T${time}`).toISOString();
            
            await db.createScheduledInterview({
                userId: db.getCurrentUser()!.id,
                companyName,
                jobTitle,
                jobDescription,
                scheduledAt
            });
            setShowModal(false);
            setCompanyName('');
            setJobTitle('');
            setJobDescription('');
            setDate('');
            setTime('');
            await loadInterviews();
        } catch (error) {
            console.error('Error creating interview:', error);
            alert('Failed to schedule interview');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scheduled interview and ALL associated mock interviews/reports?')) return;
        try {
            await db.deleteScheduledInterview(id);
            await loadInterviews();
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const handleTakeInterview = (inv: ScheduledInterview) => {
        sessionStorage.setItem('pendingScheduledInterview', JSON.stringify(inv));
        window.location.hash = '#/setup';
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (!sessions[id]) {
            try {
                const fetchedSessions = await db.getScheduledInterviewSessions(id);
                setSessions(prev => ({ ...prev, [id]: fetchedSessions }));
            } catch (err) {
                console.error("Failed to load sessions for this scheduled interview");
            }
        }
    };

    const renderReadiness = (id: string) => {
        const report = reports[id];
        const inv = interviews.find(i => i.id === id);
        if (!report || report.interviewCount === 0 || !inv) return null;

        const scoreData = [
            { name: 'Comm.', val: report.overallScores.communication },
            { name: 'Role Fit', val: report.overallScores.role_fit },
            { name: 'Tech', val: report.overallScores.technical_depth },
            { name: 'Problem', val: report.overallScores.problem_solving },
            { name: 'Comp.', val: report.overallScores.company_fit },
        ];
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

        if (showReportId !== id) {
            return (
                <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {report.interviewCount}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">Mock Data Available</div>
                            <div className="text-xs text-slate-500">Based on {report.interviewCount} practice sessions</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowReportId(id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                        View Progress Report
                    </button>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 md:p-10 flex items-start justify-center">
                <div className="bg-slate-50 w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Close Button */}
                    <button 
                        onClick={() => setShowReportId(null)}
                        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10"
                    >
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>

                    <div className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 leading-tight">Cumulative Progress</h2>
                                <p className="text-slate-500 mt-2 flex items-center gap-2">
                                    <span className="font-bold text-indigo-600">{inv.jobTitle}</span> 
                                    <span className="text-slate-300">•</span> 
                                    <span>{inv.companyName} Preparation</span>
                                </p>
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm self-start">
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Overall Readiness</div>
                                <div className="text-3xl font-black text-indigo-600">
                                    {((Object.values(report.overallScores) as number[]).reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)}/5
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Sidebar Summary */}
                            <div className="lg:col-span-1 space-y-8">
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Score Breakdown</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={scoreData} layout="vertical" margin={{ left: 10 }}>
                                                <XAxis type="number" hide domain={[0, 5]} />
                                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} />
                                                <Tooltip cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="val" radius={[0, 6, 6, 0]}>
                                                    {scoreData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-indigo-900 text-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100 flex flex-col gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-xl">
                                        <i className="fa-solid fa-quote-left text-indigo-300"></i>
                                    </div>
                                    <h3 className="font-bold text-lg">AI Performance Insight</h3>
                                    <p className="text-sm text-indigo-100 leading-relaxed italic opacity-90">
                                        "{report.summary}"
                                    </p>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl text-emerald-600">
                                            <i className="fa-solid fa-circle-check"></i>
                                        </div>
                                        <div className="flex items-center gap-3 text-emerald-600 font-black mb-6">
                                            <span className="text-xs uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Recurring</span>
                                            <span>Strengths</span>
                                        </div>
                                        <ul className="space-y-4">
                                            {report.strengths.slice(0, 5).map((s: string, i: number) => (
                                                <li key={i} className="text-sm text-slate-600 flex gap-3">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl text-rose-600">
                                            <i className="fa-solid fa-triangle-exclamation"></i>
                                        </div>
                                        <div className="flex items-center gap-3 text-rose-600 font-black mb-6">
                                            <span className="text-xs uppercase tracking-widest bg-rose-50 px-2 py-1 rounded">Action Needed</span>
                                            <span>Growth Gaps</span>
                                        </div>
                                        <ul className="space-y-4">
                                            {report.weaknesses.slice(0, 5).map((w: string, i: number) => (
                                                <li key={i} className="text-sm text-slate-600 flex gap-3">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center">
                                            <i className="fa-solid fa-star"></i>
                                        </div>
                                        Top Learning Moments
                                    </h3>
                                    <div className="space-y-6">
                                        {report.starExamples.map((ex: any, i: number) => (
                                            <div key={i} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                                <p className="text-sm font-bold text-slate-800 mb-3 flex gap-2">
                                                    <span className="text-indigo-400 font-mono">Q.</span>
                                                    {ex.question}
                                                </p>
                                                <div className="pl-6 border-l-2 border-indigo-100">
                                                    <p className="text-sm text-slate-600 italic leading-relaxed">
                                                        <span className="font-bold text-indigo-600 not-italic mr-2">Improvement Guide:</span>
                                                        {ex.answer}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getDaysInMonth = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    return (
        <div className="flex flex-col h-full">
            {/* ... Header stays same ... */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-indigo-500 pb-2 inline-block">Interview Calendar</h1>
                    <p className="text-slate-500 mt-2">Schedule your upcoming interviews and track your mock practice readiness.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-800 p-1 rounded-lg flex items-center">
                        <button 
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'agenda' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setView('agenda')}
                        >
                            <i className="fa-solid fa-list mr-2"></i>Agenda
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setView('grid')}
                        >
                            <i className="fa-solid fa-calendar-days mr-2"></i>Grid
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <i className="fa-solid fa-plus"></i> Schedule New
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-4xl text-indigo-500"></i>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 pb-8">
                    {interviews.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800">
                            <i className="fa-solid fa-calendar-xmark text-6xl text-slate-700 mb-4"></i>
                            <h3 className="text-xl font-bold text-white">No Upcoming Interviews</h3>
                            <p className="text-slate-400 mt-2">Schedule an interview to start tracking your preparedness.</p>
                        </div>
                    ) : (
                        view === 'agenda' ? (
                            <div className="space-y-6">
                                {interviews.map(inv => {
                                    const isExpanded = expandedId === inv.id;
                                    const mockSessions = sessions[inv.id] || [];

                                    return (
                                        <div key={inv.id} className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col hover:border-indigo-500/50 transition-colors overflow-hidden">
                                            {/* Header row - clickable to expand */}
                                            <div 
                                                className="p-6 cursor-pointer flex justify-between items-start select-none"
                                                onClick={() => toggleExpand(inv.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-indigo-900/50 w-24 py-3 rounded-xl flex flex-col items-center justify-center border border-indigo-500/30">
                                                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">{new Date(inv.scheduledAt).toLocaleString('en-US', { month: 'short' })}</span>
                                                        <span className="text-3xl font-black text-white leading-none my-1">{new Date(inv.scheduledAt).getDate()}</span>
                                                        <span className="text-indigo-300/70 text-xs font-medium">{new Date(inv.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                                                            {inv.jobTitle} at {inv.companyName}
                                                        </h3>
                                                        <p className="text-sm text-slate-400 mb-2">Created on {new Date(inv.createdAt!).toLocaleDateString()}</p>
                                                        {reports[inv.id] && (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                                                                <i className="fa-solid fa-chart-simple"></i> Readiness Data Available
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleTakeInterview(inv); }}
                                                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2"
                                                    >
                                                        <i className="fa-solid fa-play"></i> Take Mock
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700 hover:border-red-500/50"
                                                    >
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Body */}
                                            {isExpanded && (
                                                <div className="p-6 pt-0 border-t border-slate-800 bg-slate-900/50">
                                                    <div className="mt-6 mb-4">
                                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Job Description</div>
                                                        <div className="bg-slate-950 p-4 rounded-lg text-slate-300 text-sm border border-slate-800/80 font-mono whitespace-pre-wrap">
                                                            {inv.jobDescription.length > 500 ? inv.jobDescription.substring(0, 500) + '... (Click Take Mock to view full)' : inv.jobDescription}
                                                        </div>
                                                    </div>

                                                    <div className="mt-8">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mock Interview History</h4>
                                                        </div>
                                                        
                                                        {mockSessions.length === 0 ? (
                                                            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                                                                <p className="text-slate-500 text-sm">No mock interviews taken for this schedule yet.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {mockSessions.map(session => (
                                                                    <div key={session.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-center hover:bg-slate-800 transition-colors">
                                                                        <div>
                                                                            <div className="text-white font-medium mb-1">Session on {new Date(session.createdAt).toLocaleDateString()}</div>
                                                                            <div className="text-xs text-slate-400">
                                                                                {session.type} • {session.difficulty} • {session.duration} mins
                                                                            </div>
                                                                        </div>
                                                                        <a 
                                                                            href={`#/report/${session.id}`}
                                                                            className="px-3 py-1.5 bg-slate-900 text-indigo-400 text-sm font-medium border border-indigo-500/30 rounded hover:bg-indigo-900/30 transition-colors"
                                                                        >
                                                                            View Record
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Progress Report explicitly displayed if available */}
                                                    {renderReadiness(inv.id)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-4">
                                {Array.from({ length: getDaysInMonth() }).map((_, i) => {
                                    const dateNum = i + 1;
                                    const mockDate = new Date();
                                    mockDate.setDate(dateNum);
                                    
                                    const dayName = mockDate.toLocaleDateString('en-US', { weekday: 'short' });
                                    const dayInterviews = interviews.filter(inv => new Date(inv.scheduledAt).getDate() === dateNum);
                                    const isToday = new Date().getDate() === dateNum && new Date().getMonth() === mockDate.getMonth();

                                    return (
                                        <div key={i} className={`min-h-36 rounded-xl border flex flex-col p-3 transition-colors ${
                                            isToday ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                        }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{dayName}</span>
                                                    <span className={`text-xl font-black ${isToday ? 'text-white' : 'text-slate-300'}`}>{dateNum}</span>
                                                </div>
                                                {dayInterviews.length > 0 && (
                                                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 rounded-full">{dayInterviews.length}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                                                {dayInterviews.map((inv, idx) => (
                                                    <div 
                                                        key={inv.id} 
                                                        className="bg-slate-800/80 border border-slate-700 rounded p-2 text-xs cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800 transition-all group"
                                                        onClick={() => { 
                                                            setView('agenda'); 
                                                            setExpandedId(inv.id);
                                                            // Also pre-fetch sessions directly
                                                            db.getScheduledInterviewSessions(inv.id).then(fetched => setSessions(prev => ({ ...prev, [inv.id]: fetched })));
                                                        }}
                                                        title="Click to view details in agenda"
                                                    >
                                                        <div className="text-indigo-400 font-bold mb-0.5">{new Date(inv.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div className="text-white font-medium truncate">{inv.companyName}</div>
                                                        <div className="text-slate-400 truncate text-[10px]">{inv.jobTitle}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">Schedule Upcoming Interview</h2>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={companyName} 
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder="e.g. Google, Stripe"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Target Job Title / Role</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={jobTitle} 
                                        onChange={e => setJobTitle(e.target.value)}
                                        placeholder="e.g. Senior Frontend Engineer"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none text-white focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={date} 
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none text-white focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={time} 
                                        onChange={e => setTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 outline-none text-white focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Target Job Description</label>
                                <textarea 
                                    required 
                                    rows={8}
                                    value={jobDescription} 
                                    onChange={e => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description here..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 outline-none text-white focus:border-indigo-500 placeholder-slate-600 resize-none font-mono text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                    Save Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
