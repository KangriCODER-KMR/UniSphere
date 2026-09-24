/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Landmark, GraduationCap, 
  BookOpen, LogOut, Menu, X, User, Database, CheckCircle2, Bell, BellOff, Shield, Bot,
  Sun, Moon
} from 'lucide-react';
import { UserProfile, Department, Student, Course } from '../types';
import { dbService } from '../lib/db';
import { FIREBASE_ACTIVE } from '../lib/firebase';
import ReportsGenerator from './ReportsGenerator';
import DepartmentManager from './DepartmentManager';
import StudentEnrollment from './StudentEnrollment';
import CourseAssignments from './CourseAssignments';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';
import NotificationsPanel from './NotificationsPanel';
import HolaAI from './holaAI';

interface DashboardLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function DashboardLayout({ currentUser, onLogout }: DashboardLayoutProps) {
  // Determine dynamic default tab based on user roles
  const getDefaultTab = () => {
    if (currentUser.role === 'student') return 'student-portal';
    if (currentUser.role === 'teacher') return 'teacher-portal';
    return 'admin-portal';
  };

  // --- STATE DECLARATIONS ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(false);

  // Shared application state so updates propagate instantly across sections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Notifications State
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [triggerPollToggle, setTriggerPollToggle] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const prevNotifCountRef = useRef(0);

  // --- CONNECTIVITY & DATA POPULATION ---
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      // Compulsory database check on boot
      const cloudReady = await dbService.checkConnectionAndSync();
      setIsCloudActive(cloudReady);

      try {
        // Hydrate shared states
        const depts = await dbService.getDepartments();
        const studs = await dbService.getStudents();
        const crs = await dbService.getCourses();
        
        setDepartments([...depts]);
        setStudents([...studs]);
        setCourses([...crs]);
      } catch (e) {
        console.error('State hydration failure.', e);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [activeTab]); // Fetch data on tab updates to ensure real-time reporting

  // Interval poller for alerts/notifications
  useEffect(() => {
    const timer = setInterval(() => {
      setTriggerPollToggle(prev => !prev);
    }, 60000); // poll every 60s
    return () => clearInterval(timer);
  }, []);

