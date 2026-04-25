import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { ScheduledInterview, InterviewSession, Report as ReportType } from 'aimock-common';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Calendar: React.FC = () => {
    const [interviews, setInterviews] = useState<ScheduledInterview[]>([]);
    const [view, setView] = useState<'grid' | 'agenda'>('agenda');
    const [filter, setFilter] = useState<'upcoming' | 'completed'>('upcoming');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showReportId, setShowReportId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // New Interview state
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [parentInterviewId, setParentInterviewId] = useState<string | number | null>(null);

    // Readiness Reports state & Expanded view state
    const [reports, setReports] = useState<Record<string, any>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Record<string, InterviewSession[]>>({});
    const [selectedDateInterviews, setSelectedDateInterviews] = useState<{date: number, interviews: ScheduledInterview[]} | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackTarget, setFeedbackTarget] = useState<any | null>(null);
    const [feedbackForm, setFeedbackForm] = useState({
        actualTime: '',
        outcome: 'pending',
        experience: ''
    });

    useEffect(() => {
        loadInterviews();
    }, []);

    const isPast = (date: string | Date) => {
        return new Date(date) < new Date();
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackTarget) return;

        try {
            await db.updateScheduledInterviewFeedback(feedbackTarget.id, {
                ...feedbackForm,
                submittedAt: new Date().toISOString()
            });
            setShowFeedbackModal(false);
            setFeedbackTarget(null);
            loadInterviews();
        } catch (err) {
            console.error(err);
            alert("Failed to save feedback");
        }
    };

    const handleScheduleFollowUp = (parent: any) => {
        setCompanyName(parent.companyName);
        setJobTitle(parent.jobTitle);
        setJobDescription(parent.jobDescription);
        setParentInterviewId(parent.id);
        setDate(new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]);
        setTime('10:00');
        setShowModal(true);
    };

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

                // Fetch sessions for expanded view
                try {
                    const sess = await db.getScheduledInterviewSessions(inv.id);
                    setSessions(prev => ({ ...prev, [inv.id]: sess }));
                } catch (e) {
                    // ignore
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
            
            const user = db.getCurrentUser();
            if (!user) return;

            await db.createScheduledInterview({
                userId: user.id,
                companyName,
                jobTitle,
                jobDescription,
                scheduledAt,
                parentInterviewId: parentInterviewId ? Number(parentInterviewId) : undefined
            });

            setShowModal(false);
            setParentInterviewId(null);
            setDate('');
            setTime('');
            setCompanyName('');
            setJobTitle('');
            setJobDescription('');
            loadInterviews();
        } catch (error) {
            console.error('Failed to create interview:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this interview and all its mock data?')) return;
        try {
            await db.deleteScheduledInterview(id);
            loadInterviews();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleTakeInterview = (inv: ScheduledInterview) => {
        sessionStorage.setItem('pendingScheduledInterview', JSON.stringify(inv));
        window.location.hash = '#/setup';
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderReadiness = (invId: string) => {
        const report = reports[invId];
        if (!report) return null;

        const data = [
            { name: 'Technical', score: report.technicalScore },
            { name: 'Soft Skills', score: report.softSkillsScore },
            { name: 'Experience', score: report.experienceScore },
            { name: 'Overall', score: report.overallReadiness }
        ];

        return (
            <div className="mt-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Readiness Report</h4>
                        <p className="text-xs text-slate-500 mt-1">Based on {report.totalSessions} mock sessions</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-indigo-600">{report.overallReadiness}%</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Preparation Score</div>
                    </div>
                </div>

                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xl border border-slate-800">
                                                {payload[0].value}%
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="score" radius={[4, 4, 4, 4]} barSize={32}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.score >= 70 ? '#10b981' : entry.score >= 40 ? '#f59e0b' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">AI Recommendation</div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">"{report.recommendation}"</p>
                </div>
            </div>
        );
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Interview Calendar</h1>
                        <p className="text-slate-500 mt-1">Schedule your upcoming interviews and track your mock practice readiness.</p>
                    </div>

                    {view === 'grid' && (
                        <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm ml-4">
                            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <div className="text-lg font-black text-slate-800 min-w-[160px] text-center">
                                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2"
                            >
                                Today
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-4">
                    {view === 'agenda' && (
                        <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                            <button 
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                onClick={() => setFilter('upcoming')}
                            >
                                Upcoming
                            </button>
                            <button 
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                onClick={() => setFilter('completed')}
                            >
                                Done
                            </button>
                        </div>
                    )}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                        <button 
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'agenda' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setView('agenda')}
                        >
                            <i className="fa-solid fa-list mr-2"></i>Agenda
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setView('grid')}
                        >
                            <i className="fa-solid fa-calendar-days mr-2"></i>Grid
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-lg shadow-indigo-100"
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
                    {view === 'agenda' ? (
                        <div className="space-y-6">
                            {interviews.filter(inv => filter === 'upcoming' ? !isPast(inv.scheduledAt) : isPast(inv.scheduledAt)).length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                    <i className={`fa-solid ${filter === 'upcoming' ? 'fa-calendar-check' : 'fa-check-double'} text-6xl text-slate-200 mb-4`}></i>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {filter === 'upcoming' ? 'No Upcoming Interviews' : 'No Completed Interviews'}
                                    </h3>
                                    <p className="text-slate-500 mt-2">
                                        {filter === 'upcoming' 
                                            ? 'Schedule an interview to start tracking your preparedness.' 
                                            : 'Completed interviews will appear here once their date has passed.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {interviews
                                        .filter(inv => filter === 'upcoming' ? !isPast(inv.scheduledAt) : isPast(inv.scheduledAt))
                                        .map(inv => {
                                            const isExpanded = expandedId === inv.id;
                                            const mockSessions = sessions[inv.id] || [];
                                            
                                            return (
                                                <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 flex flex-col hover:shadow-md transition-shadow overflow-hidden">
                                                    <div 
                                                        className="p-6 cursor-pointer flex justify-between items-start select-none"
                                                        onClick={() => toggleExpand(inv.id)}
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className="bg-indigo-600 w-24 py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-indigo-100">
                                                                <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">{new Date(inv.scheduledAt).toLocaleString('en-US', { month: 'short' })}</span>
                                                                <span className="text-3xl font-black text-white leading-none my-1">{new Date(inv.scheduledAt).getDate()}</span>
                                                                <span className="text-indigo-100/70 text-xs font-medium">{new Date(inv.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-3">
                                                                    {inv.jobTitle} at {inv.companyName}
                                                                </h3>
                                                                <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                                                                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                                        <i className="fa-solid fa-clock text-indigo-500 text-xs"></i>
                                                                        {new Date(inv.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                                        <i className="fa-solid fa-briefcase text-indigo-500 text-xs"></i>
                                                                        {inv.jobTitle}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!isPast(inv.scheduledAt) ? (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleTakeInterview(inv); }}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                                >
                                                                    <i className="fa-solid fa-play"></i>
                                                                    Take Mock
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    {!inv.feedback ? (
                                                                        <button 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                setFeedbackForm({ actualTime: '', outcome: 'pending', experience: '' });
                                                                                setFeedbackTarget(inv); 
                                                                                setShowFeedbackModal(true); 
                                                                            }}
                                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                                                        >
                                                                            <i className="fa-solid fa-square-check"></i>
                                                                            Interview Result
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleScheduleFollowUp(inv); }}
                                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                                        >
                                                                            <i className="fa-solid fa-calendar-plus"></i>
                                                                            Schedule Follow-up
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                                                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95"
                                                            >
                                                                <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                            <div className={`w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                <i className="fa-solid fa-chevron-down"></i>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-8 pb-8 pt-2 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                                <div className="lg:col-span-2">
                                                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Job Description & Details</h4>
                                                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{inv.jobDescription}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Interview Feedback</h4>
                                                                    {!inv.feedback ? (
                                                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 border-dashed flex flex-col items-center justify-center text-center">
                                                                            <i className="fa-solid fa-comment-slash text-slate-200 text-3xl mb-3"></i>
                                                                            <p className="text-slate-400 text-xs font-medium">No feedback recorded yet. Update results after your interview.</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                                                                            <div className={`absolute top-0 left-0 w-1 h-full ${
                                                                                inv.feedback.outcome === 'passed' ? 'bg-emerald-500' :
                                                                                inv.feedback.outcome === 'failed' ? 'bg-red-500' :
                                                                                'bg-amber-500'
                                                                            }`}></div>
                                                                            <div className="flex justify-between items-center mb-3">
                                                                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                                                                                    inv.feedback.outcome === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                                                                                    inv.feedback.outcome === 'failed' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-amber-100 text-amber-700'
                                                                                }`}>
                                                                                    {inv.feedback.outcome}
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(inv.feedback.submittedAt).toLocaleDateString()}</span>
                                                                            </div>
                                                                            <p className="text-slate-700 text-sm italic leading-relaxed">"{inv.feedback.experience}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-8">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mock Interview History</h4>
                                                                </div>
                                                                
                                                                {mockSessions.length === 0 ? (
                                                                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                                                                        <p className="text-slate-400 text-sm">No mock interviews taken for this schedule yet.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {mockSessions.map(session => (
                                                                            <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-200 transition-colors shadow-sm">
                                                                                <div>
                                                                                    <div className="text-slate-900 font-semibold mb-1">Session on {new Date(session.createdAt).toLocaleDateString()}</div>
                                                                                    <div className="text-xs text-slate-500 font-medium">
                                                                                        {session.type} • {session.difficulty} • {session.duration} mins
                                                                                    </div>
                                                                                </div>
                                                                                <a 
                                                                                    href={`#/report/${session.id}`}
                                                                                    className="px-4 py-2 bg-slate-50 text-indigo-600 text-sm font-bold rounded-lg border border-slate-200 hover:bg-white hover:border-indigo-200 transition-all"
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
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-4">
                            {Array.from({ length: getDaysInMonth() }).map((_, i) => {
                                 const dateNum = i + 1;
                                 const mockDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dateNum);
                                 
                                 const dayName = mockDate.toLocaleDateString('en-US', { weekday: 'short' });
                                 const dayInterviews = interviews.filter(inv => {
                                     const d = new Date(inv.scheduledAt);
                                     return d.getDate() === dateNum && 
                                            d.getMonth() === currentDate.getMonth() && 
                                            d.getFullYear() === currentDate.getFullYear();
                                 });
                                 const now = new Date();
                                 const isToday = now.getDate() === dateNum && 
                                                 now.getMonth() === currentDate.getMonth() && 
                                                 now.getFullYear() === currentDate.getFullYear();

                                 return (
                                     <div 
                                         key={i} 
                                         onClick={() => {
                                             if (dayInterviews.length > 0) {
                                                 setSelectedDateInterviews({ date: dateNum, interviews: dayInterviews });
                                             }
                                         }}
                                         className={`h-32 rounded-2xl border p-4 transition-all relative group ${
                                             dayInterviews.length > 0 ? 'cursor-pointer hover:shadow-md' : ''
                                         } ${
                                             isToday 
                                             ? 'bg-indigo-50 border-indigo-200' 
                                             : 'bg-white border-slate-200 hover:border-slate-300'
                                         }`}
                                     >
                                         {dayInterviews.length > 0 && (
                                             <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm shadow-red-100"></div>
                                         )}
                                         
                                         <div className="flex flex-col h-full">
                                             <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{dayName}</span>
                                             <span className={`text-2xl font-black ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{dateNum}</span>
                                             
                                             {dayInterviews.length > 0 && (
                                                 <div className="mt-auto flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                     <i className="fa-solid fa-calendar-check"></i>
                                                     {dayInterviews.length} {dayInterviews.length === 1 ? 'Event' : 'Events'}
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })}
                        </div>
                    )}
                </div>
            )}

            {/* Daily Interviews Modal/Overlay */}
            {selectedDateInterviews && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-[2rem] w-full max-w-lg border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Interviews on {selectedDateInterviews.date}</h2>
                                <p className="text-sm text-slate-500 mt-1">Manage your schedule for this day</p>
                            </div>
                            <button 
                                onClick={() => setSelectedDateInterviews(null)}
                                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedDateInterviews.interviews.map(inv => (
                                <div key={inv.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 group hover:border-indigo-200 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-indigo-600 font-bold text-sm mb-1">
                                                {new Date(inv.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-slate-900 font-bold">{inv.companyName}</div>
                                            <div className="text-slate-500 text-xs">{inv.jobTitle}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!isPast(inv.scheduledAt) ? (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedDateInterviews(null);
                                                        handleTakeInterview(inv);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs hover:bg-indigo-700"
                                                    title="Take Mock"
                                                >
                                                    <i className="fa-solid fa-play"></i>
                                                </button>
                                            ) : (
                                                <>
                                                    {!inv.feedback ? (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedDateInterviews(null);
                                                                setFeedbackForm({ actualTime: '', outcome: 'pending', experience: '' });
                                                                setFeedbackTarget(inv); 
                                                                setShowFeedbackModal(true); 
                                                            }}
                                                            className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs hover:bg-emerald-700"
                                                            title="Result"
                                                        >
                                                            <i className="fa-solid fa-square-check"></i>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedDateInterviews(null);
                                                                handleScheduleFollowUp(inv);
                                                            }}
                                                            className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs hover:bg-indigo-700"
                                                            title="Follow-up"
                                                        >
                                                            <i className="fa-solid fa-calendar-plus"></i>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setSelectedDateInterviews(null);
                                                    handleDelete(inv.id);
                                                }}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-red-600 flex items-center justify-center text-xs hover:bg-red-50 hover:border-red-100"
                                                title="Delete"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => {
                                setView('agenda');
                                setExpandedId(selectedDateInterviews.interviews[0].id);
                                setSelectedDateInterviews(null);
                            }}
                            className="w-full mt-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                        >
                            View Details in Agenda
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-[2rem] w-full max-w-2xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{parentInterviewId ? 'Schedule Follow-up Interview' : 'Schedule Upcoming Interview'}</h2>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Company Name</label>
                                    <input 
                                        required
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder-slate-400"
                                        placeholder="e.g. Google"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Job Title</label>
                                    <input 
                                        required
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder-slate-400"
                                        placeholder="e.g. Frontend Engineer"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Interview Date</label>
                                    <input 
                                        required
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Interview Time</label>
                                    <input 
                                        required
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Job Description</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the job description here..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder-slate-400 resize-none text-sm leading-relaxed"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => { setShowModal(false); setParentInterviewId(null); }} className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100">
                                    {parentInterviewId ? 'Schedule Follow-up' : 'Save Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showFeedbackModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-[2rem] w-full max-w-xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">How did it go?</h2>
                                <p className="text-slate-500 mt-1">Record your experience for {feedbackTarget?.companyName}</p>
                            </div>
                            <button 
                                onClick={() => setShowFeedbackModal(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Actual Time</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. 10:30 AM"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500"
                                        value={feedbackForm.actualTime}
                                        onChange={e => setFeedbackForm({...feedbackForm, actualTime: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Outcome</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-900 focus:border-indigo-500 appearance-none"
                                        value={feedbackForm.outcome}
                                        onChange={e => setFeedbackForm({...feedbackForm, outcome: e.target.value as any})}
                                    >
                                        <option value="pending">Pending Decision</option>
                                        <option value="passed">Moving Forward / Offer</option>
                                        <option value="failed">Rejected</option>
                                        <option value="follow-up">Follow-up Requested</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Experience</label>
                                <textarea 
                                    required
                                    rows={4}
                                    placeholder="What questions were asked? How did you feel about your answers?"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 outline-none text-slate-900 focus:border-indigo-500 resize-none"
                                    value={feedbackForm.experience}
                                    onChange={e => setFeedbackForm({...feedbackForm, experience: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setShowFeedbackModal(false)} className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100">
                                    Submit Feedback
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
