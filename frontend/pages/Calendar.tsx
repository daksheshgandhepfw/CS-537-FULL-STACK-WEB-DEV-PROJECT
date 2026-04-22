import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { ScheduledInterview, InterviewSession } from 'aimock-common';

export const Calendar: React.FC = () => {
    const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
    const [view, setView] = useState<'grid' | 'agenda'>('agenda');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
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
        if (!report) return null;
        
        return (
            <div className="mt-4 p-5 bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-xl border border-indigo-500/30">
                <h4 className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie"></i> Aggregated Readiness ({report.interviewCount} sessions)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {Object.entries(report.averageScores).map(([key, val]: any) => (
                        <div key={key} className="text-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                            <div className="text-2xl font-black text-white">{val}/5</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">{key.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
                {report.aggregatedWeaknesses?.length > 0 && (
                    <div className="mt-4">
                        <h5 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">Recurring Growth Areas:</h5>
                        <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                            {report.aggregatedWeaknesses.slice(0, 3).map((w: string, i: number) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
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