  // Electronic Web Audio synth ping sound whenever new notifications roll in
  useEffect(() => {
    if (notificationsCount > prevNotifCountRef.current) {
      playNotificationSound();
    }
    prevNotifCountRef.current = notificationsCount;
  }, [notificationsCount]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.22);
    } catch (e) {
      // Slit audio bypass
    }
  };

  const handleLogoutAction = () => {
    dbService.logout();
    onLogout();
  };

  // Configure dynamic tabs based on user role enforcements
  const getNavItems = () => {
    if (currentUser.role === 'student') {
      return [
        { id: 'student-portal', label: 'Student Terminal', icon: GraduationCap }
      ];
    }
    if (currentUser.role === 'teacher') {
      return [
        { id: 'teacher-portal', label: 'Faculty Control Station', icon: BookOpen }
      ];
    }
    // Admin View options (Unified standard with system terminal)
    return [
      { id: 'admin-portal', label: 'Admin Root Terminal', icon: Shield },
      { id: 'reports', label: 'Real-Time Reports', icon: LayoutDashboard },
      { id: 'departments', label: 'Departments List', icon: Landmark },
      { id: 'students', label: 'Student Enrollment Records', icon: GraduationCap },
      { id: 'courses', label: 'Course Assignments Catalog', icon: BookOpen }
    ];
  };

  const navItems = getNavItems();

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-250 ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 1. MOBILE RESPONSIVE NAVIGATION BAR (Upper rail for tiny screens) */}
      <header className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center md:hidden border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <Landmark className="h-6 w-6 text-indigo-500 animate-pulse" />
          <span className="font-black text-lg tracking-tight">Knit-Gate</span>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          {/* Theme Switcher for mobile */}
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-400" />}
          </button>

          {/* Notifications bell */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-755 text-slate-300 relative cursor-pointer"
            title="System Alert Feed"
          >
            {notificationsMuted ? <BellOff className="h-5 w-5 text-rose-400" /> : <Bell className="h-5 w-5" />}
            {!notificationsMuted && notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">
                {notificationsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="p-1.5 focus:outline-none hover:bg-slate-800 rounded-lg text-slate-300"
            title="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* 2. PERSISTENT SIDEBAR NAVIGATION (For Tablet and Large Screens) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between text-slate-100 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* LOGO AND BRANDING */}
        <div className="space-y-6">
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20">
                <Landmark className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight block text-white leading-none">Knit Sultanpur</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hub Portal</span>
              </div>
            </div>

            {/* Notifications and Theme Toggles */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => setIsDarkMode(prev => !prev)}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white cursor-pointer hover:scale-105 transition-all flex items-center justify-center"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-400" />}
              </button>
              
              <button
                onClick={() => setIsNotifOpen(true)}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 relative cursor-pointer hover:scale-105 transition-all"
                title="System Alerts Feed"
              >
                {notificationsMuted ? <BellOff className="h-4.5 w-4.5 text-rose-400 animate-pulse" /> : <Bell className="h-4.5 w-4.5" />}
                {!notificationsMuted && notificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full animate-pulse shadow">
                    {notificationsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* CLOUD CONNECTION STATUS TRACKER */}
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5 flex flex-col font-sans">
            <div className="flex items-center space-x-2">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Sync</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
              <span className="text-xs font-bold text-slate-300 font-mono tracking-wide">
                {isCloudActive ? 'ACTIVE CLOUD SYNC' : 'SECURE LOCAL LEDGER'}
              </span>
            </div>
          </div>

          {/* SIDEBAR NAVIGATION ITEMS LINK LIST */}
          <nav className="space-y-1 pt-4">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false); // Auto-hide menu on mobile toggle
                  }}
                  className={`w-full flex items-center space-x-3 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-650 text-white shadow-lg shadow-indigo-900/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <IconComponent className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT AND ACTIVE STAFF SUMMARY */}
        <div className="space-y-4 pt-6 border-t border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-800 border border-slate-700 font-extrabold rounded-xl flex items-center justify-center text-slate-200">
              {currentUser.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left">
              <span className="text-xs font-extrabold block text-white truncate">{currentUser.name}</span>
              <span className="text-[10px] font-bold text-slate-400 lowercase truncate block">{currentUser.email}</span>
              <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 px-1.5 py-0.5 rounded leading-none">
                Role: {currentUser.role}
              </span>
            </div>
          </div>

          <button
            id="portal-signout-btn"
            onClick={handleLogoutAction}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-slate-800 rounded-xl text-xs font-bold text-rose-450 hover:bg-rose-500/15 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out Gate</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE SCROLL AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {loading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* RENDER DYNAMIC ACTIVE MENU SECTIONS */}
            {activeTab === 'student-portal' && (
              <StudentDashboard currentUser={currentUser} />
            )}

            {activeTab === 'teacher-portal' && (
              <TeacherDashboard currentUser={currentUser} />
            )}

            {activeTab === 'admin-portal' && (
              <AdminDashboard currentUser={currentUser} />
            )}

            {activeTab === 'reports' && (
              <ReportsGenerator 
                departments={departments} 
                students={students} 
                courses={courses} 
              />
            )}
            
            {activeTab === 'departments' && (
              <DepartmentManager 
                currentUser={currentUser} 
              />
            )}

            {activeTab === 'students' && (
              <StudentEnrollment 
                departments={departments} 
              />
            )}

            {activeTab === 'courses' && (
              <CourseAssignments 
                departments={departments} 
              />
            )}

          </div>
        )}
      </main>

      {/* slide notifications panel */}
      <NotificationsPanel
        currentUser={currentUser}
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNotificationsCountChange={setNotificationsCount}
        triggerPollToggle={triggerPollToggle}
        onMuteChange={setNotificationsMuted}
      />

      {/* Floating AI companion */}
      <HolaAI currentUser={currentUser} />

    </div>
  );
}
