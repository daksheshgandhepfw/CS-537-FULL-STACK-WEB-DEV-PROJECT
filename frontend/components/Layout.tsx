import React, { useState } from 'react';
import { db } from '../lib/db';

interface LayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
    const user = db.getCurrentUser();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Close button for mobile */}
                <div className="absolute top-4 right-4 md:hidden">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="p-6 border-b border-slate-800 mt-8 md:mt-0">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <i className="fa-solid fa-microphone-lines text-indigo-400"></i>
                        <span>Interviewer AI</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
                    <a href="#/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-chart-line w-5 text-slate-400"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="#/calendar" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-calendar w-5 text-slate-400"></i>
                        <span>Calendar</span>
                    </a>
                    <a href="#/setup" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
                        <i className="fa-solid fa-plus w-5 text-slate-400"></i>
                        <span>New Interview</span>
                    </a>
                    <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Account
                    </div>
                    <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors">
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
            <main className="flex-1 overflow-y-auto w-full">
                {/* Mobile Header with Hamburger */}
                <div className="md:hidden flex items-center p-4 border-b bg-white sticky top-0 z-30">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-500 hover:text-slate-800 mr-4">
                        <i className="fa-solid fa-bars text-2xl"></i>
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <i className="fa-solid fa-microphone-lines text-indigo-500"></i>
                        <span>Interviewer AI</span>
                    </h1>
                </div>

                <div className="max-w-6xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
