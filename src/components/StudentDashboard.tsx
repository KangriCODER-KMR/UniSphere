/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, BookOpen, Clock, Gift, Users, Star, Bell, Calendar, HelpCircle, FileText, 
  AlertTriangle, Radio, GraduationCap, Home, Key, CreditCard, BookCheck, ClipboardList,
  Briefcase, MessageSquare, Flame, CheckCircle, FlameKindling, Store, ShoppingCart, Search, Info, X, Globe, ShoppingBag, Book, Plus,
  Sparkles, Wand2, Upload
} from 'lucide-react';
import { dbService, WEEKLY_TIMETABLES } from '../lib/db';
import { authenticatedFetch } from '../lib/firebase';
import { Student, Course, StoreProduct, CartItem, UserProfile, MarketplaceOrder } from '../types';
import PaymentGateway from './PaymentGateway';

interface StudentDashboardProps {
  currentUser: UserProfile;
}

export default function StudentDashboard({ currentUser }: StudentDashboardProps) {
  const instConfig = dbService.getInstitutionalConfig();
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState<Student | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sell/List Product Modal States
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('books');
  const [newProdCondition, setNewProdCondition] = useState<'new' | 'used'>('new');
  const [newProdImage, setNewProdImage] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [conditionDetails, setConditionDetails] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Core Data Lists
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isStoreCartOpen, setIsStoreCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedProduct]);
  
  // Search and marketplace filters
  const [storeQuery, setStoreQuery] = useState('');
  const [storeCategory, setStoreCategory] = useState('all');

  // Google Books Integration State variables
  const [storeSource, setStoreSource] = useState<'campus' | 'google' | 'orders'>('campus');
  const [googleBooks, setGoogleBooks] = useState<any[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleSearchTotal, setGoogleSearchTotal] = useState(0);

  // AI Book Explainer States
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [explainingBook, setExplainingBook] = useState<{
    title: string;
    authors: string;
    description: string;
  } | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [explanationResult, setExplanationResult] = useState('');

  // Payment Gateway Modal States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentPurpose, setPaymentPurpose] = useState('');
  const [paymentSuccessCallback, setPaymentSuccessCallback] = useState<((method: string) => void) | null>(null);

  const requestPayment = (amount: number, purpose: string, callback: (method: string) => void) => {
    setPaymentAmount(amount);
    setPaymentPurpose(purpose);
    setPaymentSuccessCallback(() => callback);
    setIsPaymentOpen(true);
  };

  const handleExplainBook = async (title: string, authors: string, description: string) => {
    setExplainingBook({ title, authors, description });
    setIsExplainModalOpen(true);
    setIsExplanationLoading(true);
    setExplanationResult('');
    try {
        const response = await authenticatedFetch('/api/ai/explain-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, authors, description, studentYear: student?.year || currentUser.year || 2024, studentBranch: student?.branch || currentUser.branch || 'Computer Science' })
      });
      const data = await response.json();
      setExplanationResult(data.explanation || data.error || 'The AI study guide could not be generated.');
    } catch (error) {
      console.error(error);
      setExplanationResult('The AI study guide is temporarily unavailable.');
    } finally {
      setIsExplanationLoading(false);
    }
  };

  const fetchGoogleBooks = async (queryText: string) => {
    if (!queryText || queryText.trim() === '') {
      setGoogleBooks([]);
      return;
    }
    setIsGoogleLoading(true);
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryText)}&maxResults=16`);
      const data = await response.json();
      if (data.items) {
        setGoogleBooks(data.items);
        setGoogleSearchTotal(data.totalItems || data.items.length);
      } else {
        setGoogleBooks([]);
        setGoogleSearchTotal(0);
      }
    } catch (error) {
      console.error("Error fetching google books:", error);
      setGoogleBooks([]);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const generateAIDescription = async () => {
    if (!newProdDesc || newProdDesc.trim() === '') {
      triggerToast('Please type some keywords first inside description field!', 'warning');
      return;
    }
    setIsGeneratingDesc(true);
    try {
        const response = await authenticatedFetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: newProdDesc, category: newProdCategory })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI service unavailable.');
      setNewProdDesc(data.description);
      triggerToast('AI description expanded successfully.', 'success');
    } catch (error: any) {
      triggerToast(error.message || 'AI service unavailable.', 'error');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const generateAICoverImage = async () => {
    if (!newProdTitle || newProdTitle.trim() === '') {
      triggerToast('Please specify an item title first to generate cover style!', 'warning');
      return;
    }
    setIsGeneratingImage(true);
    try {
        const response = await authenticatedFetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProdTitle, details: newProdDesc })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI image service unavailable.');
      setNewProdImage(data.imageUrl);
      triggerToast('AI cover generated successfully.', 'success');
    } catch (error: any) {
      triggerToast(error.message || 'AI image service unavailable.', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedImages(prev => [...prev, reader.result as string]);
          triggerToast(`Loaded image "${file.name}" for physical condition analysis!`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Timetable
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Complaint Form
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [complaintPriority, setComplaintPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Batch Memory Filtering
  const [batchMemoryYear, setBatchMemoryYear] = useState<number>(2024);

  // Library search
  const [libraryQuery, setLibraryQuery] = useState('');

  useEffect(() => {
    // Hydrate the student profile based on login information
    const std = dbService.getStudents().find(s => s.id === currentUser.id || s.email === currentUser.email);
    if (std) {
      setStudent(std);
    } else {
      // Ephemeral fallback student profile
      const tempStd: Student = {
        id: currentUser.id || 'CS2024001',
        name: currentUser.name || 'Anonymous Student',
        branch: currentUser.branch || 'Computer Science',
        year: currentUser.year || 2024,
        section: currentUser.section || 'A',
        parentName: 'Rajesh Sharma',
        parentContact: '+91-9876543210',
        parentEmail: 'rajesh.sharma@email.com',
        address: 'Mumbai, Maharashtra',
        currentAttendance: 85
      };
      setStudent(tempStd);
    }
  }, [currentUser]);

  const triggerStateRefresh = () => {
    setRegistrations([...dbService.getRegistrations()]);
    setPayments([...dbService.getPayments()]);
  };

  useEffect(() => {
    triggerStateRefresh();
  }, [activeTab]);

  if (!student) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const attendanceThreshold = student.currentAttendance >= 75;

  // Timetable weekly switcher logic
  const timetableKey = `${student.branch.startsWith('Computer') ? 'CS' : 'IT'}-${student.year}-${student.section}`;
  const weeklyTimetable = WEEKLY_TIMETABLES[timetableKey] || WEEKLY_TIMETABLES['CS-2024-A'] || {};
  const currentDaySlots = weeklyTimetable[selectedDay] || [];

  return (
    <div className="space-y-6">
      
      {/* 2. SUB NAVIGATION LINKS RAIL (Vast spec coverage) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white leading-none">Student Portal Terminal</h2>
          <p className="text-xs text-slate-400 mt-1">Configure registrations, study files, ledgers and campus marketplaces.</p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
          Sch-ID: {student.id}
        </div>
      </div>

      {/* HORIZONTAL SCROLL SUB PANEL BUTTONS */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-2 scrollbar-none shrink-0">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'attendance', label: 'My Attendance', icon: CheckCircle },
          { id: 'marks', label: 'Exam Results', icon: GraduationCap },
          { id: 'timetable', label: 'Timetable', icon: Clock },
          { id: 'papers', label: 'Answer Papers', icon: FileText },
          { id: 'complaints', label: 'File Complaint', icon: AlertTriangle },
          { id: 'events', label: 'College Events', icon: Calendar },
          { id: 'notices', label: 'Notices Board', icon: Bell },
          { id: 'memories', label: 'Batch Memories', icon: Gift },
          { id: 'history', label: 'College History', icon: Info },
          { id: 'course-reg', label: 'Course registration', icon: BookCheck },
          { id: 'fee-payment', label: 'Fee Payment', icon: CreditCard },
          { id: 'library', label: 'Digital Library', icon: BookOpen },
          { id: 'assignments', label: 'Assignments', icon: ClipboardList },
          { id: 'placement', label: 'Placement Cell', icon: Briefcase },
          { id: 'hostel', label: 'Hostel Management', icon: Home },
          { id: 'exams', label: 'Online Exams', icon: Radio },
          { id: 'marketplace', label: 'Campus Marketplace', icon: Store }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SWITCH RENDER SUB VIEWS */}
      
      {/* Tab: Overview (Complete specked performance metrics) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current GPA</p>
                <h3 className="text-3xl font-black text-purple-400 mt-1">{(student.gpa || 8.5).toFixed(1)}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Current calculated SGPA</p>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                <Star className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance</p>
                <h3 className={`text-3xl font-black mt-1 ${attendanceThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {student.currentAttendance}%
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">75% attendance criteria met</p>
              </div>
              <div className={`p-3 rounded-xl ${attendanceThreshold ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Streak Status</p>
                <h3 className="text-3xl font-black text-amber-500 mt-1">12 🔥</h3>
                <p className="text-[10px] text-slate-500 mt-1">Consecutive days present</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl animate-pulse">
                <Flame className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Course Credits</p>
                <h3 className="text-3xl font-black text-indigo-400 mt-1">9</h3>
                <p className="text-[10px] text-slate-500 mt-1">Fall 2024 active semesters</p>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl lg:col-span-2">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300 mb-4 flex items-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span>Grade Distribution & Cohort comparison</span>
              </h3>
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-slate-350">
                    <span>A+ Grades Course slot matches</span>
                    <span className="text-purple-400 font-extrabold">60%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-slate-350">
                    <span>A Grades Course slot matches</span>
                    <span className="text-indigo-400 font-extrabold">30%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1 text-slate-350">
                    <span>Passing grades</span>
                    <span className="text-emerald-400 font-extrabold">10%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300 mb-4 flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-emerald-400" />
                <span>Leaderboard Standing</span>
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span>🥇</span>
                    <span className="font-bold text-slate-200">Arjun Patel</span>
                  </div>
                  <span className="text-indigo-300 font-bold">9.3 GPA</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span>🥈</span>
                    <span className="font-bold text-slate-200">Priya Gupta</span>
                  </div>
                  <span className="text-indigo-300 font-bold">9.1 GPA</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <div className="flex items-center space-x-3">
                    <span>🥉</span>
                    <span className="font-bold text-indigo-400">You ({student.name})</span>
                  </div>
                  <span className="text-indigo-400 font-extrabold">{(student.gpa || 8.5).toFixed(1)} GPA</span>
                </div>
              </div>
            </div>

          </div>

          {/* Profile Card */}
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-200 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">Academic Profile</h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Full Name</span>
                <span className="text-slate-200 font-bold">{student.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Academic Roll</span>
                <span className="text-slate-200 font-bold">{student.id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Branch Name</span>
                <span className="text-slate-200 font-bold">{student.branch}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Enrollment Year</span>
                <span className="text-slate-200 font-bold">{student.year}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-200 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">Personal & Family</h4>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Parent name</span>
                <span className="text-slate-200 font-bold">{student.parentName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Parent Hotline</span>
                <span className="text-slate-200 font-bold">{student.parentContact}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Parent Mail</span>
                <span className="text-slate-200 font-bold lowercase">{student.parentEmail}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Address Address</span>
                <span className="text-slate-200 font-bold truncate max-w-[200px]" title={student.address}>{student.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-905 border border-slate-800 rounded-3xl">
            <h3 className="font-bold text-lg text-white mb-2">My Attendance Record</h3>
            <p className="text-xs text-slate-400">Detailed overview of your daily attendance records across semesters.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregate Tally</p>
                <h4 className={`text-5xl font-black my-3 ${attendanceThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {student.currentAttendance}%
                </h4>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-3">
                  <div className={`h-full ${attendanceThreshold ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${student.currentAttendance}%` }} />
                </div>
                {attendanceThreshold ? (
                  <p className="text-xs text-emerald-400">All set! Your profile complies with strict college academic rules guidelines.</p>
                ) : (
                  <p className="text-xs text-rose-400">Warning: Your attendance is below the 75% proctor restriction bounds. Register justification records.</p>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Subject Metrics Breakdown</h4>
                {[
                  { name: 'Data Structures (CS-102)', present: 18, total: 20, rate: 90 },
                  { name: 'Introduction to Programming (CS-101)', present: 14, total: 17, rate: 82 },
                  { name: 'Calculus (MA-101)', present: 12, total: 18, rate: 70 }
                ].map((subj, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-350">
                      <span>{subj.name}</span>
                      <span className={subj.rate >= 75 ? 'text-emerald-400' : 'text-rose-400'}>{subj.rate}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${subj.rate >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${subj.rate}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-500">Present: {subj.present} classes / {subj.total} total</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Exam Results */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
            <h3 className="font-bold text-lg text-white mb-2 leading-none">Examination Ledger Results</h3>
            <p className="text-xs text-slate-400">5 proctored assessments (CT1, CT2, Mids, CT3, End-Sem) records card.</p>
            
            <div className="mt-6 overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
              <table className="w-full text-xs text-slate-405">
                <thead className="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-3 text-left">Subject Syllabus Address</th>
                    <th className="py-4 px-3 text-center">Class Test 1 (20)</th>
                    <th className="py-4 px-3 text-center">Class Test 2 (20)</th>
                    <th className="py-4 px-3 text-center">Mid Semester (30)</th>
                    <th className="py-4 px-3 text-center">Class Test 3 (20)</th>
                    <th className="py-4 px-3 text-center">End Sem (100)</th>
                    <th className="py-4 px-3 text-center font-black">Average Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-4 px-3 text-left font-bold text-white">Data Structures (CS-102)</td>
                    <td className="py-4 px-3 text-center">18 / 20</td>
                    <td className="py-4 px-3 text-center">19 / 20</td>
                    <td className="py-4 px-3 text-center">26 / 30</td>
                    <td className="py-4 px-3 text-center">17 / 20</td>
                    <td className="py-4 px-3 text-center">92 / 100</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-450">91%</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-4 px-3 text-left font-bold text-white">Introduction to Programming (CS-101)</td>
                    <td className="py-4 px-3 text-center">16 / 20</td>
                    <td className="py-4 px-3 text-center">17 / 20</td>
                    <td className="py-4 px-3 text-center">24 / 30</td>
                    <td className="py-4 px-3 text-center">18 / 20</td>
                    <td className="py-4 px-3 text-center">88 / 100</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-450">87%</td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-4 px-3 text-left font-bold text-white">Calculus Math Methods (MA-101)</td>
                    <td className="py-4 px-3 text-center">14 / 20</td>
                    <td className="py-4 px-3 text-center">15 / 20</td>
                    <td className="py-4 px-3 text-center">20 / 30</td>
                    <td className="py-4 px-3 text-center">13 / 20</td>
                    <td className="py-4 px-3 text-center">72 / 100</td>
                    <td className="py-4 px-3 text-center font-black text-indigo-400">70%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Timetable */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
            <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Academic Timetable Matrix</h3>
            <p className="text-xs text-slate-400 mt-1">Inter branches weekly academic slot matches for {timetableKey}.</p>
            
            {/* Days Tabs switcher */}
            <div className="flex border-b border-slate-800 gap-2 mt-6 pb-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    selectedDay === day 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* List Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {currentDaySlots.map((slot, index) => (
                <div key={index} className="p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl space-y-2 transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                      {slot.type || 'Lecture'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                      {slot.time}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white">{slot.subject}</h4>
                  <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                    <span>Room: <span className="font-bold text-slate-300">{slot.room}</span></span>
                    <span>Instructor: <span className="font-bold text-indigo-400">{slot.teacher || 'Prof.'}</span></span>
                  </div>
                </div>
              ))}
              {currentDaySlots.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500 text-xs">
                  No classes scheduled on this day. Holiday/Prep time!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Answer Papers */}
      {activeTab === 'papers' && (
        <div className="space-y-6">
          <div className="p-10 bg-slate-905 border border-slate-800 rounded-3xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Checked Papers Loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Answer files will reveal in this portfolio section once academic assessors scan and upload checked answers evaluations.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Complaints */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Form */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350">Submit Grievance / Complaint</h3>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  placeholder="Subject of concern, e.g. Washroom leakage"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Detail Message</label>
                <textarea
                  rows={4}
                  required
                  value={complaintMessage}
                  onChange={(e) => setComplaintMessage(e.target.value)}
                  placeholder="Provide precise details of the ticket..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Priority LEVEL</label>
                <select
                  value={complaintPriority}
                  onChange={(e: any) => setComplaintPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-3 text-xs outline-none"
                >
                  <option value="low">Low - Informative</option>
                  <option value="medium">Medium - Action required</option>
                  <option value="high">High - Urgent response expected</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (!complaintSubject || !complaintMessage) {
                    alert('Please fill in required fields.');
                    return;
                  }
                  dbService.addComplaint({
                    id: `C-${Date.now()}`,
                    studentId: student.id,
                    subject: complaintSubject,
                    message: complaintMessage,
                    status: 'pending',
                    date: new Date().toLocaleDateString(),
                    priority: complaintPriority
                  });
                  setComplaintSubject('');
                  setComplaintMessage('');
                  alert('Your grievance ticket has been queued! Watch the notifications panel.');
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transform transition-all hover:shadow-lg hover:shadow-indigo-900/20 active:scale-98 cursor-pointer"
              >
                Submit Ticket
              </button>
            </div>

            {/* History */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350">My Grievance History</h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-xs">
                {dbService.getComplaints().filter(c => c.studentId === student.id).map(comp => (
                  <div key={comp.id} className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white">{comp.subject}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        comp.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {comp.status}
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans leading-relaxed">{comp.message}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                      <span>Date logged: {comp.date}</span>
                      <span className="capitalize text-indigo-400">Class: {comp.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: College Events */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbService.getEvents().map(evt => (
              <div key={evt.id} className="bg-slate-905 border border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full group">
                <div className="h-44 relative overflow-hidden bg-slate-950">
                  <img src={evt.image} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute top-3 right-3 bg-indigo-600/90 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                    {evt.category}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-white group-hover:text-indigo-400 transition-colors leading-none">{evt.title}</h4>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-sans">{evt.description}</p>
                  </div>
                  <div className="space-y-2 font-mono text-[10px] text-slate-450 pt-3 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span>Timing:</span>
                      <span className="text-slate-350">{evt.date} • {evt.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Venue:</span>
                      <span className="text-slate-350">{evt.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Notices & Broadcasts */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-300">Notices Board Announcements</h3>
            <div className="space-y-4 pt-2">
              {dbService.getNotices().map(notice => (
                <div key={notice.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-start space-x-4">
                  <div className="mt-1 flex-shrink-0">
                    <span className={`block w-2.5 h-2.5 rounded-full ${
                      notice.priority === 'high' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="font-extrabold text-white leading-snug">{notice.title}</h4>
                      <span className="text-[10px] text-slate-500 italic whitespace-nowrap">{notice.date}</span>
                    </div>
                    <p className="text-slate-400 font-sans leading-relaxed">{notice.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Batch Memories (Gallery with year filter specs) */}
      {activeTab === 'memories' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-white leading-none">Shared Batch Memories</h3>
                <p className="text-xs text-slate-400 mt-1">Glimpses of graduation events, tech hackathons and farewell programs.</p>
              </div>
              <div className="shrink-0 text-xs text-slate-400">
                <span className="mr-2 font-semibold">Tally Years:</span>
                <select
                  value={batchMemoryYear}
                  onChange={(e) => setBatchMemoryYear(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-850 p-2 text-xs font-bold text-slate-250 rounded-lg outline-none"
                >
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                  <option value={2022}>2022</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dbService.getMemories().filter(m => m.batchYear === batchMemoryYear).map(mem => (
                <div key={mem.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-md group">
                  <div className="h-40 bg-slate-900 relative overflow-hidden">
                    <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4 space-y-1.5 text-xs">
                    <h4 className="font-extrabold text-white leading-none">{mem.title}</h4>
                    <p className="text-slate-400 font-sans">{mem.description}</p>
                    <span className="text-[10px] text-slate-550 block font-mono italic pt-1">{mem.createdAt}</span>
                  </div>
                </div>
              ))}
              {dbService.getMemories().filter(m => m.batchYear === batchMemoryYear).length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500 text-xs">
                  No memories registered for the batch of {batchMemoryYear}. Register memories using your coordinator options!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: College History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-6 text-xs leading-relaxed">
            <div>
              <h3 className="font-bold text-lg text-white mb-2 leading-none">Institute History ({instConfig.name})</h3>
              <p className="text-xs text-slate-400">{instConfig.name} - legacy of excellence in higher education and campus innovation.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-slate-950 p-6 border border-slate-800/80 rounded-2xl">
              {[
                { year: instConfig.foundationYear || '1979', title: 'Foundation & Heritage Launch', text: instConfig.historyText || 'Established to provide exceptional technical education and bridge engineering excellence with robust local community growth.' },
                { year: '2020', title: 'Transition to Smart Infrastructure', text: 'Upgraded campus nodes, digitized active learning modules, modern library indices and student-to-student ledger protocols.' },
                { year: '2026', title: 'Fully Autonomous Digital Ecosystem', text: 'Integrated state-of-the-art secure biometrics, dynamic marketplace commissions, zero-trust cloud network shields, and dual-factor phone authentication.' }
              ].map((stage, idx) => (
                <div key={idx} className="flex space-x-4 items-start pl-2">
                  <div className="px-3 py-1 font-mono font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shadow-sm">
                    {stage.year}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1.5">{stage.title}</h4>
                    <p className="text-slate-400 font-sans font-medium">{stage.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Course Registration */}
      {activeTab === 'course-reg' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
            <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Curriculum Registration Drawer</h3>
            <p className="text-xs text-slate-400">Register under Fall 2024 active semesters bounds. Review seat limits securely.</p>
            
            <div className="space-y-4 mt-6">
              {dbService.getCourses().map(course => {
                const isReg = registrations.some(r => r.studentId === student.id && r.courseId === course.id && r.status === 'registered');
                const isFull = course.currentEnrolled >= course.maxSeats;
                return (
                  <div key={course.id} className="p-5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-white bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                          {course.id}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-200">{course.name}</h4>
                        <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                          {course.credits} Credits
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-400 font-sans">
                        <span>Instructor: <span className="font-semibold text-slate-350">{course.instructor}</span></span>
                        <span>Schedule: <span className="font-semibold text-slate-350">{course.schedule}</span></span>
                        <span>Lab: <span className="font-semibold text-slate-350">{course.room}</span></span>
                      </div>
                      <div className="w-52 text-[10px]">
                        <div className="flex justify-between mb-1 text-slate-500">
                          <span>Seats Filled: {course.currentEnrolled} / {course.maxSeats}</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(course.currentEnrolled / course.maxSeats) * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end sm:justify-start">
                      {isReg ? (
                        <button
                          onClick={() => {
                            dbService.dropFromCourse(student.id, course.id);
                            triggerStateRefresh();
                            triggerToast(`Dropped out of ${course.name}`, 'info');
                          }}
                          className="px-4 py-2 border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 rounded-xl font-bold transition-all cursor-pointer"
                        >
                          Drop Course
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            try {
                              dbService.registerForCourse(student.id, course.id);
                              triggerStateRefresh();
                              triggerToast(`Enrolled into ${course.name}!`, 'success');
                            } catch (err: any) {
                              triggerToast(err?.message || 'Error occurred.', 'error');
                            }
                          }}
                          disabled={isFull}
                          className={`px-5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                            isFull 
                              ? 'bg-slate-900 border border-slate-800 text-slate-650 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/10'
                          }`}
                        >
                          {isFull ? 'Seats Full' : 'Register Now'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Fee Payment */}
      {activeTab === 'fee-payment' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 bg-gradient-to-br from-indigo-700 to-purple-600 text-white rounded-3xl shadow-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20 px-2 py-0.5 rounded leading-none">Annual Allocation</span>
              <div>
                <p className="text-[10px] text-indigo-200">Required Admission Fee total</p>
                <h4 className="text-3xl font-black mt-0.5">₹68,000</h4>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-500 text-white rounded-3xl shadow-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20 px-2 py-0.5 rounded leading-none">Total Realized</span>
              <div>
                <p className="text-[10px] text-emerald-200">Payments cleared to date</p>
                <h4 className="text-3xl font-black mt-0.5">
                  ₹{payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </h4>
              </div>
            </div>

            <div className="p-6 bg-slate-905 border border-slate-800 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-slate-400">Dues Outstanding</span>
                <h4 className="text-3xl font-black text-rose-400 mt-2">
                  ₹{Math.max(0, 68000 - payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
                </h4>
              </div>
              {68000 - payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0) > 0 ? (
                <button
                  onClick={() => {
                    const amt = 68000 - payments.filter(p => p.studentId === student.id).reduce((sum, p) => sum + p.amount, 0);
                    requestPayment(amt, 'Fall 2024 General Dues Admission Fees', (method: string) => {
                      dbService.addPayment({
                        id: `PAY-${Date.now()}`,
                        studentId: student.id,
                        amount: amt,
                        semester: 'Fall 2024 General Dues',
                        status: 'completed',
                        paymentDate: new Date().toISOString().split('T')[0],
                        paymentMethod: method
                      });
                      triggerStateRefresh();
                      triggerToast('Due statement paid successfully! Confirmed.', 'success');
                    });
                  }}
                  className="mt-4 py-2 w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Pay Outstanding Now
                </button>
              ) : (
                <div className="mt-4 text-xs font-extrabold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Excellent! All dues are clear.</span>
                </div>
              )}
            </div>

          </div>

          {/* History */}
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350">Transaction History</h3>
            <div className="space-y-2 pt-2">
              {payments.filter(p => p.studentId === student.id).map(p => (
                <div key={p.id} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{p.semester || 'Tuition Fees'}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">TXND: {p.id} • Method: {p.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-white">₹{p.amount.toLocaleString()}</span>
                    <span className="block text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Realized</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Digital Library */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          
          {/* Banner */}
          <div className="p-8 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-[2rem] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 border border-white/20 px-2 py-0.5 rounded leading-none">Knowledge Vault</span>
              <h3 className="text-3xl font-black drop-shadow-md">Active Digital Library</h3>
              <p className="text-sm text-amber-100 max-w-sm font-sans font-medium">Issue research guides or engineering syllabus scripts with 14-day checkout windows.</p>
            </div>
          </div>

          {/* Library Search and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-905 border border-slate-800 p-4 rounded-3xl">
            <div className="relative w-full sm:w-96 text-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search college books by title, author, category..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-9 pr-9 text-xs text-slate-250 placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
              />
              {libraryQuery && (
                <button
                  type="button"
                  onClick={() => setLibraryQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-orange-400 bg-orange-950/20 border border-orange-900/30 px-3 py-1.5 rounded-xl font-bold font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
              <span>{dbService.getBooks().filter(b => {
                const q = libraryQuery.trim().toLowerCase();
                if (!q) return true;
                return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.category && b.category.toLowerCase().includes(q));
              }).length} SPECIMENS CLASSIFIED</span>
            </div>
          </div>

          {/* Catalog grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbService.getBooks()
              .filter(book => {
                const q = libraryQuery.trim().toLowerCase();
                if (!q) return true;
                return book.title.toLowerCase().includes(q) || 
                       book.author.toLowerCase().includes(q) || 
                       (book.category && book.category.toLowerCase().includes(q)) ||
                       book.id.toLowerCase().includes(q);
              })
              .map(book => {
                const myIssues = dbService.getIssues().filter(i => i.studentId === student.id && i.bookId === book.id && i.status === 'issued');
                const isBorrowed = myIssues.length > 0;
                const isNoStock = book.available <= 0;

                return (
                  <div key={book.id} className="bg-slate-905 border border-slate-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full justify-between">
                    <div className="p-4 bg-slate-950 flex items-center justify-center h-44 overflow-hidden border-b border-slate-850">
                      <img src={book.cover} alt={book.title} className="max-h-[160px] object-contain shadow-md rounded" />
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 uppercase tracking-widest">Cat: {book.category || 'Reference'}</span>
                          <span className="font-mono text-slate-500">Vol-No: {book.id}</span>
                        </div>
                        <h4 className="font-extrabold text-sm text-white line-clamp-2 leading-tight">{book.title}</h4>
                        <p className="text-slate-400 leading-none">by {book.author}</p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-855 text-xs">
                        <div className="flex justify-between font-mono text-[10px] text-slate-500">
                          <span>Stock status:</span>
                          <span>{book.available} / {book.total} Copies</span>
                        </div>
                        
                        {isBorrowed ? (
                          <button
                            onClick={() => {
                              dbService.returnBook(myIssues[0].id);
                              triggerStateRefresh();
                              triggerToast(`Returned "${book.title}" successfully!`, 'success');
                            }}
                            className="w-full py-2.5 border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Return Copy
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              try {
                                dbService.issueBook(student.id, book.id);
                                triggerStateRefresh();
                                triggerToast(`Issued "${book.title}"! Collect at Babbage vault counters.`, 'success');
                              } catch (err: any) {
                                triggerToast(err?.message || 'Error issuing book.', 'error');
                              }
                            }}
                            disabled={isNoStock}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isNoStock 
                                ? 'bg-slate-900 border border-slate-800 text-slate-650 cursor-not-allowed'
                                : 'bg-indigo-650 hover:bg-indigo-550 text-white shadow-md shadow-indigo-900/10'
                            }`}
                          >
                            {isNoStock ? 'Out of Reserves' : 'Checkout Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {dbService.getBooks().filter(book => {
              const q = libraryQuery.trim().toLowerCase();
              if (!q) return true;
              return book.title.toLowerCase().includes(q) || 
                     book.author.toLowerCase().includes(q) || 
                     (book.category && book.category.toLowerCase().includes(q)) ||
                     book.id.toLowerCase().includes(q);
            }).length === 0 && (
              <div className="col-span-full py-16 text-center rounded-2xl bg-slate-950 border border-slate-900 border-dashed text-slate-505 space-y-3">
                <Book className="h-10 w-10 mx-auto text-orange-400 animate-bounce" />
                <h4 className="font-extrabold text-xs text-slate-400 font-sans">No Library Books Found</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  We couldn't locate any catalogued copies matching <span className="text-orange-400 font-mono">"{libraryQuery}"</span> inside our academic registry.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dbService.getAssignments().map(assign => {
              const sub = dbService.getSubmissions().find(s => s.studentId === student.id && s.assignmentId === assign.id);
              
              return (
                <div key={assign.id} className="bg-slate-905 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-slate-500 uppercase tracking-widest">{assign.courseId}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        sub ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20 animate-pulse'
                      }`}>
                        {sub ? 'Submitted' : 'Pending Upload'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white leading-snug">{assign.title}</h4>
                    <p className="text-slate-400 font-sans leading-relaxed">{assign.description}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-850 text-xs">
                    <div className="flex justify-between font-mono text-[10px] text-slate-500">
                      <span>Timeline Limit:</span>
                      <span className="text-slate-350">{assign.dueDate}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-slate-500">
                      <span>Max Scope Score:</span>
                      <span className="text-slate-350">{assign.maxMarks} Marks</span>
                    </div>
                    
                    {sub ? (
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>File: {sub.fileUrl}</span>
                          <span className="text-emerald-400 font-bold font-mono">My Score: {sub.marks !== null ? `${sub.marks}/${assign.maxMarks}` : 'Grading pending'}</span>
                        </div>
                        {sub.feedback && (
                          <div className="text-[10px] text-slate-450 pt-1 border-t border-slate-900 font-sans italic">
                            Feedback: {sub.feedback}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const file = prompt('File Upload:\nEnter file name (e.g., recursive_trees.py):', 'recursive_trees.py');
                          if (file) {
                            dbService.addSubmission({
                              id: `SUB-${Date.now()}`,
                              studentId: student.id,
                              assignmentId: assign.id,
                              submissionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
                              fileUrl: file,
                              marks: null,
                              feedback: ''
                            });
                            triggerStateRefresh();
                            alert(`Solution ${file} submitted!`);
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Upload Code Solution (.pdf / .py)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Placement Cell */}
      {activeTab === 'placement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350">Active Recruiting Drives</h3>
              
              {dbService.getJobs().map(job => {
                const subApp = dbService.getApplications().find(a => a.studentId === student.id && a.jobId === job.id);
                const isApplied = !!subApp;

                return (
                  <div key={job.id} className="p-5 bg-slate-905 border border-slate-800 rounded-3xl flex items-center justify-between gap-4 text-xs hover:border-slate-700/80 transition-all">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 bg-white rounded-xl shadow p-2 shrink-0 flex items-center justify-center">
                        <img src={job.logo} alt={job.company} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-sm text-white">{job.position}</h4>
                          <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/10 px-2 py-0.5 rounded">
                            {job.type}
                          </span>
                        </div>
                        <p className="text-slate-400 font-sans leading-none">{job.company} • {job.location}</p>
                        <p className="text-[10px] text-slate-500 font-sans line-clamp-1">{job.description}</p>
                        {job.eligibility && <p className="text-[9px] text-yellow-400/85 font-mono">Eligibility: {job.eligibility}</p>}
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-3.5">
                      <div>
                        <span className="text-sm font-black text-white">{job.package || job.stipend}</span>
                        <span className="block text-[9px] text-slate-500 font-mono italic">Ends: {job.deadline}</span>
                      </div>
                      
                      {isApplied ? (
                        <button
                          disabled
                          className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl font-bold cursor-not-allowed flex items-center space-x-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Applied</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Submit standard proctored application profile to ${job.company}?`)) {
                              dbService.applyToDrive(student.id, job.id);
                              triggerStateRefresh();
                              alert(`Application submitted to ${job.company}!`);
                            }
                          }}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-900/10 cursor-pointer"
                        >
                          Apply Drive
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Applications Status Feed */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl h-fit space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350">My Application Track</h3>
              <div className="relative border-l-2 border-slate-800 pl-4 space-y-6 text-xs pt-2">
                {dbService.getApplications().filter(a => a.studentId === student.id).map(app => {
                  const job = dbService.getJobs().find(j => j.id === app.jobId);
                  return (
                    <div key={app.id} className="relative group">
                      <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-500 border border-slate-900" />
                      <h4 className="font-bold text-white">{job ? job.company : 'Corporation'}</h4>
                      <p className="text-[10px] text-slate-400">{job ? job.position : 'Officer'}</p>
                      <span className="inline-block mt-2 px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-[9px] font-black uppercase rounded">
                        {app.status}
                      </span>
                    </div>
                  );
                })}
                {dbService.getApplications().filter(a => a.studentId === student.id).length === 0 && (
                  <div className="py-6 text-center text-slate-500 text-xs font-sans">
                    No active applications queued.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Hostel Management */}
      {activeTab === 'hostel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left panels */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Room details */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-lg text-white">Residential Room allotment</h3>
                  <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono text-[9px] uppercase font-black rounded-full">
                    AC Premium Double
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">Hostel Dorm:</span><span className="text-slate-200 font-bold">Ramanujan Hostel AC (H2)</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Room Number:</span><span className="text-slate-200 font-bold">B-204</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Wing / Floor:</span><span className="text-slate-200 font-bold">2nd Floor Wing-B</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-400">Assigned Partner:</span><span className="text-slate-200 font-bold">Rohan Verma</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Chief Warden:</span><span className="text-slate-200 font-bold">Dr. R.K. Verma</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Warden Hotline:</span><span className="text-slate-200 font-bold">+91-9876543211</span></div>
                  </div>
                </div>
              </div>

              {/* Maintenance logs */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs font-sans">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350">Room Maintenance register</h3>
                <div className="p-4 bg-slate-950 border border-slate-850 border-l-[3px] border-amber-500 rounded-xl space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Water purifier filter change</span>
                    <span className="text-amber-400 uppercase tracking-widest text-[9px] font-black">Logged</span>
                  </div>
                  <p className="text-slate-400">Purifier block shows excessive solid levels. Filter replacement queued.</p>
                  <p className="text-[10px] text-slate-500 font-mono">Requested: Yesterday • Ref: MR-9311</p>
                </div>
              </div>

              {/* Visitors log */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350">Dorm Visitor Registries</h3>
                <div className="divide-y divide-slate-850 bg-slate-950 rounded-2xl border border-slate-855 px-4 font-sans">
                  <div className="py-3 flex justify-between">
                    <div>
                      <h4 className="font-extrabold text-white">Rajesh Sharma (Father)</h4>
                      <p className="text-[10px] text-slate-500">In-Time: 10:15 AM • Out-Time: 04:30 PM • Permitted index</p>
                    </div>
                    <span className="text-[10px] text-slate-500">Date: 2026-06-05</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right panels (Mess & Billing) */}
            <div className="space-y-6">
              
              {/* Mess Menu */}
              <div className="bg-gradient-to-br from-indigo-950/70 to-indigo-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm text-indigo-300 uppercase tracking-widest flex items-center space-x-2">
                  <FlameKindling className="h-4 w-4" />
                  <span>Interactive Mess Menu</span>
                </h3>
                <div className="text-xs pt-1 space-y-3 font-sans leading-relaxed text-indigo-200">
                  <div>
                    <h4 className="font-extrabold text-white text-[11px]">Breakfast (07:30 AM - 09:15 AM)</h4>
                    <p className="text-slate-350">Indi pancakes, organic fruit bowls, hot tea/filter coffee, fresh dairy.</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-[11px]">Lunch (12:30 PM - 02:40 PM)</h4>
                    <p className="text-slate-350">Fragrant Jeera rice, yellow lentil tempering, seasonal farm values, flatbreads, raita, crisps.</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-[11px]">Dinner (07:30 PM - 09:30 PM)</h4>
                    <p className="text-slate-350">Paneer Lababdar, baseline Naan, vegetable pulao, warm cream custards.</p>
                  </div>
                </div>
              </div>

              {/* Amenities list */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm text-slate-300 uppercase tracking-widest">Amenities Portfolio</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['High-Speed 5G WiFi', 'Washing Portfolios', 'Active Gym Room', 'TV Common Wing', 'RO Water Units', 'Central AC units'].map((item, idx) => (
                    <div key={idx} className="p-2 border border-slate-850 bg-slate-950 text-slate-400 font-semibold font-sans rounded-xl text-center">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab: Online Exams */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Scheduled proctor list */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350">Scheduled Proctored Exams</h3>
              <div className="space-y-4 pt-2 text-xs">
                {dbService.getExams().map(exam => (
                  <div key={exam.id} className="p-5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">{exam.courseId} • {exam.type}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        exam.status === 'active' ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-slate-850 text-slate-400 border border-slate-800'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white group-hover:text-indigo-400 transition-colors">{exam.title}</h4>
                    <p className="text-slate-400 font-sans leading-relaxed mt-1 line-clamp-2">{exam.syllabus}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-900 mt-4 font-mono text-[10px]">
                      <span className="text-slate-500">Date: {exam.date} • {exam.startTime}</span>
                      <span className="text-slate-500">Dur: {exam.duration} mins</span>
                    </div>

                    {exam.status === 'active' ? (
                      <button
                        onClick={() => {
                          alert(`Launching proctored environment for "${exam.title}"...\n\nInstructions: Close all backgrounds, authorize cameras, maintain focus!`);
                        }}
                        className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-slate-950 font-black rounded-lg transition-all cursor-pointer text-center"
                      >
                        Enter Proctored Exam Room
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full mt-4 py-2 bg-slate-900 text-slate-650 font-bold border border-slate-850 rounded-lg cursor-not-allowed text-center"
                      >
                        Assessment Locked
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Past Exam Declared Transcripts */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350">E-Transcripts & Results</h3>
              <div className="space-y-3 pt-2 text-xs">
                {dbService.getResults().map((res, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center hover:border-slate-800 transition-all font-sans">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-white leading-none">{res.title || res.examId}</h4>
                        <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/10 px-2 py-0.5 rounded leading-none">{res.grade}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Report declared on: {res.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white">{res.score} / {res.total}</span>
                      <span className="block text-[9px] text-slate-450 mt-1">{res.remarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Campus Marketplace (Vast e-store specifications) */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          
          {/* Marketplace header specs */}
          <div className="p-8 bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-800 rounded-3xl text-white shadow-xl flex justify-between items-center relative overflow-hidden">
            <div className="space-y-4 relative z-10 w-full md:w-2/3">
              <div className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/20 leading-none">Official E-Store</div>
              <h3 className="text-3xl font-black drop-shadow-md">Campus Marketplace</h3>
              <p className="text-sm text-indigo-100 font-sans font-medium">Buy or trade hand-written course notes, research algorithm books, or customized college merchandise strictly inside the university gates.</p>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStoreCartOpen(true)}
                  className="px-4 py-2 bg-white text-indigo-900 font-bold hover:bg-slate-100 rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-indigo-950/20 cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>My Cart ({dbService.getCart().reduce((sum, c) => sum + c.quantity, 0)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(true)}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-650 text-white font-bold border border-white/20 rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>List Item For Sale</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-6">
            
            {/* Source Segmented Selector */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/50 p-4 border border-slate-850/65 rounded-2xl">
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 shrink-0 select-none flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStoreSource('campus')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                    storeSource === 'campus'
                      ? 'bg-gradient-to-r from-purple-800 to-indigo-850 text-white shadow-lg shadow-indigo-950/40'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>🏫 Campus Listings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoreSource('google');
                    setStoreCategory('books');
                    if (storeQuery && googleBooks.length === 0) {
                      fetchGoogleBooks(storeQuery);
                    } else if (!storeQuery && googleBooks.length === 0) {
                      fetchGoogleBooks('React Native Computer Science');
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                    storeSource === 'google'
                      ? 'bg-gradient-to-r from-indigo-800 to-blue-800 text-white shadow-lg shadow-indigo-950/40'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>🌐 Google Web Bookstore</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStoreSource('orders')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer ${
                    storeSource === 'orders'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-950/40'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>📦 My Active Orders ({dbService.getOrders().length})</span>
                </button>
              </div>

              {/* Status Header for source */}
              <div className="text-xs text-slate-455 leading-relaxed max-w-xl font-sans font-medium text-left">
                {storeSource === 'campus' ? (
                  <p>Browse local college inventory, course notes, hoodies, and second-hand gadgets posted inside {instConfig.abbreviation} campus gates.</p>
                ) : storeSource === 'google' ? (
                  <p>In cooperation with <span className="text-indigo-400 font-extrabold font-mono">Google Books API</span> — search globally over academic textbooks & research handbooks, fetching live prices and acquiring them directly to your checkout cart!</p>
                ) : (
                  <p>Track your <span className="text-amber-400 font-extrabold font-mono"> live Firestore-serialized receipts</span>, delivery dispatch status, and checkout packages real-time inside {instConfig.abbreviation} gates!</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-t border-slate-900 pt-4">
              {/* Category selector filters */}
              {storeSource === 'campus' ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {['all', 'books', 'notes', 'merch', 'electronics'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setStoreCategory(cat)}
                      className={`px-3 py-1.5 rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        storeCategory === cat 
                          ? 'bg-indigo-600 text-white shadow shadow-indigo-900/10' 
                          : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : storeSource === 'google' ? (
                <div className="flex items-center space-x-2 text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-3 py-1.5 rounded-xl font-bold font-mono tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>REALTIME SEARCH CONNECTED</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-[10px] text-amber-400 bg-amber-950/30 border border-amber-900/40 px-3 py-1.5 rounded-xl font-bold font-mono tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>FIRESTORE SECURE AUDIT SYNCED</span>
                </div>
              )}

              {/* Search query box with Google trigger helper */}
              <div className="flex gap-2 w-full sm:w-auto text-xs shrink-0">
                {storeSource !== 'orders' && (
                  <div className="relative flex-1 sm:w-64">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={storeQuery}
                      onChange={(e) => {
                        setStoreQuery(e.target.value);
                        if (storeSource === 'google' && e.target.value.length >= 3) {
                          fetchGoogleBooks(e.target.value);
                        }
                      }}
                      placeholder={storeSource === 'google' ? "Search global textbooks (e.g. Algorithms)..." : "Search bookstore, hoodies..."}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && storeSource === 'google') {
                          fetchGoogleBooks(storeQuery);
                        }
                      }}
                    />
                  </div>
                )}
                {storeSource === 'google' && (
                  <button
                    type="button"
                    onClick={() => fetchGoogleBooks(storeQuery)}
                    disabled={isGoogleLoading}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-white font-extrabold rounded-xl transition-all flex items-center justify-center shrink-0 min-w-[70px] cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <span className="text-[10px] uppercase animate-pulse">Searching...</span>
                    ) : (
                      <span>Search</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Content Lists Renderer based on state source selector */}
            {storeSource === 'google' ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 border border-slate-900 rounded-xl p-3">
                  <p className="text-left">
                    Showing Google Books results for: <span className="text-indigo-400 font-extrabold">"{storeQuery || 'React Native Computer Science'}"</span>
                  </p>
                  {googleSearchTotal > 0 && (
                    <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black shrink-0">
                      {googleSearchTotal} MATCHED
                    </span>
                  )}
                </div>

                {isGoogleLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <div key={n} className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 h-80 animate-pulse flex flex-col justify-between">
                        <div className="h-32 bg-slate-900/60 rounded-xl mb-4" />
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-900/60 rounded w-3/4" />
                          <div className="h-3 bg-slate-900/60 rounded w-1/2" />
                        </div>
                        <div className="h-8 bg-slate-900/60 rounded mt-4" />
                      </div>
                    ))}
                  </div>
                ) : googleBooks && googleBooks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                    {googleBooks.map((item) => {
                      const info = item.volumeInfo;
                      const thumbnail = info.imageLinks?.thumbnail?.replace('http:', 'https:') || 
                                        info.imageLinks?.smallThumbnail?.replace('http:', 'https:') || 
                                        'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400';
                      const title = info.title || 'Technical Course Volume';
                      const authors = info.authors?.join(', ') || 'Academic Scholars';
                      const description = info.description || 'Google indexed scholarly Textbook focusing on technical specifications and practical engineering instructions.';
                      const category = info.categories?.[0] || 'Technical';
                      const averageRating = info.averageRating || 4.5;
                      const ratingsCount = info.ratingsCount || Math.floor(Math.random() * 25) + 5;
                      
                      const computedPrice = item.saleInfo?.retailPrice?.amount 
                        ? Math.round(item.saleInfo.retailPrice.amount) 
                        : Math.floor(((title.charCodeAt(0) + title.charCodeAt(1) || 120) % 400) + 399); 
                      const origPrice = Math.round(computedPrice * 1.35);

                      return (
                        <div key={item.id} className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group text-left">
                          <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                            <img src={thumbnail} referrerPolicy="no-referrer" alt={title} className="max-h-[140px] max-w-[110px] object-contain p-2 group-hover:scale-105 transition-transform duration-500 shadow-md rounded" />
                            <span className="absolute top-2.5 right-2.5 bg-slate-950/90 text-[8px] uppercase tracking-wider font-mono px-2 py-0.5 rounded text-indigo-400 border border-indigo-900/30">
                              {category}
                            </span>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1.5 text-xs text-left">
                              <h4 className="font-extrabold text-white leading-tight line-clamp-1 truncate" title={title}>{title}</h4>
                              <p className="text-slate-400 font-sans leading-relaxed text-[11px] line-clamp-2">{description}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-1">Publisher: {info.publisher || 'Direct Publication'}</p>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-slate-900 text-xs text-left">
                              <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-500 font-sans truncate max-w-[120px]" title={authors}>by {authors}</span>
                                <div className="flex items-center text-amber-400 space-x-0.5 shrink-0 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span>{averageRating}</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-baseline font-mono">
                                <span className="text-sm font-black text-emerald-400">₹{computedPrice}</span>
                                <span className="text-[10px] text-slate-500 line-through">₹{origPrice}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const localProd: StoreProduct = {
                                      id: `G_BOOK_${item.id}`,
                                      title: title,
                                      description: description,
                                      category: 'books',
                                      sellerType: 'student',
                                      sellerId: currentUser.id,
                                      sellerName: authors,
                                      price: computedPrice,
                                      originalPrice: origPrice,
                                      stock: 5,
                                      images: [thumbnail],
                                      condition: 'new',
                                      rating: averageRating,
                                      reviews: ratingsCount,
                                      tags: info.categories || ['Technical']
                                    };
                                    setSelectedProduct(localProd);
                                  }}
                                  className="py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-center text-[10px] uppercase tracking-wider font-mono"
                                >
                                  Specs
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const localProd: StoreProduct = {
                                      id: `G_BOOK_${item.id}`,
                                      title: title,
                                      description: description.substring(0, 180) + '...',
                                      category: 'books',
                                      sellerType: 'student',
                                      sellerId: currentUser.id,
                                      sellerName: authors,
                                      price: computedPrice,
                                      originalPrice: origPrice,
                                      stock: 5,
                                      images: [thumbnail],
                                      condition: 'new',
                                      rating: averageRating,
                                      reviews: ratingsCount,
                                      tags: info.categories || ['Technical']
                                    };

                                    const exists = dbService.getProducts().some(p => p.id === localProd.id);
                                    if (!exists) {
                                      dbService.addProduct(localProd);
                                    }

                                    dbService.addToCart(localProd.id);
                                    triggerStateRefresh();
                                    triggerToast(`Imported "${localProd.title}" live from Google Books catalog directly to your cart!`, 'success');
                                  }}
                                  className="py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-[10px] uppercase tracking-wider text-center"
                                >
                                  + Cart
                                </button>
                              </div>

                              {/* AI Relevance Button */}
                              <button
                                type="button"
                                onClick={() => handleExplainBook(title, authors, description)}
                                className="w-full py-2 border border-purple-500 bg-purple-950/10 hover:bg-purple-900/20 text-purple-300 hover:text-white font-extrabold rounded-xl transition-all cursor-pointer text-center text-[9.5px] uppercase tracking-wider flex items-center justify-center space-x-1 hover:border-purple-400"
                              >
                                <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                                <span>✨ AI Syllabus & Study Roadmap</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-900 border-dashed text-slate-505 space-y-2">
                    <Globe className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
                    <p className="font-bold text-xs text-slate-400">Search world-wide repositories on Google Library</p>
                    <p className="text-[11px] max-w-sm mx-auto text-slate-500">Every single text, engineering paper, or educational guide indexed will be fetched live and added automatically.</p>
                  </div>
                )}
              </div>
            ) : storeSource === 'orders' ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-450 bg-slate-950 border border-slate-900 rounded-xl p-3">
                  <p className="text-left font-sans font-medium">
                    Your Live Campus Store Purchase Logs & Active Orders
                  </p>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black shrink-0 uppercase">
                    REALTIME DISPATCH
                  </span>
                </div>

                {dbService.getOrders().length === 0 ? (
                  <div className="p-16 text-center rounded-2xl bg-slate-950 border border-slate-900 border-dashed text-slate-500 space-y-3">
                    <ShoppingBag className="h-10 w-10 mx-auto text-slate-600 animate-pulse" />
                    <p className="font-extrabold text-xs text-slate-400 font-sans">No Campus Store Purchases Found</p>
                    <p className="text-[11px] max-w-sm mx-auto text-slate-500 leading-relaxed">Pick course textbooks, engineering drafts, or college hoodies from Listings, add them to your cart, and complete checkouts to dispatch real orders here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {dbService.getOrders().map(order => (
                      <div key={order.id} className="bg-slate-955 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition-all text-left flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-3 border-b border-slate-900 pb-3 mb-3">
                            <div className="space-y-1 text-left">
                              <span className="text-[9px] text-slate-500 font-black uppercase font-mono">CODE INVOICE ID</span>
                              <h4 className="text-xs font-black text-rose-400 font-mono uppercase tracking-wider">{order.id}</h4>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 text-right font-sans">
                              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold">
                                Purchased: {order.orderDate?.split(',')[0] || order.orderDate}
                              </span>
                              <div className="flex gap-1">
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900/30 rounded font-mono font-bold">
                                  PAID
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-900/30 rounded font-mono font-black animate-pulse">
                                  {order.deliveryStatus}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Order items list */}
                          <div className="space-y-2.5">
                            {order.items && order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3 bg-slate-950/40 border border-slate-900 p-2 rounded-xl text-xs">
                                <div className="flex items-center gap-3">
                                  {item.thumbnail ? (
                                    <img src={item.thumbnail} referrerPolicy="no-referrer" alt={item.title} className="w-8 h-10 object-contain bg-white rounded p-0.5 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-10 bg-slate-950 rounded border border-white/5 flex items-center justify-center shrink-0">
                                      <Book className="h-4.5 w-4.5 text-indigo-455" />
                                    </div>
                                  )}
                                  <div className="text-left space-y-0.5">
                                    <h5 className="font-extrabold text-slate-205 line-clamp-1 truncate max-w-[150px] sm:max-w-[200px]" title={item.title}>{item.title}</h5>
                                    <p className="text-[10px] text-indigo-400 font-mono">₹{item.price} × {item.quantity}</p>
                                  </div>
                                </div>
                                <span className="font-mono text-slate-350 font-black shrink-0">
                                  ₹{(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order total balance */}
                        <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-baseline">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Total Ledger Paid</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            ₹{order.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (() => {
              const filteredCampusProducts = dbService.getProducts()
                .filter(product => {
                  const matchesCategory = storeCategory === 'all' || product.category === storeCategory;
                  const query = storeQuery.trim().toLowerCase();
                  if (!query) return matchesCategory;
                  return matchesCategory && (
                    product.title.toLowerCase().includes(query) ||
                    product.description.toLowerCase().includes(query) ||
                    product.category.toLowerCase().includes(query) ||
                    (product.sellerName && product.sellerName.toLowerCase().includes(query))
                  );
                });

              if (filteredCampusProducts.length === 0) {
                return (
                  <div className="p-16 text-center rounded-2xl bg-slate-950 border border-slate-900 border-dashed text-slate-500 space-y-4 max-w-2xl mx-auto filament-alert">
                    <Search className="h-10 w-10 mx-auto text-indigo-400 animate-bounce" />
                    <h4 className="font-extrabold text-xs text-slate-350 font-sans">No Campus Listings Found</h4>
                    <p className="text-[11px] leading-relaxed text-slate-500 max-w-md mx-auto">
                      We couldn't locate any listed items matching <span className="text-rose-400 font-mono">"{storeQuery}"</span> inside our {instConfig.abbreviation} campus ledger.
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                      {storeCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setStoreCategory('all')}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Show All Categories
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setStoreSource('google');
                          setStoreCategory('books');
                          fetchGoogleBooks(storeQuery || 'React Native Computer Science');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-650 to-blue-650 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider font-mono shadow-md transition-all cursor-pointer"
                      >
                        Search Google Web Bookstore
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                  {filteredCampusProducts.map(product => {
                    return (
                      <div key={product.id} className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group text-left">
                        <div className="h-40 bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-900">
                          <img src={product.images[0]} referrerPolicy="no-referrer" alt={product.title} className="max-h-[140px] max-w-full object-contain p-2 group-hover:scale-105 transition-transform duration-500 rounded shadow" />
                          <span className="absolute top-2.5 right-2.5 bg-slate-950/90 text-[8px] uppercase tracking-wider font-mono px-2 py-0.5 rounded text-slate-400 border border-slate-850">
                            {product.category}
                          </span>
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1 text-xs text-left">
                            <h4 className="font-extrabold text-white leading-tight line-clamp-1 truncate" title={product.title}>{product.title}</h4>
                            <p className="text-slate-405 font-sans leading-relaxed text-[11px] line-clamp-2">{product.description}</p>
                            <span className="text-[10px] text-slate-500 block">Seller: {product.sellerType === 'student' ? `Confidential ${instConfig.abbreviation || 'CAMPUS'} Seller` : (product.sellerName || `${instConfig.abbreviation || 'CAMPUS'} Alumnus`)}</span>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-slate-900 text-xs text-left">
                            <div className="flex justify-between items-baseline font-mono text-left">
                              <span className="text-sm font-black text-rose-450">{instConfig.currencySymbol || '₹'}{product.price}</span>
                              <span className="text-[10px] text-slate-500 line-through">{instConfig.currencySymbol || '₹'}{product.originalPrice}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(product)}
                                className="py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-center text-[10px] uppercase tracking-wider font-mono"
                              >
                                Specs
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  dbService.addToCart(product.id);
                                  triggerStateRefresh();
                                  triggerToast(`Added "${product.title}" to your cart!`, 'success');
                                }}
                                className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-center text-[10px] uppercase tracking-wider"
                              >
                                + Cart
                              </button>
                            </div>

                            {/* If the campus product is a book or lecture notes, show the advanced AI help mapping! */}
                            {(product.category === 'books' || product.category === 'notes') && (
                              <button
                                type="button"
                                onClick={() => handleExplainBook(product.title, product.sellerName || 'KNIT Alumnus', product.description)}
                                className="w-full py-2 border border-purple-500 bg-purple-950/10 hover:bg-purple-900/20 text-purple-300 hover:text-white font-extrabold rounded-xl transition-all cursor-pointer text-center text-[9.5px] uppercase tracking-wider flex items-center justify-center space-x-1 hover:border-purple-400"
                              >
                                <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                                <span>✨ AI Syllabus & Study Roadmap</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Detailed Product Specification Modal */}
            <AnimatePresence>
              {selectedProduct && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedProduct(null)}
                    className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] cursor-pointer"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-2xl z-[110] text-left max-h-[85vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/40 text-[9px] px-3 py-1 rounded-full uppercase font-mono font-black tracking-widest">
                        {selectedProduct.category} Specifications
                      </span>
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="text-slate-400 hover:text-white bg-slate-950 border border-slate-850 hover:border-slate-800 p-2 rounded-xl transition-all cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                      {/* Product Cover and Thumbnails */}
                      <div className="sm:col-span-5 flex flex-col space-y-3">
                        <div className="bg-slate-950 rounded-2xl flex items-center justify-center p-4 border border-slate-850/60 h-56 overflow-hidden relative">
                          <img
                            src={selectedProduct.images?.[activeImageIndex] || selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400'}
                            referrerPolicy="no-referrer"
                            alt={selectedProduct.title}
                            className="max-h-full max-w-full object-contain shadow-xl rounded"
                          />
                        </div>
                        {selectedProduct.images && selectedProduct.images.length > 1 && (
                          <div className="grid grid-cols-4 gap-2">
                            {selectedProduct.images.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveImageIndex(i)}
                                className={`w-10 h-10 rounded-lg border overflow-hidden p-0.5 bg-slate-950 hover:border-indigo-500 transition-colors cursor-pointer ${
                                  activeImageIndex === i ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800'
                                }`}
                              >
                                <img src={img} className="w-full h-full object-cover rounded" alt="Book detail thumbnail" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Product Specs details */}
                      <div className="sm:col-span-7 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              selectedProduct.condition === 'new'
                                ? 'bg-emerald-950/60 text-emerald-450 border border-emerald-900/30'
                                : 'bg-amber-950/60 text-amber-450 border border-amber-900/40'
                            }`}>
                              {selectedProduct.condition} condition
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/60 text-blue-450 border border-blue-900/40">
                              Active Listing
                            </span>
                          </div>

                          <h3 className="text-sm font-black text-white tracking-tight leading-snug">
                            {selectedProduct.title}
                          </h3>

                          <p className="text-[11px] text-slate-400">
                            By/Listed by: <span className="text-slate-250 font-extrabold">{selectedProduct.sellerType === 'student' ? `Confidential ${instConfig.abbreviation || 'CAMPUS'} Seller` : (selectedProduct.sellerName || `${instConfig.abbreviation || 'CAMPUS'} Alumnus`)}</span>
                          </p>

                          <div className="flex items-center space-x-2 text-xs">
                            <div className="flex items-center text-amber-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-1" />
                              <span>{selectedProduct.rating || 4.5}</span>
                            </div>
                            <span className="text-slate-500 font-mono text-[9px]">({selectedProduct.reviews || 12} review benchmarks)</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Detailed Scope</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                            {selectedProduct.description}
                          </p>
                        </div>

                        <div className="border-t border-slate-900 pt-3 flex items-center justify-between gap-4">
                          <div className="font-mono text-left">
                            <span className="text-[8px] text-slate-505 font-black uppercase tracking-wider block">Price</span>
                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-xs font-black text-rose-450">₹{selectedProduct.price}</span>
                              <span className="text-[9px] text-slate-550 line-through">₹{selectedProduct.originalPrice}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const exists = dbService.getProducts().some(p => p.id === selectedProduct.id);
                              if (!exists) {
                                dbService.addProduct(selectedProduct);
                              }
                              dbService.addToCart(selectedProduct.id);
                              triggerStateRefresh();
                              triggerToast(`Successfully added "${selectedProduct.title}" to your cart!`, 'success');
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition-all text-[11px] cursor-pointer text-center"
                          >
                            Acquire & Checkout
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>

          {/* Cart Sidebar Drawers Render */}
          <AnimatePresence>
            {isStoreCartOpen && (
              <>
                <div 
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-pointer"
                  onClick={() => setIsStoreCartOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.3 }}
                  className="fixed top-0 right-0 h-screen w-96 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black text-white flex items-center space-x-2">
                      <ShoppingCart className="h-5 w-5 text-indigo-400" />
                      <span>Shopping Cart</span>
                    </h4>
                    <button
                      onClick={() => setIsStoreCartOpen(false)}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Cart List */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {dbService.getCart().map(item => {
                      const prod = dbService.getProducts().find(p => p.id === item.productId);
                      if (!prod) return null;
                      return (
                        <div key={item.productId} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex gap-3 text-xs">
                          <div className="w-14 h-14 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center">
                            <img src={prod.images[0]} alt={prod.title} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="font-bold text-white truncate">{prod.title}</h5>
                            <div className="flex justify-between text-slate-400">
                              <span>Qty: {item.quantity}</span>
                              <span className="text-emerald-400 font-bold font-mono">₹{(prod.price * item.quantity).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-1 font-mono text-[10px]">
                              <button
                                onClick={() => {
                                  dbService.updateCartQty(item.productId, item.quantity - 1);
                                  triggerStateRefresh();
                                }}
                                className="text-indigo-400 hover:text-white font-bold"
                              >
                                Dec
                              </button>
                              <button
                                onClick={() => {
                                  dbService.updateCartQty(item.productId, item.quantity + 1);
                                  triggerStateRefresh();
                                }}
                                className="text-indigo-400 hover:text-white font-bold"
                              >
                                Inc
                              </button>
                              <button
                                onClick={() => {
                                  dbService.removeFromCart(item.productId);
                                  triggerStateRefresh();
                                }}
                                className="text-rose-450 hover:text-rose-400 font-bold"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {dbService.getCart().length === 0 && (
                      <div className="text-center py-20 text-slate-500 font-sans">
                        Your cart is empty. Pick items from catalogs!
                      </div>
                    )}
                  </div>

                  {/* Checkout Footer */}
                  <div className="border-t border-slate-850 pt-6 mt-6 space-y-4">
                    <div className="flex justify-between text-sm font-bold text-slate-300">
                      <span>Total Amount:</span>
                      <span className="text-indigo-400 font-mono">
                        ₹{dbService.getCart().reduce((sum, item) => {
                          const prod = dbService.getProducts().find(p => p.id === item.productId);
                          return sum + (prod ? prod.price * item.quantity : 0);
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const total = dbService.getCart().reduce((sum, item) => {
                          const prod = dbService.getProducts().find(p => p.id === item.productId);
                          return sum + (prod ? prod.price * item.quantity : 0);
                        }, 0);
                        if (total === 0) return;

                        const cartItems = dbService.getCart().map(item => {
                          const prod = dbService.getProducts().find(p => p.id === item.productId);
                          return {
                            productId: item.productId,
                            title: prod ? prod.title : 'Marketplace Item',
                            price: prod ? prod.price : 0,
                            quantity: item.quantity,
                            thumbnail: prod && prod.images ? prod.images[0] : ''
                          };
                        });

                        requestPayment(total, `Institutional Marketplace Package (${cartItems.length} items)`, async (method: string) => {
                          const newOrder: MarketplaceOrder = {
                            id: `ORD_${Date.now()}`,
                            studentId: currentUser.id,
                            studentName: currentUser.name || student?.name || 'Student Scholar',
                            items: cartItems,
                            totalAmount: total,
                            paymentStatus: 'paid',
                            deliveryStatus: 'Processing',
                            orderDate: new Date().toLocaleString()
                          };

                          try {
                            await dbService.addOrder(newOrder);
                            triggerToast(`Order ${newOrder.id} placed successfully! Track dispatch inside "My Active Orders".`, 'success');
                          } catch (err) {
                            console.error("Error creating order:", err);
                            triggerToast("Order checked out successfully locally!", "success");
                          }

                          dbService.clearCart();
                          triggerStateRefresh();
                          setIsStoreCartOpen(false);
                        });
                      }}
                      disabled={dbService.getCart().length === 0}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-purple-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer"
                    >
                      Checkout Order Package
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* AI Syllabus and Explainer Modal */}
          <AnimatePresence>
            {isExplainModalOpen && explainingBook && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsExplainModalOpen(false)}
                  className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[150] cursor-pointer"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 shadow-2xl z-[160] text-left max-h-[85vh] overflow-y-auto font-sans"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-850 bg-slate-900">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-purple-400">
                        <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
                        <span className="text-[8px] font-black uppercase tracking-wider font-mono">KNIT COGNITIVE LECTURE PROTOCOL</span>
                      </div>
                      <h3 className="text-xs font-black text-white truncate max-w-[340px]" title={explainingBook.title}>
                        AI Study Mapping: {explainingBook.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsExplainModalOpen(false)}
                      className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 text-xs">
                    {/* Source details card */}
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850/80">
                      <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Textbook Reference</p>
                      <h4 className="text-[11px] font-medium text-slate-200 leading-normal">{explainingBook.title}</h4>
                      <p className="text-[9px] text-indigo-400 font-sans mt-0.5">by {explainingBook.authors || 'College Scholar'}</p>
                    </div>

                    {isExplanationLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                          <Sparkles className="h-4 w-4 text-purple-400 animate-pulse absolute top-3 left-3" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-white">Synthesizing Course Relevance...</p>
                          <p className="text-[10px] text-slate-500 leading-normal max-w-xs font-sans">
                            Gemini is preparing a five-week study roadmap from the textbook details.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary panel */}
                        <div className="text-[11px] leading-relaxed text-slate-450 font-sans border-b border-slate-850/50 pb-2.5">
                          <p>
                            Below is an interactive study guideline prepared for a <span className="text-indigo-300 font-extrabold">{student?.branch || currentUser.branch || 'Computer Engineering'}</span> scholar.
                          </p>
                        </div>

                        {/* Rendering core sections */}
                        <div className="max-h-[42vh] overflow-y-auto space-y-4 pr-1">
                          {(() => {
                            if (!explanationResult) return <p className="text-xs text-rose-450 text-center">Failed to fetch study map. Click refresh to retry.</p>;
                            const sections = explanationResult.split('### ');
                            return (
                              <div className="space-y-3.5 text-slate-300">
                                {sections.map((section, idx) => {
                                  if (!section.trim()) return null;
                                  const lines = section.split('\n');
                                  const header = lines[0].trim();
                                  const contentLines = lines.slice(1);
                                  return (
                                    <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-2 text-[11px]">
                                      <h5 className="font-extrabold text-[10px] uppercase tracking-wider text-purple-450 flex items-center space-x-1.5 border-b border-purple-900/10 pb-1.5">
                                        <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                                        <span>{header}</span>
                                      </h5>
                                      <div className="space-y-1.5 pl-0.5 leading-relaxed text-slate-300">
                                        {contentLines.map((line, lIdx) => {
                                          const trimmedLine = line.trim();
                                          if (!trimmedLine) return null;
                                          if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
                                            const cleanText = trimmedLine.replace(/^[\*\-]\s*/, '').trim();
                                            return (
                                              <div key={lIdx} className="flex items-start space-x-1.5 py-0.5 text-[11px] font-medium">
                                                <span className="text-purple-500 font-black shrink-0">•</span>
                                                <span>{cleanText.replace(/\*\*/g, '')}</span>
                                              </div>
                                            );
                                          }
                                          return <p key={lIdx} className="text-slate-400 leading-normal font-sans py-0.5">{trimmedLine.replace(/\*\*/g, '')}</p>;
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-850 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsExplainModalOpen(false)}
                      className="px-5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
                    >
                      Acknowledge Syllabus Map
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Custom Toast Alert Component */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 p-4 rounded-2xl shadow-2xl border text-sm max-w-sm cursor-pointer ${
                  toast.type === 'error'
                    ? 'bg-rose-950 border-rose-900 text-rose-250'
                    : toast.type === 'warning'
                    ? 'bg-amber-950 border-amber-900 text-amber-200'
                    : toast.type === 'info'
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-emerald-950 border-emerald-900 text-emerald-200'
                }`}
                onClick={() => setToast(null)}
              >
                <span className="text-lg">
                  {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '🔔'}
                </span>
                <p className="flex-1 font-sans font-medium text-xs leading-relaxed">{toast.message}</p>
                <button className="text-slate-500 hover:text-white font-extrabold text-xs shrink-0 pl-1">
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secure Payment Gateway Checkout dialog pop-up */}
          <PaymentGateway
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            amount={paymentAmount}
            purpose={paymentPurpose}
            onSuccess={(method) => {
              if (paymentSuccessCallback) {
                paymentSuccessCallback(method);
              }
            }}
          />

          {/* List New Item for Sale Modal */}
          <AnimatePresence>
            {isListModalOpen && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-slate-900 border border-slate-800 rounded-3rem p-6 w-full max-w-lg space-y-6 text-left shadow-2xl"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-indigo-400 font-mono tracking-wider">KNIT LEDGER PROTOCOL</span>
                      <h3 className="text-base font-black text-white">List Campus Item for Sale</h3>
                    </div>
                    <button
                      onClick={() => setIsListModalOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newProdTitle || !newProdDesc || !newProdPrice) {
                        triggerToast('Please populate all compulsory fields!', 'warning');
                        return;
                      }
                      const parsedPrice = Math.round(Number(newProdPrice));
                      if (isNaN(parsedPrice) || parsedPrice <= 0) {
                        triggerToast('Please state a valid positive selling price!', 'warning');
                        return;
                      }

                      const fallbackImage = newProdImage.trim() || (
                        newProdCategory === 'books' ? 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400' :
                        newProdCategory === 'electronics' ? 'https://m.media-amazon.com/images/I/71V2j7YAhfL._AC_SX679_.jpg' :
                        newProdCategory === 'notes' ? 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1000' :
                        'https://m.media-amazon.com/images/I/51+uK8FfH+L._AC_SX569_.jpg'
                      );

                      const finalImages = uploadedImages.length > 0 ? uploadedImages : [fallbackImage];
                      const finalDescription = conditionDetails.trim() 
                        ? `${newProdDesc}\n\n[Physical Conditions: ${conditionDetails}]`
                        : newProdDesc;

                      const addedProd: StoreProduct = {
                        id: `CAMP_PROD_${Date.now()}`,
                        title: newProdTitle,
                        description: finalDescription,
                        category: newProdCategory,
                        sellerType: 'student',
                        sellerId: student?.id || currentUser.id || 'STU001',
                        sellerName: student?.name || currentUser.name || 'Student Peer',
                        price: parsedPrice, // will be overwritten with public price
                        originalPrice: Math.round(parsedPrice * 1.4),
                        stock: 1,
                        images: finalImages,
                        condition: newProdCondition,
                        rating: 5.0,
                        reviews: 0
                      };

                      dbService.addProductWithCommission(addedProd, parsedPrice, currentUser.email);
                      triggerStateRefresh();
                      triggerToast(`Item "${newProdTitle}" listed inside campus marketplace successfully!`, 'success');
                      
                      // Reset fields
                      setNewProdTitle('');
                      setNewProdDesc('');
                      setNewProdPrice('');
                      setNewProdCategory('books');
                      setNewProdCondition('new');
                      setNewProdImage('');
                      setConditionDetails('');
                      setUploadedImages([]);
                      setIsListModalOpen(false);
                    }}
                    className="space-y-4 text-xs font-sans text-left max-h-[70vh] overflow-y-auto pr-1"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Item Title / Book Subject *</label>
                      <input
                        type="text"
                        required
                        value={newProdTitle}
                        onChange={(e) => setNewProdTitle(e.target.value)}
                        placeholder="e.g. Compiler Design Syllabus Notes, Lab Manual Copy"
                        className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1 font-sans">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description Keywords *</label>
                        <button
                          type="button"
                          onClick={generateAIDescription}
                          disabled={isGeneratingDesc || !newProdDesc}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-extrabold flex items-center space-x-1 uppercase cursor-pointer disabled:opacity-40"
                        >
                          {isGeneratingDesc ? (
                            <span className="scale-95 animate-pulse">Expanding via Gemini...</span>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-purple-400 animate-bounce" />
                              <span>✨ AI Auto-Flesh from Keywords</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        placeholder="Type keywords like 'React Book, Cormen, CS 3rd Sem, some highlighted notes' and click '✨ AI Auto-Flesh from Keywords' above!"
                        className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Detailed quality details *</label>
                      <input
                        type="text"
                        required
                        value={conditionDetails}
                        onChange={(e) => setConditionDetails(e.target.value)}
                        placeholder="e.g. Binding is intact, 5 pages have pencil highlights, cover slightly dusty"
                        className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-650 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Section Category</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-500"
                        >
                          <option value="books">📚 Books</option>
                          <option value="notes">✏️ Course Notes</option>
                          <option value="merch">👕 Campus Apparel / Merch</option>
                          <option value="electronics">💻 Electronics / Lab Gadgets</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Condition</label>
                        <select
                          value={newProdCondition}
                          onChange={(e) => setNewProdCondition(e.target.value as 'new' | 'used')}
                          className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 outline-none focus:border-indigo-500"
                        >
                          <option value="new">🆕 Brand New (Mint)</option>
                          <option value="used">🔄 Gently Used</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Seller Base Price (What you get) *</label>
                        <input
                          type="number"
                          required
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          placeholder="e.g. 299"
                          className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-650 outline-none focus:border-indigo-500 font-mono"
                        />
                        {newProdPrice && !isNaN(Number(newProdPrice)) && Number(newProdPrice) > 0 && (
                          <div className="text-[9px] text-emerald-400 font-sans mt-1 bg-slate-950 p-1 px-1.5 rounded-lg border border-emerald-950/40 font-semibold">
                            Buyer Visible Price: ₹{dbService.calculatePublicPrice(Number(newProdPrice))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 font-sans">
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cover Image Link (Optional)</label>
                          <button
                            type="button"
                            onClick={generateAICoverImage}
                            disabled={isGeneratingImage || !newProdTitle}
                            className="text-[8px] text-emerald-400 hover:text-emerald-350 font-extrabold flex items-center space-x-0.5 uppercase cursor-pointer disabled:opacity-40"
                          >
                            {isGeneratingImage ? (
                              <span className="scale-95 animate-pulse">Designing...</span>
                            ) : (
                              <>
                                <Wand2 className="h-2.5 w-2.5 text-emerald-400 mr-0.5" />
                                <span>🎨 AI Cover</span>
                              </>
                            )}
                          </button>
                        </div>
                        <input
                          type="url"
                          value={newProdImage}
                          onChange={(e) => setNewProdImage(e.target.value)}
                          placeholder="AI generates cover art, or paste URL"
                          className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-slate-200 placeholder-slate-650 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Image uploads for exact conditions */}
                    <div className="space-y-1.5 font-sans">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Actual Pictures of the Book (Verify quality)
                      </label>
                      <div className="border border-dashed border-slate-800 rounded-xl p-3 bg-slate-950 flex flex-col items-center justify-center text-center space-y-1 hover:border-indigo-500/50 transition-colors relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload className="h-5 w-5 text-indigo-400" />
                        <span className="text-[10px] text-slate-300 font-bold block">Upload actual product snapshots</span>
                        <span className="text-[8px] text-slate-500 block">Click or Drag & Drop multiple pictures</span>
                      </div>

                      {uploadedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative w-11 h-11 rounded-lg border border-slate-800 overflow-hidden bg-slate-900 group">
                              <img src={img} className="w-full h-full object-cover" alt="Loaded user snapshot" />
                              <button
                                type="button"
                                onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-0.5 text-[8px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer mt-2"
                    >
                      🚀 Release to Campus Marketplace
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}
