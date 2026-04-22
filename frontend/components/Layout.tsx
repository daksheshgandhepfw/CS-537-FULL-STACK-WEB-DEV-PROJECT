
import React from 'react';
import { db } from '../lib/db';

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
    const user = db.getCurrentUser();

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                        <div className="p-6 border-b border-slate-800">
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <i className="fa-solid fa-microphone-lines text-indigo-400"></i>
                                <span>Interviewer AI</span>
                            </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
                    <a href="#/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-chart-line w-5 text-slate-400"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="#/calendar" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-calendar w-5 text-slate-400"></i>
                        <span>Calendar</span>
                    </a>
                    <a href="#/setup" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-plus w-5 text-slate-400"></i>
                        <span>New Interview</span>
                    </a>
                    <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Account
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
                        <i className="fa-solid fa-right-from-bracket w-5"></i>
                        <span>Logout</span>
                    </button>
                </nav>
                    
                <div className="p-4 border-t border-slate-800">
                            <div className="flex items-center gap-3 p-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-lg">
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{user?.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                </div>
                            </div>
                    </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
