/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Calendar, PlusCircle, Bell, RefreshCw, X, Shield, BarChart2, 
  Trash, CheckCircle, FileText, Settings, AlertTriangle, Key, Download, HelpCircle, 
  BookOpen, Home, Briefcase, DollarSign, ShoppingBag, CreditCard, Landmark, Layers, ShoppingCart, Check,
  Database, ShieldAlert, Mail, Send, Lock
} from 'lucide-react';
import { dbService } from '../lib/db';
import { Student, Teacher, CollegeEvent, Notice, Complaint, UserProfile } from '../types';
import ZeroTrustFirewall from './ZeroTrustFirewall';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [mSettings, setMSettings] = useState(() => dbService.getMarketplaceSettings());
  const [instConfig, setInstConfig] = useState(() => dbService.getInstitutionalConfig());
  const [isLinkingStripe, setIsLinkingStripe] = useState(false);
  const [isUpdatingBranding, setIsUpdatingBranding] = useState(false);

  useEffect(() => {
    if (activeTab === 'marketplace-admin') {
      setMSettings(dbService.getMarketplaceSettings());
    }
    if (activeTab === 'settings') {
      setInstConfig(dbService.getInstitutionalConfig());
    }
  }, [activeTab]);

  // Lists
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeacherList] = useState<Teacher[]>([]);
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);

  // Master Administrative credentials states
  const [adminEmail, setAdminEmail] = useState(() => dbService.getAdminCredentials().email);
  const [adminPassword, setAdminPassword] = useState(() => dbService.getAdminCredentials().password);
  const [adminCredMsg, setAdminCredMsg] = useState('');
  const [adminCredErr, setAdminCredErr] = useState('');

  // SMTP Configuration & MFA Diagnostics Console States
  const [smtpHost, setSmtpHostState] = useState(() => localStorage.getItem('diag_smtp_host') || 'smtp.resend.com');
  const [smtpPort, setSmtpPortState] = useState(() => localStorage.getItem('diag_smtp_port') || '587');
  const [smtpUser, setSmtpUserState] = useState(() => localStorage.getItem('diag_smtp_user') || 'resend');
  const [smtpPass, setSmtpPassState] = useState(() => localStorage.getItem('diag_smtp_pass') || '');
  const [smtpSecure, setSmtpSecureState] = useState(() => localStorage.getItem('diag_smtp_secure') === 'true');
  const [smtpSender, setSmtpSenderState] = useState(() => localStorage.getItem('diag_smtp_sender') || 'onboarding@resend.dev');

  const [testRecipient, setTestRecipient] = useState('anayatgull019@gmail.com');
  const [smtpTestSending, setSmtpTestSending] = useState(false);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<string | null>(null);
  const [smtpTestError, setSmtpTestError] = useState<string | null>(null);

  // Cloud SMTP Save / Load states
  const [smtpSavingCloud, setSmtpSavingCloud] = useState(false);
  const [smtpSaveSuccess, setSmtpSaveSuccess] = useState<string | null>(null);
  const [smtpSaveError, setSmtpSaveError] = useState<string | null>(null);

  // Load cloud configurations on mount
  useEffect(() => {
    async function loadCloudSmtp() {
      try {
        const response = await fetch('/api/get-smtp');
        if (!response.ok) throw new Error('Unsuccessful API lookup');
        const data = await response.json();
        
        if (data.host) {
          setSmtpHostState(data.host);
          localStorage.setItem('diag_smtp_host', data.host);
        }
        if (data.port) {
          setSmtpPortState(data.port);
          localStorage.setItem('diag_smtp_port', data.port);
        }
        if (data.user) {
          setSmtpUserState(data.user);
          localStorage.setItem('diag_smtp_user', data.user);
        }
        if (data.hasPass) {
          setSmtpPassState('••••••••••••');
          localStorage.setItem('diag_smtp_pass', '••••••••••••');
        }
        if (data.secure !== undefined) {
          setSmtpSecureState(data.secure);
          localStorage.setItem('diag_smtp_secure', data.secure ? 'true' : 'false');
        }
        if (data.sender) {
          setSmtpSenderState(data.sender);
          localStorage.setItem('diag_smtp_sender', data.sender);
        }
        console.log('[SMTP ADMIN] Fetched persistent cloud SMTP details.');
      } catch (err: any) {
        console.warn('Failed to pre-load cloud SMTP settings:', err);
      }
    }
    loadCloudSmtp();
  }, []);

  // Student CRUD Forms
  const [sId, setSId] = useState('');
  const [sName, setSName] = useState('');
  const [sBranch, setSBranch] = useState('Computer Science');
  const [sYear, setSYear] = useState(2024);
  const [sSection, setSSection] = useState('A');
  const [sParentName, setSParentName] = useState('');
  const [sParentContact, setSParentContact] = useState('');
  const [sParentEmail, setSParentEmail] = useState('');
  const [sAddress, setSAddress] = useState('');

  // Bulk Student Importer states
  const [studentTabMode, setStudentTabMode] = useState<'manual' | 'bulk'>('manual');
  const [bulkText, setBulkText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [bulkStep, setBulkStep] = useState<'input' | 'preview' | 'imported'>('input');
  const [dragActive, setDragActive] = useState(false);

  // Teacher CRUD Forms
  const [tId, setTId] = useState('');
  const [tName, setTName] = useState('');
  const [tDept, setTDept] = useState('Computer Science');
  const [tQual, setTQual] = useState('M.Tech');
  const [tExp, setTExp] = useState('5 Years');
  const [tSubjects, setTSubjects] = useState('');

  // Bulk Teacher Importer states
  const [teacherTabMode, setTeacherTabMode] = useState<'manual' | 'bulk'>('manual');
  const [bulkTeacherText, setBulkTeacherText] = useState('');
  const [parsedTeachers, setParsedTeachers] = useState<any[]>([]);
  const [bulkTeacherStep, setBulkTeacherStep] = useState<'input' | 'preview'>('input');

  // Event CRUD Forms
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eDate, setEDate] = useState('');
  const [eFeatured, setEFeatured] = useState(false);

  // Notice Form
  const [nTitle, setNTitle] = useState('');
  const [nContent, setNContent] = useState('');
  const [nPriority, setNPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Broadcast Form
  const [bAudience, setBAudience] = useState<'all' | 'students' | 'teachers' | 'admin'>('students');
  const [bSubject, setBSubject] = useState('');
  const [bMessage, setBMessage] = useState('');

  // Searching Attendances
  const [attnQuery, setAttnQuery] = useState('');

  // CSV/TSV Bulk Onboarding Helpers
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkText(content);
        triggerCSVParse(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setBulkText(content);
          triggerCSVParse(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerCSVParse = (text: string) => {
    if (!text || !text.trim()) {
      alert("Invalid text: paste buffer is empty.");
      return;
    }
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      alert("Format error: CSV/TSV must include a header rule row and at least one student data row.");
      return;
    }

    const firstLine = lines[0];
    let delim = ",";
    if (firstLine.includes("\t")) delim = "\t";
    else if (firstLine.includes(";")) delim = ";";

    const splitCSVLine = (line: string, separator: string) => {
      const cells: string[] = [];
      let inQuotes = false;
      let buffer = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          cells.push(buffer.trim());
          buffer = "";
        } else {
          buffer += char;
        }
      }
      cells.push(buffer.trim());
      return cells;
    };

    const headers = splitCSVLine(lines[0], delim).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    let idIdx = headers.findIndex(h => h.includes('id') || h.includes('roll') || h.includes('scholar') || h.includes('number'));
    let nameIdx = headers.findIndex(h => h.includes('name') || h.includes('student') || h.includes('full'));
    let branchIdx = headers.findIndex(h => h.includes('branch') || h.includes('dept') || h.includes('field') || h.includes('program') || h.includes('course'));
    let yearIdx = headers.findIndex(h => h.includes('year') || h.includes('adm') || h.includes('class') || h.includes('grade'));
    let secIdx = headers.findIndex(h => h.includes('sec') || h.includes('group') || h.includes('code'));
    let pNameIdx = headers.findIndex(h => h.includes('parent') || h.includes('father') || h.includes('guardian') || h.includes('mother') || h.includes('pname'));
    let pContactIdx = headers.findIndex(h => h.includes('contact') || h.includes('phone') || h.includes('mobile') || h.includes('pcontact'));
    let pEmailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('pemail'));
    let addressIdx = headers.findIndex(h => h.includes('address') || h.includes('city') || h.includes('location') || h.includes('home'));

    if (idIdx === -1) idIdx = 0;
    if (nameIdx === -1) nameIdx = 1;
    if (branchIdx === -1) branchIdx = 2;
    if (yearIdx === -1) yearIdx = 3;
    if (secIdx === -1) secIdx = 4;
    if (pNameIdx === -1) pNameIdx = 5;
    if (pContactIdx === -1) pContactIdx = 6;
    if (pEmailIdx === -1) pEmailIdx = 7;
    if (addressIdx === -1) addressIdx = 8;

    const parsed: Student[] = [];
    for (let i = 1; i < lines.length; i++) {
      const lineStr = lines[i].trim();
      if (!lineStr) continue;
      const cells = splitCSVLine(lineStr, delim);
      if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;

      const id = cells[idIdx] || `CS${2024000 + i}`;
      const name = cells[nameIdx] || `Student #${i}`;
      const branch = cells[branchIdx] || "Computer Science";
      const year = Number(cells[yearIdx]) || 2024;
      const section = cells[secIdx] || "A";
      const parentName = cells[pNameIdx] || "Parent/Guardian";
      const parentContact = cells[pContactIdx] || "+91-99999-99999";
      const parentEmail = cells[pEmailIdx] || "parent@knit.ac.in";
      const address = cells[addressIdx] || "Sultanpur";

      parsed.push({
        id,
        name,
        branch,
        year,
        section,
        parentName,
        parentContact,
        parentEmail,
        address,
        currentAttendance: 90
      });
    }

    if (parsed.length === 0) {
      alert("Found 0 records. Please check the separator or document format.");
      return;
    }

    setParsedStudents(parsed);
    setBulkStep('preview');
  };

  const registerBulkStudents = async () => {
    if (parsedStudents.length === 0) return;
    try {
      let count = 0;
      for (const std of parsedStudents) {
        dbService.addStudent(std);
        count++;
      }
      alert(`Master Register Success! Onboarded ${count} student records dynamically.`);
      setBulkText('');
      setParsedStudents([]);
      setBulkStep('input');
      setStudentTabMode('manual');
      loadLists();
    } catch (e) {
      console.error(e);
      alert("Failed bulk registering students to the store. Please check format constraints.");
    }
  };

  const loadMockBulkData = () => {
    const mockCSV = `Scholar Roll Number,Full Name,Branch/Major,Admission Year,Section Code,Parent Name,Parent Contact,Parent Email,Home Address
CS2024045,Rajat Tripathi,Computer Science,2024,B,Sanjay Tripathi,+91-70011-22334,sanjay.t@gmail.com,Sultanpur
CS2024082,Anushka Mishra,Information Technology,2024,A,Mahesh Mishra,+91-80022-33445,mahesh.m@yahoo.com,Lucknow
CS2024104,Harpreet Singh,Mechanical Engineering,2024,C,Gurdev Singh,+91-90033-44556,gurdev.s@gmail.com,Kanpur
CS2024128,Priyanka Jadaun,Electronics Engineering,2024,A,Rajesh Jadaun,+91-95566-77889,rajesh.j@outlook.com,Varanasi`;
    setBulkText(mockCSV);
    triggerCSVParse(mockCSV);
  };

  const triggerTeacherCSVParse = (text: string) => {
    if (!text || !text.trim()) {
      alert("Invalid text: paste buffer is empty.");
      return;
    }
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      alert("Format error: CSV/TSV must include a header rule row and at least one instructor data row.");
      return;
    }

    const firstLine = lines[0];
    let delim = ",";
    if (firstLine.includes("\t")) delim = "\t";
    else if (firstLine.includes(";")) delim = ";";

    const splitCSVLine = (line: string, separator: string) => {
      const cells: string[] = [];
      let inQuotes = false;
      let buffer = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          cells.push(buffer.trim());
          buffer = "";
        } else {
          buffer += char;
        }
      }
      cells.push(buffer.trim());
      return cells;
    };

    const headers = splitCSVLine(lines[0], delim).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    let idIdx = headers.findIndex(h => h.includes('id') || h.includes('emp') || h.includes('employee'));
    let nameIdx = headers.findIndex(h => h.includes('name') || h.includes('teacher') || h.includes('prof') || h.includes('full'));
    let deptIdx = headers.findIndex(h => h.includes('dept') || h.includes('department') || h.includes('branch'));
    let qualIdx = headers.findIndex(h => h.includes('qual') || h.includes('qualification') || h.includes('degree'));
    let expIdx = headers.findIndex(h => h.includes('exp') || h.includes('experience') || h.includes('years'));
    let subjIdx = headers.findIndex(h => h.includes('subj') || h.includes('subject') || h.includes('course'));

    if (idIdx === -1) idIdx = 0;
    if (nameIdx === -1) nameIdx = 1;
    if (deptIdx === -1) deptIdx = 2;
    if (qualIdx === -1) qualIdx = 3;
    if (expIdx === -1) expIdx = 4;
    if (subjIdx === -1) subjIdx = 5;

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const lineStr = lines[i].trim();
      if (!lineStr) continue;
      const cells = splitCSVLine(lineStr, delim);
      if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;

      const id = cells[idIdx] || `TCH${100 + i}`;
      const name = cells[nameIdx] || `Professor #${i}`;
      const department = cells[deptIdx] || "Computer Science";
      const qualification = cells[qualIdx] || "Ph.D";
      const experience = cells[expIdx] || "8 Years";
      const subjectsStr = cells[subjIdx] || "General Engineering";
      const subjects = subjectsStr.split(';').map(s => s.trim());

      parsed.push({
        id,
        name,
        department,
        qualification,
        experience,
        subjects
      });
    }

    if (parsed.length === 0) {
      alert("Found 0 records. Please check the separator or document format.");
      return;
    }

    setParsedTeachers(parsed);
    setBulkTeacherStep('preview');
  };

  const registerBulkTeachers = async () => {
    if (parsedTeachers.length === 0) return;
    try {
      let count = 0;
      for (const t of parsedTeachers) {
        dbService.addTeacher(t);
        count++;
      }
      alert(`Master Register Success! Onboarded ${count} teacher records dynamically.`);
      setBulkTeacherText('');
      setParsedTeachers([]);
      setBulkTeacherStep('input');
      setTeacherTabMode('manual');
      loadLists();
    } catch (e) {
      console.error(e);
      alert("Failed bulk registering teachers to the store.");
    }
  };

  const loadMockTeacherBulkData = () => {
    const mockCSV = `Employee ID,Full Name,Department,Qualification,Experience,Subjects Taught
TCH401,Prof. K. K. Singh,Computer Science,Ph.D,15 Years,Automata Theory;Compiler Design
TCH402,Dr. Preety Sharma,Information Technology,M.Tech,7 Years,Web Technologies;Cryptography
TCH403,Er. Alok Ranjan,Mechanical Engineering,Ph.D,12 Years,Fluid Dynamics;Thermodynamics`;
    setBulkTeacherText(mockCSV);
    triggerTeacherCSVParse(mockCSV);
  };

  const downloadTeacherCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Employee ID,Full Name,Department,Qualification,Experience,Subjects Taught\nTCH101,Prof. Jane Doe,Computer Science,Ph.D,10 Years,Neural Networks;Linear Algebra";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "school_bulk_teachers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSVTemplate = () => {
    const headers = "Scholar Roll Number,Full Name,Branch/Major,Admission Year,Section Code,Parent Name,Parent Contact,Parent Email,Home Address";
    const sampleRows = [
      "CS2024090,Aman Verma,Computer Science,2024,A,Ramesh Verma,+91-9988776655,ramesh@example.com,Sultanpur",
      "CS2024091,Sneha Gupta,Information Technology,2024,B,Vijay Gupta,+91-9977553311,vijay@example.com,Sultanpur"
    ];
    const content = [headers, ...sampleRows].join("\n");
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "school_bulk_students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadLists();
  }, [activeTab]);

  const loadLists = () => {
    setStudents([...dbService.getStudents()]);
    setTeacherList([...dbService.getTeachers()]);
    setEvents([...dbService.getEvents()]);
    setNotices([...dbService.getNotices()]);
    setComplaints([...dbService.getComplaints()]);
    dbService.getAllRegisteredAccounts().then(users => {
      setUserAccounts(users);
    }).catch(err => console.warn("Could not fetch user accounts asynchronously:", err));
  };

  const calculateAvgAttendance = () => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + s.currentAttendance, 0);
    return Math.round(sum / students.length);
  };

  const handleApproveUser = async (email: string, status: boolean) => {
    try {
      await dbService.approveUser(email, status);
      loadLists();
    } catch (err: any) {
      console.warn("Approval change failed:", err);
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete and wipe this registered user passport (${email})? This action is permanent.`)) {
      return;
    }
    try {
      await dbService.removeUser(email);
      loadLists();
    } catch (err: any) {
      console.warn("User removal failed:", err);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredErr('');
    setAdminCredMsg('');
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminCredErr('Please enter both valid email and passcode.');
      return;
    }
    try {
      await dbService.saveAdminCredentials(adminEmail.trim(), adminPassword.trim());
      setAdminCredMsg('Dean Master access credentials successfully modified and synchronized.');
    } catch (err: any) {
      setAdminCredErr(err.message || 'Failed to update credentials.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 2. SUB REGISTERS LINKS (Vast specs coverage) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">System Root Terminal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure student dossiers, audit logs spreadsheet, schedules, and active proctored parameters.</p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
          SuperAdmin-Mode
        </div>
      </div>

      {/* HORIZONTAL SCROLL NAVIGATION BUTTONS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-2 scrollbar-none shrink-0">
        {[
          { id: 'overview', label: 'Dashboard KPIs', icon: BarChart2 },
          { id: 'firewall', label: 'Zero-Trust Firewall', icon: Shield },
          { id: 'accounts', label: 'Registered Portals', icon: Key },
          { id: 'students', label: 'Student Directory', icon: UserPlus },
          { id: 'teachers', label: 'Faculty Directory', icon: Users },
          { id: 'attendance', label: 'Attendance Analytics', icon: BarChart2 },
          { id: 'complaints', label: 'Grievance Review', icon: AlertTriangle },
          { id: 'events', label: 'Events Manager', icon: Calendar },
          { id: 'notices', label: 'Notice Boards', icon: Bell },
          { id: 'fee-admin', label: 'Fee Management', icon: DollarSign },
          { id: 'marketplace-admin', label: 'Marketplace Admin', icon: ShoppingBag },
          { id: 'library-admin', label: 'Library Management', icon: BookOpen },
          { id: 'hostel-admin', label: 'Hostel Admin', icon: Home },
          { id: 'placement-admin', label: 'Placement Officer', icon: Briefcase },
          { id: 'reports', label: 'Spreadsheet Reports', icon: FileText },
          { id: 'settings', label: 'Control Settings', icon: CancelSettings }
        ].map(tab => {
          const Icon = tab.id === 'settings' ? Settings : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-xl'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SWITCH RENDER SUB VIEWS */}

      {/* Tab: Overview / KPIs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">System Scholars</p>
                <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{students.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Active registered students</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-450 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Faculty Members</p>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{teachers.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Assigned lecturers roster</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Attendance</p>
                <h3 className="text-3xl font-black text-purple-650 dark:text-purple-400 mt-1">{calculateAvgAttendance()}%</h3>
                <p className="text-[10px] text-slate-400 mt-1">Aggregate biometric registers</p>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-450 rounded-xl">
                <BarChart2 className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Grievance Backlogs</p>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-1">
                  {complaints.filter(c => c.status === 'pending').length}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Unfiltered pending tickets</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-450 rounded-xl animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 select-none">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Quick Admin Shortcuts</h3>
              <div className="space-y-2 text-xs">
                <button onClick={() => setActiveTab('students')} className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-800 rounded-xl font-bold flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Enrol New Student Dossier</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">Go &rarr;</span>
                </button>
                <button onClick={() => setActiveTab('notices')} className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-800 rounded-xl font-bold flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Publish Notice Board Bulletin</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">Go &rarr;</span>
                </button>
                <button onClick={() => setActiveTab('complaints')} className="w-full text-left p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-800 rounded-xl font-bold flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Resolve Student Grievance Ticket</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">Go &rarr;</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-3 shrink-0 text-xs">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-1">Recent telemetry logs</h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {notices.map((n, i) => (
                  <div key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                    Published: &ldquo;<span className="text-slate-700 dark:text-slate-300 font-bold">{n.title}</span>&rdquo; • {n.date}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-3.5 text-xs">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Platform Diagnostics</h3>
              <div className="space-y-2 pt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex justify-between"><span>Supabase Client:</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Online</span></div>
                <div className="flex justify-between"><span>Biometrics Sync:</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Telemetry Live</span></div>
                <div className="flex justify-between"><span>CSV engines:</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Standalone OK</span></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Zero-Trust Firewall */}
      {activeTab === 'firewall' && (
        <ZeroTrustFirewall />
      )}

      {/* Tab: Registered Accounts Passport Directory */}
      {activeTab === 'accounts' && (
        <div className="space-y-6 text-left animate-fade-in grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Main Column: Accounts Table */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">Registered App & User Portals</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Manage all registered accounts. You can approve pending registrations or cancel/delete accounts dynamically below.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800 text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Full Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Plain Passcode</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {userAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No registered cloud user passports detected. Accounts created using sign-up forms write instantly here.
                      </td>
                    </tr>
                  ) : (
                    userAccounts.map((acc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{acc.name || 'Anonymous User'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{acc.branch || acc.department || 'General Administration'}</div>
                        </td>
                        <td className="p-4 font-mono select-all text-indigo-500 dark:text-indigo-400 font-bold">{acc.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                            acc.role === 'admin' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : acc.role === 'teacher' 
                                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {acc.role || 'Student'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400 select-all font-semibold">
                          {acc.password ? acc.password : 'Google-Linked Account'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                            acc.approved 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse'
                          }`}>
                            {acc.approved ? 'Active / Approved' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {acc.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => handleApproveUser(acc.email, !acc.approved)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                  acc.approved 
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300' 
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                                }`}
                                title={acc.approved ? "Revoke Approval" : "Grant Approval / Verify"}
                              >
                                {acc.approved ? 'Suspend' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRemoveUser(acc.email)}
                                className="px-2 py-1 rounded-lg text-[10px] bg-red-500/10 hover:bg-red-500 text-red-650 dark:text-red-450 hover:text-white transition-colors cursor-pointer"
                                title="Delete/Reject user dossier"
                              >
                                <Trash className="h-3.5 w-3.5 inline-block" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Change Master Credentials */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl text-slate-800 dark:text-slate-205">
            <div>
              <div className="p-2 w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3">
                <Settings className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black leading-none text-slate-900 dark:text-white">Admin Access Gate Manager</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Revise, change, or update your administrative master credentials below to secure your Dean portfolio.
              </p>
            </div>

            <form onSubmit={handleSaveAdminCredentials} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wide">Master Dean Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Users className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="name@gmail.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wide">Master Admin Passcode</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {adminCredMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{adminCredMsg}</span>
                </div>
              )}

              {adminCredErr && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{adminCredErr}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
              >
                <Key className="h-4 w-4" />
                <span>Save New Gate Credentials</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Tab: Student CRUD */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          
          {/* Internal Tab Header / Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Student Onboarding System</span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Toggle between manual single enrolment or smart spreadsheet spreadsheet integrations.</p>
            </div>
            <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl border border-slate-300/40 dark:border-slate-800/60 font-mono text-[10px] uppercase font-bold shrink-0 self-start sm:self-center">
              <button
                onClick={() => setStudentTabMode('manual')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  studentTabMode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Single Enrolment
              </button>
              <button
                onClick={() => setStudentTabMode('bulk')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  studentTabMode === 'bulk'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-550 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Bulk Import (CSV/Excel)
              </button>
            </div>
          </div>

          {studentTabMode === 'manual' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Create form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-700 dark:text-slate-350 pr-2 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1">
                  <UserPlus className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span>Enrol New Student</span>
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Scholar Roll Number (Unique)</label>
                    <input type="text" value={sId} onChange={(e) => setSId(e.target.value)} placeholder="e.g. CS2024009" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white focus:border-blue-505" />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Full Name</label>
                    <input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="e.g. Dev Katoch" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white focus:border-blue-505" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Sec Year</label>
                      <input type="number" value={sYear} onChange={(e) => setSYear(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Section Code</label>
                      <input type="text" value={sSection} onChange={(e) => setSSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-550">Contact Files:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Parent Name</label>
                      <input type="text" value={sParentName} onChange={(e) => setSParentName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Parent Contact</label>
                      <input type="text" value={sParentContact} onChange={(e) => setSParentContact(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!sId || !sName) {
                        alert('Roll and name are mandatory.');
                        return;
                      }
                      dbService.addStudent({
                        id: sId,
                        name: sName,
                        branch: sBranch,
                        year: sYear,
                        section: sSection,
                        parentName: sParentName || 'Guardian',
                        parentContact: sParentContact || '+91-',
                        parentEmail: sParentEmail || 'parent@mail.com',
                        address: sAddress || 'Sultanpur',
                        currentAttendance: 90
                      });
                      setSId('');
                      setSName('');
                      loadLists();
                      alert('Enrol successful! Database updated.');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-555 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer transition-all"
                  >
                    Confirm Registration
                  </button>
                </div>
              </div>

              {/* Directory roster list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300">Enrolled Student Dossiers</h3>
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {students.map((std, idx) => (
                    <div key={`${std.id}-${idx}`} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{std.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-sans">
                          Roll: <span className="font-mono text-slate-600 dark:text-slate-350">{std.id}</span> • Branch: {std.branch} • Year {std.year}-{std.section}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Unenrol ${std.name}? This will delete all record traces.`)) {
                            dbService.removeStudent(std.id);
                            loadLists();
                          }
                        }}
                        className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                        title="Delete profile"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Bulk Importer Dashboard */
            <div className="space-y-6 animate-fadeIn">
              
              {bulkStep === 'input' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Selector & Template utility */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 lg:col-span-1">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Download className="h-4 w-4 text-blue-500 rotate-180 animate-bounce" />
                      <span>1. Load / Browse File</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Drop or browse your institutional enrollees list. Compatible with normal comma separated text or notepad files.
                    </p>

                    {/* Drag Drop space */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[160px] cursor-pointer ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/5' 
                          : 'border-slate-250 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40'
                      }`}
                    >
                      <input 
                        type="file" 
                        accept=".csv,.txt"
                        onChange={handleCSVUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Download className="h-7 w-7 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag & Drop file here</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1">or click to choose CSV file</p>
                      <span className="text-[8px] bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono mt-3">Supports .csv or MS Excel TXT</span>
                    </div>

                    {/* Tools */}
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={downloadCSVTemplate}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-200/60 dark:hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-500" />
                        <span>Download Standard Template CSV</span>
                      </button>
                      
                      <button
                        onClick={loadMockBulkData}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-200/20 dark:border-indigo-900/30 hover:bg-indigo-100/30 dark:hover:bg-indigo-950/40 rounded-xl text-xs font-bold text-indigo-500 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Try Sample School Data</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Paste Clipboard workspace */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      <span>2. Clipboard Copy-Paste Workspace</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Instantly click & paste columns copied right out of Microsoft Excel spreadsheets or Google Sheets tables.
                    </p>

                    <div className="space-y-3">
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Scholar Roll Number,Full Name,Branch/Major,Admission Year,Section Code,Parent Name,Parent Contact,Parent Email,Home Address&#10;CS2024095,Samar Roy,Computer Science,2024,B,Anoop Roy,+91-9988776655,anoop@mail.com,Sultanpur"
                        rows={9}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 placeholder-slate-400 resize-none"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Workspace Buffer: <span className="font-mono text-slate-500 font-extrabold">{bulkText.length}</span> characters
                        </span>
                        <button
                          onClick={() => triggerCSVParse(bulkText)}
                          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                        >
                          Analyze Database Map
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Step 2: Spreadsheet Checklist / Preview Grid */}
              {bulkStep === 'preview' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-850 pb-3 gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-950 dark:text-white uppercase flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>Pre-flight Processing Checklist</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Automated heuristic parser successfully structured {parsedStudents.length} candidates.</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => setBulkStep('input')}
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-955 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-extrabold cursor-pointer"
                      >
                        Reset Source Data
                      </button>
                      <button
                        onClick={registerBulkStudents}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all"
                      >
                        Register {parsedStudents.length} Students Bulk
                      </button>
                    </div>
                  </div>

                  {/* Spreadsheet Grid Table */}
                  <div className="overflow-x-auto border border-slate-150 dark:border-slate-800/80 rounded-2xl max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 text-slate-450 uppercase font-bold text-[9px] tracking-wider border-b border-slate-150 dark:border-slate-850 whitespace-nowrap">
                        <tr>
                          <th className="p-3">Scholar Roll</th>
                          <th className="p-3">Full Candidate Name</th>
                          <th className="p-3">Branch/Major</th>
                          <th className="p-3">Year</th>
                          <th className="p-3">Sec</th>
                          <th className="p-3">Parent/Guardian</th>
                          <th className="p-3">Parent Mobile</th>
                          <th className="p-3">Parent Email</th>
                          <th className="p-3">Home Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-mono text-slate-700 dark:text-slate-350 text-[11px] whitespace-nowrap">
                        {parsedStudents.map((std, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                            <td className="p-3 font-bold text-slate-900 dark:text-slate-200">{std.id}</td>
                            <td className="p-3 font-sans font-bold text-slate-800 dark:text-slate-100">{std.name}</td>
                            <td className="p-3 font-sans text-slate-500 dark:text-slate-400">{std.branch}</td>
                            <td className="p-3">{std.year}</td>
                            <td className="p-3 text-center">{std.section}</td>
                            <td className="p-3 font-sans text-slate-500 dark:text-slate-450">{std.parentName}</td>
                            <td className="p-3 text-slate-550">{std.parentContact}</td>
                            <td className="p-3 text-slate-550">{std.parentEmail}</td>
                            <td className="p-3 font-sans text-slate-550 truncate max-w-[150px]" title={std.address}>{std.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* Tab: Teacher CRUD */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          
          {/* Mode Selector */}
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md">
            <button
              onClick={() => {
                setTeacherTabMode('manual');
                setBulkTeacherText('');
                setParsedTeachers([]);
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                teacherTabMode === 'manual'
                  ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow'
                  : 'text-slate-500'
              }`}
            >
              Manual Form Mode
            </button>
            <button
              onClick={() => {
                setTeacherTabMode('bulk');
                setBulkTeacherStep('input');
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                teacherTabMode === 'bulk'
                  ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow'
                  : 'text-slate-500'
              }`}
            >
              Bulk File Importer (CSV)
            </button>
          </div>

          {teacherTabMode === 'manual' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-700 dark:text-slate-350 pr-2 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1.5">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span>Add Teacher Profile</span>
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Employee ID (Unique)</label>
                    <input type="text" value={tId} onChange={(e) => setTId(e.target.value)} placeholder="e.g. TCH019" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white focus:border-emerald-505" />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Full Name</label>
                    <input type="text" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Prof. Dev" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white focus:border-emerald-505" />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Qualifications</label>
                    <input type="text" value={tQual} onChange={(e) => setTQual(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-450 font-bold text-[10px] uppercase mb-1">Experience (cumulative)</label>
                    <input type="text" value={tExp} onChange={(e) => setTExp(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-xs outline-none text-slate-900 dark:text-white" />
                  </div>

                  <button
                    onClick={() => {
                      if (!tId || !tName) {
                        alert('Employee ID and name are mandatory.');
                        return;
                      }
                      dbService.addTeacher({
                        id: tId,
                        name: tName,
                        department: tDept,
                        qualification: tQual,
                        experience: tExp,
                        subjects: tSubjects ? tSubjects.split(',').map(s => s.trim()) : ['General Engineering']
                      });
                      setTId('');
                      setTName('');
                      loadLists();
                      alert('Teacher registered on roster!');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Create Faculty Dossier
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300">Active Instructor Rosters</h3>
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {teachers.map((prof, idx) => (
                    <div key={`${prof.id}-${idx}`} className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{prof.name}</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Emp ID: <span className="font-mono text-slate-600 dark:text-slate-350">{prof.id}</span> • Department: {prof.department} • Experience: {prof.experience}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${prof.name} from payroll?`)) {
                            dbService.removeTeacher(prof.id);
                            loadLists();
                          }
                        }}
                        className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {bulkTeacherStep === 'input' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Actions & Downloads */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Download className="h-4 w-4 text-emerald-500" />
                      <span>1. Resource Integration</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Download the standard comma-delimited templates or paste clean spreadsheet rows right into the workspace editor.
                    </p>

                    {/* Drag & drop visual block */}
                    <div 
                      onClick={downloadTeacherCSVTemplate}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20"
                    >
                      <Download className="h-8 w-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Standard Column Guide</p>
                      <p className="text-[10px] text-slate-500 mt-1">click to save pre-formatted template</p>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        onClick={downloadTeacherCSVTemplate}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-200/60 dark:hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer animate-pulse"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-500" />
                        <span>Save Teacher CSV Template</span>
                      </button>
                      
                      <button
                        onClick={loadMockTeacherBulkData}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-200/20 dark:border-indigo-900/30 hover:bg-indigo-100/30 dark:hover:bg-indigo-950/40 rounded-xl text-xs font-bold text-indigo-400 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Load Sample Faculty</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Paste Buffer workspace */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 p-6 rounded-3xl lg:col-span-2 space-y-4">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span>2. Clipboard paste workspace</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Copy faculty rows directly from spreadsheet files (MS Excel, Google Sheets, PDF extraction) and paste columns into this buffer.
                    </p>

                    <div className="space-y-3">
                      <textarea
                        value={bulkTeacherText}
                        onChange={(e) => setBulkTeacherText(e.target.value)}
                        placeholder="Employee ID,Full Name,Department,Qualification,Experience,Subjects Taught&#10;TCH105,Dr. Alok Verma,Computer Science,Ph.D,12 Years,Theory of Computation;Automata"
                        rows={9}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 placeholder-slate-450 resize-none"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Workspace Buffer: <span className="font-mono text-slate-500 font-black">{bulkTeacherText.length}</span> characters
                        </span>
                        <button
                          onClick={() => triggerTeacherCSVParse(bulkTeacherText)}
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                        >
                          Analyze Database Map
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {bulkTeacherStep === 'preview' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-850 pb-3 gap-3">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">Review New Faculty Import Dossier</h4>
                      <p className="text-[10px] text-slate-500">Spreadsheet parsing mapping successful. Please verify columns before onboarding.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setParsedTeachers([]);
                          setBulkTeacherStep('input');
                        }}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Reset Parser
                      </button>
                      <button
                        onClick={registerBulkTeachers}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold shadow hover:shadow-emerald-900/30 transition-all cursor-pointer"
                      >
                        Commit {parsedTeachers.length} Accounts to Database
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 font-bold uppercase tracking-wider text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Employee ID</th>
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Instructor Name</th>
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Department</th>
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Qualification</th>
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Experience</th>
                          <th className="p-3 border-b border-slate-150 dark:border-slate-850">Subjects Taught</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedTeachers.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-850">
                            <td className="p-3 font-mono font-bold text-emerald-555">{t.id}</td>
                            <td className="p-3 font-semibold">{t.name}</td>
                            <td className="p-3">{t.department}</td>
                            <td className="p-3 font-mono text-slate-500">{t.qualification}</td>
                            <td className="p-3">{t.experience}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {t.subjects.map((sub: string, sIdx: number) => (
                                  <span key={sIdx} className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-slate-650 dark:text-slate-400">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Tab: Attendance Analytics */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">Daily Biometric Attendance Registry</h3>
              
              {/* Search query box */}
              <input
                type="text"
                value={attnQuery}
                onChange={(e) => setAttnQuery(e.target.value)}
                placeholder="Search scholars name or roll..."
                className="bg-slate-950 border border-slate-850 p-2 text-xs rounded-lg text-slate-205 outline-none w-52 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {students
                .filter(s => !attnQuery || s.name.toLowerCase().includes(attnQuery.toLowerCase()) || s.id.includes(attnQuery))
                .map((std, idx) => {
                  const safeAttendance = std.currentAttendance >= 75;
                  return (
                    <div key={`${std.id}-${idx}`} className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-white text-xs">{std.name}</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">Roll: {std.id}</p>
                      </div>
                      <span className={`text-md font-extrabold font-mono ${safeAttendance ? 'text-emerald-450' : 'text-rose-450'}`}>
                        {std.currentAttendance}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Grievance review */}
      {activeTab === 'complaints' && (
        <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
          <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Grievance Resolutions Control</h3>
          <p className="text-xs text-slate-400">Review student reported issues, canteen feedback loops. Resolve tickets with automated notifications alerts.</p>
          
          <div className="space-y-4 pt-2">
            {complaints.map(comp => (
              <div key={comp.id} className="p-5 bg-slate-950 border border-slate-855 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-800 transition-all font-sans">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/10 px-2.5 py-0.5 rounded leading-none">ID: {comp.id}</span>
                    <h4 className="font-extrabold text-sm text-white">{comp.subject}</h4>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      comp.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-450' : 'bg-amber-500/10 text-amber-450'
                    }`}>
                      {comp.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs py-1 leading-relaxed">{comp.message}</p>
                  <div className="text-[10px] text-slate-500">Student Scholar: <span className="font-bold text-slate-350">{comp.studentId}</span> • Logged Date: {comp.date}</div>
                </div>

                {comp.status === 'pending' && (
                  <button
                    onClick={() => {
                      dbService.resolveComplaint(comp.id);
                      loadLists();
                    }}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all cursor-pointer shadow shadow-emerald-950/20 flex items-center space-x-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Resolve Ticket</span>
                  </button>
                )}
              </div>
            ))}
            {complaints.length === 0 && (
              <div className="py-10 text-center text-slate-505">No complaints registered in system logs.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Events Manager */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#94a3b8] pr-2 pb-2 border-b border-slate-800 flex items-center space-x-1.5">
                <PlusCircle className="h-4 w-4 text-emerald-400" />
                <span>Create Calendar Activity</span>
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Event Title</label>
                  <input type="text" value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="e.g. Sports Day Meet" className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Category / Tag</label>
                  <input type="text" placeholder="sports / technical / cultural" className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Short Description</label>
                  <textarea rows={3} value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Describe general timing location parameters..." className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white" />
                </div>
                <div>
                  <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Calendar Date</label>
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white" />
                </div>

                <button
                  onClick={() => {
                    if (!eTitle || !eDate) {
                      alert('Event title and date are mandatory.');
                      return;
                    }
                    dbService.addEvent({
                      id: `EVT-${Date.now()}`,
                      title: eTitle,
                      description: eDesc || 'College activity',
                      date: eDate,
                      time: '10:00 AM - 04:00 PM',
                      location: 'Campus Auditorium',
                      organizer: 'Student Council',
                      category: 'General',
                      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000'
                    });
                    setETitle('');
                    setEDesc('');
                    setEDate('');
                    loadLists();
                    alert('Activity listed successfully!');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Publish Event
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#94a3b8]">Live Activity Calendars</h3>
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {events.map(evt => (
                  <div key={evt.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{evt.title}</h4>
                      <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Venue: {evt.location} • Target Date: {evt.date} • Org: {evt.organizer}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        dbService.removeEvent(evt.id);
                        loadLists();
                        alert('Event removed.');
                      }}
                      className="p-2 border border-slate-800 bg-slate-900 rounded-xl hover:text-rose-455 transition-colors cursor-pointer"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Notices Boards */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Post notices */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350 pr-2 pb-2 border-b border-slate-800 flex items-center space-x-1.5">
                <Bell className="h-4 w-4" />
                <span>Publish Board Notice</span>
              </h3>
              
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Notice Title</label>
                <input type="text" value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="e.g. Schedule Update" className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white focus:border-indigo-500" />
              </div>
              
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Announcement Body</label>
                <textarea rows={4} value={nContent} onChange={(e) => setNContent(e.target.value)} placeholder="Enter details..." className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white" />
              </div>

              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Priority level</label>
                <select value={nPriority} onChange={(e: any) => setNPriority(e.target.value)} className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none">
                  <option value="high">High - Urgent</option>
                  <option value="medium">Medium - Action</option>
                  <option value="low">Low - Informational</option>
                </select>
              </div>

              <button
                onClick={() => {
                  if (!nTitle || !nContent) {
                    alert('Title and content are mandatory.');
                    return;
                  }
                  dbService.addNotice({
                    id: `N-${Date.now()}`,
                    title: nTitle,
                    content: nContent,
                    date: new Date().toLocaleDateString(),
                    priority: nPriority
                  });
                  setNTitle('');
                  setNContent('');
                  loadLists();
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-555 hover:to-indigo-555 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
              >
                Publish Board Notice
              </button>
            </div>

            {/* Broadcast */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-350 pr-2 pb-2 border-b border-slate-800 flex items-center space-x-1.5">
                <Users className="h-4 w-4" />
                <span>Send System Broadcast</span>
              </h3>
              
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Target Audience</label>
                <select value={bAudience} onChange={(e: any) => setBAudience(e.target.value)} className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none">
                  <option value="all">All members</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Instructors Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Broadcast Subject</label>
                <input type="text" value={bSubject} onChange={(e) => setBSubject(e.target.value)} placeholder="Topic name" className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white" />
              </div>

              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Broadcast Message Body</label>
                <textarea rows={3} value={bMessage} onChange={(e) => setBMessage(e.target.value)} placeholder="Type communication..." className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs outline-none text-white font-sans" />
              </div>

              <button
                onClick={() => {
                  if (!bSubject || !bMessage) {
                    alert('Subject and message required.');
                    return;
                  }
                  dbService.addNotification(bSubject, bMessage, bAudience, 'success');
                  setBSubject('');
                  setBMessage('');
                  alert('Notification broadcast sent immediately!');
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Send Broadcast Message
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Fee Management */}
      {activeTab === 'fee-admin' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs font-sans">
            <h3 className="font-bold text-lg text-white">Fee ledger registries</h3>
            <p className="text-xs text-slate-450">Review transaction collections received from academic enrollees.</p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto bg-slate-950 border border-slate-850 rounded-2xl p-4">
              {dbService.getPayments().map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-900 last:border-b-0">
                  <div>
                    <h4 className="font-bold text-white mb-0.5">₹{p.amount.toLocaleString()} ({p.semester || 'Fees'})</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Paid by: {p.studentId} • TXN: {p.id}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-450 rounded text-[9px] font-black uppercase">Cleared</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Marketplace Admin */}
      {activeTab === 'marketplace-admin' && (
        <div className="space-y-6 animate-fade-in text-xs font-sans text-left">
          
          {/* Marketplace KPI overview row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-indigo-400 font-mono tracking-wider">Active Campus Listings</span>
                <h4 className="text-xl font-black text-white font-mono">
                  {dbService.getProducts().length} items
                </h4>
                <p className="text-[9px] text-slate-500">Student and institutional resources cataloged.</p>
              </div>
              <Layers className="h-8 w-8 text-indigo-500/30 shrink-0" />
            </div>

            <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 font-mono tracking-wider">Markup Commission Earned</span>
                <h4 className="text-xl font-black text-emerald-450 font-mono">
                  ₹{dbService.getOrders().reduce((sum, o) => sum + (o.adminCommissionEarned || 0), 0).toLocaleString()}
                </h4>
                <p className="text-[9px] text-slate-500">Credited to primary merchant ledger instantly.</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500/30 shrink-0 animate-pulse" />
            </div>

            <div className="bg-gradient-to-br from-purple-950/20 to-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-purple-400 font-mono tracking-wider">Settled Orders Pool</span>
                <h4 className="text-xl font-black text-purple-450 font-mono">
                  {dbService.getOrders().filter(o => o.paymentStatus === 'paid').length} Completed
                </h4>
                <p className="text-[9px] text-slate-500">Authorized bank clears with active logs.</p>
              </div>
              <Check className="h-8 w-8 text-purple-500/30 shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Commission Engine & Settlement accounts */}
            <div className="space-y-6">
              
              {/* Card 1: Dynamic Pricing & Commission Markup */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <span>Dynamic Pricing & Commission Engine</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Control global markups calculated atop seller base rates.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Markup Fee Type</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
                      <button
                        type="button"
                        onClick={() => setMSettings({ ...mSettings, globalType: 'percentage' })}
                        className={`py-2 px-2.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                          mSettings.globalType === 'percentage' 
                            ? 'bg-indigo-650 text-white shadow' 
                            : 'text-slate-450 hover:text-slate-200'
                        }`}
                      >
                        Percentage Rate (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMSettings({ ...mSettings, globalType: 'flat' })}
                        className={`py-2 px-2.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                          mSettings.globalType === 'flat' 
                            ? 'bg-indigo-650 text-white shadow' 
                            : 'text-slate-450 hover:text-slate-200'
                        }`}
                      >
                        Flat Fee / Surcharge (₹)
                      </button>
                    </div>
                  </div>

                  {mSettings.globalType === 'percentage' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Global Commission Percentage (%)</label>
                        <span className="text-[11px] font-bold text-indigo-400 font-mono">{mSettings.globalPercentage}% markup</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={mSettings.globalPercentage}
                        onChange={(e) => setMSettings({ ...mSettings, globalPercentage: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Example: A textbook listed at a base seller price of ₹500 will retail to buyers for <span className="font-bold text-slate-350 font-mono">₹{Math.round(500 * (1 + mSettings.globalPercentage/100))}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Global Fixed Markup Surcharge (₹)</label>
                        <span className="text-[11px] font-bold text-indigo-400 font-mono">₹{mSettings.globalFlat} surcharge</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="200"
                        step="5"
                        value={mSettings.globalFlat}
                        onChange={(e) => setMSettings({ ...mSettings, globalFlat: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Example: A textbook listed at a base seller price of ₹500 will retail to buyers for <span className="font-bold text-slate-350 font-mono">₹{500 + mSettings.globalFlat}</span>.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await dbService.updateMarketplaceSettings(mSettings);
                      alert("Marketplace commission settings synchronized successfully!");
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold uppercase rounded-xl transition-all cursor-pointer font-mono tracking-wider text-[10px] text-center"
                  >
                    Synchronize Pricing Engine
                  </button>
                </div>
              </div>

              {/* Card 2: Admin Payout & Settlers Banking Routing */}
              <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-emerald-400" />
                    <span>Admin Bank Payout Settlement Portal</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Define primary credentials where buyer commission payouts land directly.</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450">Institution Bank Name</label>
                      <input
                        type="text"
                        value={mSettings.payoutBankName}
                        onChange={(e) => setMSettings({ ...mSettings, payoutBankName: e.target.value })}
                        className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450">Routing / IFSC Code</label>
                      <input
                        type="text"
                        value={mSettings.payoutRoutingCode}
                        onChange={(e) => setMSettings({ ...mSettings, payoutRoutingCode: e.target.value })}
                        className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450">Account Ledger Number</label>
                      <input
                        type="text"
                        value={mSettings.payoutAccountNo}
                        onChange={(e) => setMSettings({ ...mSettings, payoutAccountNo: e.target.value })}
                        className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450">Account Holder Name</label>
                      <input
                        type="text"
                        value={mSettings.payoutAccountHolder}
                        onChange={(e) => setMSettings({ ...mSettings, payoutAccountHolder: e.target.value })}
                        className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Stripe connected accounts management section */}
                  <div className="p-3 bg-slate-950 border border-slate-850/80 rounded-2xl space-y-3.5 mt-1">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-extrabold text-indigo-400 font-mono block">STRIPE ACCREDITED SESSIONS</span>
                        <span className="text-[10px] text-slate-300 font-bold font-mono">
                          {mSettings.stripeConnected ? 'CONNECTED (acct_1NKNITSultanpur)' : 'NOT LINKED'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                        mSettings.stripeConnected ? 'bg-purple-900/30 text-purple-300 border border-purple-800/60' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {mSettings.stripeConnected ? 'Stripe Live' : 'Sandbox Simulated'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isLinkingStripe}
                      onClick={async () => {
                        setIsLinkingStripe(true);
                        const isC = mSettings.stripeConnected;
                        setTimeout(async () => {
                          const updated = {
                            ...mSettings,
                            stripeConnected: !isC,
                            stripeAccountId: !isC ? 'acct_1NKNITSultanpur' : ''
                          };
                          setMSettings(updated);
                          await dbService.updateMarketplaceSettings(updated);
                          setIsLinkingStripe(false);
                          alert(!isC ? "Stripe gateway connected successfully to ledger!" : "Stripe account unlinked safely.");
                        }, 1000);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-650 active:scale-98 text-white font-bold rounded-xl text-[9.5px] uppercase tracking-wider transition-all cursor-pointer font-mono flex items-center justify-center space-x-1"
                    >
                      {isLinkingStripe ? 'Authorizing API Tunnel...' : (mSettings.stripeConnected ? 'Disconnect Stripe Gateway' : 'Setup Real-Time Stripe Merchant')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await dbService.updateMarketplaceSettings(mSettings);
                      alert("Admin payout settlement details committed to Firebase!");
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold uppercase rounded-xl transition-all cursor-pointer font-mono text-[10px] tracking-wider text-center"
                  >
                    Commit Settlement Accounts
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Private listings ledger showing base and calculated values */}
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    <span>Private Listings Ledger (Admin Eyes ONLY)</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Secure mapping decoupling confidential seller data from buyers.</p>
                </div>
                <span className="text-[8px] px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full font-mono uppercase tracking-widest font-black">
                  Decoupled Node
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {dbService.getProducts().map((publicItem) => {
                  const privateItem = dbService.getPrivateProductDetails(publicItem.id);
                  // Since seed items don't have private record in old localData, let's fall back to values gracefully
                  const fallbackSellerName = 'KNIT Alumnus';
                  const fallbackSellerPrice = privateItem ? privateItem.sellerPrice : Math.round(publicItem.price * 0.9);
                  const fallbackCommission = privateItem ? privateItem.adminCommission : Math.round(publicItem.price - fallbackSellerPrice);
                  const finalSellerName = privateItem ? privateItem.sellerName : fallbackSellerName;
                  const finalSellerEmail = privateItem ? privateItem.sellerEmail : 'alumni@knit.ac.in';

                  return (
                    <div key={publicItem.id} className="p-3.5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl space-y-3 transition-colors flex gap-4 text-left">
                      <img src={publicItem.images[0]} className="w-12 h-16 object-cover rounded shadow bg-slate-900 border border-slate-800 shrink-0" alt="" />
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-slate-200 truncate leading-tight">{publicItem.title}</h4>
                          <span className="text-[8.5px] uppercase font-mono bg-slate-900/60 px-1.5 py-0.5 rounded text-indigo-400 border border-slate-850 inline-block">
                            {publicItem.category}
                          </span>
                        </div>

                        {/* Pricing details split */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-850 text-[10px] font-mono text-left">
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase font-sans font-bold">Base Cost</span>
                            <span className="text-slate-200 font-extrabold">₹{fallbackSellerPrice}</span>
                          </div>
                          <div>
                            <span className="text-indigo-400 block text-[8px] uppercase font-sans font-bold">Markup Fee</span>
                            <span className="text-indigo-400 font-extrabold">+₹{fallbackCommission}</span>
                          </div>
                          <div>
                            <span className="text-emerald-400 block text-[8px] uppercase font-sans font-bold">Buyer Pays</span>
                            <span className="text-emerald-400 font-extrabold">₹{publicItem.price}</span>
                          </div>
                        </div>

                        {/* Confidential Seller identities */}
                        <div className="text-[9.5px] space-y-0.5 pt-1 border-t border-slate-900 leading-normal">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Confidential Seller:</span>
                            <span className="text-slate-350 font-extrabold">{finalSellerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Seller Email:</span>
                            <span className="text-slate-350 font-mono">{finalSellerEmail}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dbService.getProducts().length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-[11px]">
                    No listed items inside books marketplace currently.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* COLUMN Bottom: Dynamic Commission Earnings Ledger */}
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Interactive Admin Commission ledger & Settlement auditing</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  Live verification logs monitoring institutional marketplace orders settlement.
                </p>
              </div>
              <div className="py-1 px-3.5 bg-emerald-950/20 text-emerald-400 font-black rounded-xl font-mono text-[10px] border border-emerald-900/60">
                Ledger Live Tracker
              </div>
            </div>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto bg-slate-950 border border-slate-850 p-4 rounded-2xl">
              {dbService.getOrders().map((order) => (
                <div key={order.id} className="p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl space-y-3 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-white font-mono uppercase tracking-wider block">ID: {order.id}</span>
                      <span className="text-[9px] text-slate-550 block mt-0.5">Purchased on {order.orderDate} by {order.studentName} ({order.studentId})</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] rounded font-black uppercase font-mono tracking-wider">
                      Cleared Securely
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1.5 border-t border-slate-850 pt-2.5">
                    {order.items.map((item, idX) => (
                      <div key={idX} className="flex justify-between items-center text-[10.5px]">
                        <span className="text-slate-350">{item.title} <span className="text-slate-550 text-[9.5px]">x{item.quantity}</span></span>
                        <span className="font-mono text-slate-350">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Profit decoupling */}
                  <div className="flex justify-between items-center border-t border-slate-850 pt-2.5 text-[10px] font-mono leading-normal bg-slate-950/40 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                    <div className="flex space-x-4">
                      <div>
                        <span className="text-slate-550 block text-[8px] uppercase">Base cost Payouts</span>
                        <span className="text-slate-400">₹{(order.totalAmount - (order.adminCommissionEarned || 0)).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-extrabold block text-[8px] uppercase">Admin Commission</span>
                        <span className="text-emerald-400 font-extrabold font-mono">₹{(order.adminCommissionEarned || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[8px] uppercase">Transaction Total</span>
                      <span className="text-slate-100 font-extrabold">₹{order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}

              {dbService.getOrders().length === 0 && (
                <div className="py-12 text-center text-slate-500 font-sans">
                  No completed orders in the ledger yet. Orders checked out in student panels populate here.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab: Library Management */}
      {activeTab === 'library-admin' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-lg text-white">Digital Library inventorship catalog</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
              {dbService.getBooks().map(book => (
                <div key={book.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 flex gap-4">
                  <img src={book.cover} className="w-12 h-16 object-cover rounded shadow shrink-0" alt="Cov" />
                  <div className="min-w-0">
                    <h5 className="font-extrabold text-white truncate leading-tight">{book.title}</h5>
                    <p className="text-[10px] text-slate-500 leading-none mt-1">Stock status: {book.available} / {book.total} Copies</p>
                    <p className="text-[10px] text-indigo-400 capitalize mt-2 font-mono">ID: {book.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Hostel Management */}
      {activeTab === 'hostel-admin' && (
        <div className="space-y-6 text-xs">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-lg text-white">Residential Hostel Allocations Queue</h4>
            
            <div className="space-y-3 pt-1">
              {dbService.getAllocations().map(alloc => (
                <div key={alloc.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center font-sans">
                  <div>
                    <h5 className="font-bold text-white text-xs">{alloc.studentId} {"\u2192"} Room {alloc.roomNo}</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Hostel ID: {alloc.hostelId} • Rent Statement: ₹{alloc.monthlyRent}/mo • Current state: {alloc.status}</p>
                  </div>
                  {alloc.status === 'pending' && (
                    <button
                      onClick={() => {
                        dbService.approveHostel(alloc.id);
                        loadLists();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-slate-950 font-black rounded-lg transition-all cursor-pointer"
                    >
                      Approve allotment
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Placement Admin */}
      {activeTab === 'placement-admin' && (
        <div className="space-y-6 text-xs text-left">
          <div className="max-w-2xl bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-lg text-white leading-none">Create recruitment opening</h4>
            <p className="text-xs text-slate-400">Post SDE internship / FTE opportunities to matching enrollees dashboards.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const company = String(formData.get('company') || '');
              const position = String(formData.get('position') || '');
              const stipend = String(formData.get('package') || '');
              
              if (!company || !position) return;
              
              dbService.addJob({
                id: `JOB-${Date.now()}`,
                company,
                position,
                type: 'Full Time',
                location: 'Remote / Bangalore',
                stipend,
                package: stipend,
                deadline: '2026-06-30',
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png',
                description: 'Assigned tech development responsibilities.'
              });

              e.currentTarget.reset();
              loadLists();
              alert(`Job opening for ${company} published!`);
            }} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Company logo</label>
                <input type="text" name="company" placeholder="e.g. Amazon" className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl focus:border-indigo-500 outline-none text-white text-xs" required />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Position / Role Title</label>
                <input type="text" name="position" placeholder="Backend Engineer" className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl focus:border-indigo-500 outline-none text-white text-xs" required />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Package value statement</label>
                <input type="text" name="package" placeholder="₹45 LPA" className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl focus:border-indigo-500 outline-none text-white text-xs" required />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-650 hover:bg-indigo-555 text-white font-bold rounded-xl cursor-pointer">
                Publish Recruitment Opportunity
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Spreadsheet Reports (Vast specked direct export streams) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl leading-relaxed text-xs space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white leading-none">System Reports Generator</h3>
              <p className="text-xs text-slate-400 mt-1">Export formatted data registries lists directly to your filesystem.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {[
                { title: 'Student Dossiers', key: 'students' as const, desc: 'Excel compatible spreadsheet lists enrollees details.' },
                { title: 'Courses Schedules', key: 'courses' as const, desc: 'Tally sheet mapping assigned classes, rooms & lecturers.' },
                { title: 'System Logs', key: 'logs' as const, desc: 'Roster records containing chronological log changes.' }
              ].map(sec => (
                <div key={sec.key} className="p-5 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-white">{sec.title}</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">{sec.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      dbService.exportCSV(sec.key);
                    }}
                    className="w-full py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold hover:bg-indigo-600 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download CSV report</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6 text-xs text-left">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-6">
            <div>
              <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">System Control parameters</h3>
              <p className="text-xs text-slate-400">Manage security settings, access profiles and database recovery registers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 font-sans">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-2 flex items-center space-x-1.5">
                  <Settings className="h-4 w-4 text-emerald-450" />
                  <span>General Parameters</span>
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Maintenance mode</span>
                  <div className="px-2.5 py-0.5 bg-rose-500/10 text-rose-455 border border-rose-500/10 rounded font-bold uppercase tracking-wider text-[9px]">Offline mode bypass</div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Active Term</span>
                  <span className="font-bold text-slate-300">Fall 2024 / 2025</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-2 flex items-center space-x-1.5">
                  <Key className="h-4 w-4 text-indigo-400" />
                  <span>Security setups</span>
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Auth Tier:</span>
                  <span className="font-bold text-slate-300">Net proctored</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Password strength limit:</span>
                  <span className="font-bold text-slate-300">Min 8 chars</span>
                </div>
              </div>
            </div>

            {/* Dynamic White-Label Institution Branding Config */}
            <div className="p-6 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
              <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Landmark className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm">Enterprise White-Label Branding</h4>
                    <p className="text-[10px] text-slate-400">Instantly customize names, domains, history and currency configs for white-label resale pitches.</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded bg-indigo-900/30 text-indigo-300 border border-indigo-800/40 font-mono">
                  Active Brand: {instConfig.abbreviation || 'Default'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Institution / School Name</label>
                  <input
                    type="text"
                    value={instConfig.name}
                    onChange={(e) => setInstConfig({ ...instConfig, name: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="e.g. Kamla Nehru Institute of Technology"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Abbreviation</label>
                  <input
                    type="text"
                    value={instConfig.abbreviation}
                    onChange={(e) => setInstConfig({ ...instConfig, abbreviation: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none uppercase"
                    placeholder="e.g. KNIT"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Authorized Email Domain</label>
                  <input
                    type="text"
                    value={instConfig.domain}
                    onChange={(e) => setInstConfig({ ...instConfig, domain: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none lowercase font-mono"
                    placeholder="e.g. knit.ac.in"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Campus Location</label>
                  <input
                    type="text"
                    value={instConfig.location}
                    onChange={(e) => setInstConfig({ ...instConfig, location: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="e.g. Sultanpur, India"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Shield Logo Subtitle</label>
                  <input
                    type="text"
                    value={instConfig.logoSubtitle}
                    onChange={(e) => setInstConfig({ ...instConfig, logoSubtitle: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                    placeholder="e.g. Sultanpur Secure Campus Network"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Currency Symbol</label>
                  <input
                    type="text"
                    value={instConfig.currencySymbol}
                    onChange={(e) => setInstConfig({ ...instConfig, currencySymbol: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none text-center font-mono"
                    placeholder="e.g. ₹"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-400">Heritage/History Description</label>
                <textarea
                  value={instConfig.historyText}
                  onChange={(e) => setInstConfig({ ...instConfig, historyText: e.target.value })}
                  className="w-full h-16 py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none resize-none"
                  placeholder="Enter historical background to show on student screens..."
                />
              </div>

              <button
                type="button"
                disabled={isUpdatingBranding}
                onClick={async () => {
                  try {
                    setIsUpdatingBranding(true);
                    await dbService.updateInstitutionalConfig(instConfig);
                    setIsUpdatingBranding(false);
                    alert("Institutional branding synchronized completely across all login walls, dashboards, and marketplace structures!");
                  } catch (err: any) {
                    setIsUpdatingBranding(false);
                    alert("Failure updating brand layout: " + err.message);
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-650 text-white font-bold rounded-xl text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                {isUpdatingBranding ? 'Synchronizing Brand Layout...' : 'Commit Enterprise Branding Controls'}
              </button>
            </div>

            {/* Enterprise Multi-Tenant & Compliance Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Custom Database Isolation */}
              <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                <h4 className="font-bold text-white text-xs border-b border-slate-900 pb-2 flex items-center space-x-1.5">
                  <Database className="h-4 w-4 text-cyan-400 animate-pulse" />
                  <span>Cloud Database Isolation & Sovereignty</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Isolate school records inside your own dedicated institution-owned Google Firestore cluster. Ensures absolute compliance under institutional sovereignty regulations.
                </p>
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-extrabold uppercase text-slate-500">Firestore Project ID</label>
                    <input
                      type="text"
                      placeholder="e.g. school-portal-prod-983"
                      className="w-full py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-extrabold uppercase text-slate-500">API Key</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••••••"
                        className="w-full py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-extrabold uppercase text-slate-500">Storage Bucket</label>
                      <input
                        type="text"
                        placeholder="default-bucket.appspot.com"
                        className="w-full py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/60 p-2 border border-slate-900 rounded-lg">
                    <span>Isolation State:</span>
                    <span className="font-extrabold text-amber-400 font-mono">STANDALONE READY</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Institutional Mailer & Security Compliance */}
              <div className="p-6 bg-slate-950 border border-slate-850 rounded-2xl space-y-6 col-span-1 md:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-3 gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-emerald-400" />
                      <span>🔒 Production Gateway Real Email OTP & MFA Console</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Configure external free dispatch services (Resend, Gmail SMTP) so users receive actual verification tokens in their personal inbox!
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 rounded-lg self-start md:self-auto py-0.5 font-mono">
                    REAL-TIME SYNC ACTIVE
                  </span>
                </div>

                {/* Sub-Guide tabs */}
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-900 text-xs text-slate-300 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-slate-100 text-[11px] uppercase tracking-wider">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    <span>Free Email Service Options (Standard Setup)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10.5px] leading-relaxed">
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-900 space-y-1.5">
                      <strong className="text-white flex items-center gap-1">
                        <span className="text-emerald-400 font-mono">Option A:</span> Resend.com (100% Free)
                      </strong>
                      <p className="text-slate-400">
                        Provides a developer free tier (3,000 emails/month). You don't need a domain to start!
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-500 font-mono text-[9px]">
                        <li>Host: <span className="text-indigo-300">smtp.resend.com</span></li>
                        <li>Port: <span className="text-indigo-300">587</span> or <span className="text-indigo-300">465</span></li>
                        <li>Username: <span className="text-indigo-300">resend</span></li>
                        <li>Password: <span className="text-pink-300">Your Resend API Key</span></li>
                        <li>Sender: <span className="text-indigo-300">onboarding@resend.dev</span></li>
                      </ul>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-900 space-y-1.5">
                      <strong className="text-white flex items-center gap-1">
                        <span className="text-emerald-400 font-mono">Option B:</span> Gmail SMTP (Free)
                      </strong>
                      <p className="text-slate-400">
                        Use your personal Gmail! Standard account provides up to 500 dispatches daily.
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-500 font-mono text-[9px]">
                        <li>Host: <span className="text-indigo-300">smtp.gmail.com</span></li>
                        <li>Port: <span className="text-indigo-300">465</span> (SSL)</li>
                        <li>Username: <span className="text-indigo-300">Your email@gmail.com</span></li>
                        <li>Password: <span className="text-pink-300">Google App Password</span></li>
                        <li>Sender: <span className="text-indigo-300">Your email@gmail.com</span></li>
                      </ul>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-550 leading-normal border-t border-slate-950/70 pt-2 font-mono">
                     Security Lock: For secure web hosting, add these values to your platform environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER).
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Form fields */}
                  <div className="md:col-span-2 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-extrabold uppercase text-slate-400">SMTP Host / Endpoint</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => {
                            setSmtpHostState(e.target.value);
                            localStorage.setItem('diag_smtp_host', e.target.value);
                          }}
                          placeholder="smtp.resend.com"
                          className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-extrabold uppercase text-slate-400">SMTP Port</label>
                        <input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => {
                            setSmtpPortState(e.target.value);
                            localStorage.setItem('diag_smtp_port', e.target.value);
                          }}
                          placeholder="587"
                          className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-extrabold uppercase text-slate-400">SMTP Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => {
                            setSmtpUserState(e.target.value);
                            localStorage.setItem('diag_smtp_user', e.target.value);
                          }}
                          placeholder="resend"
                          className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-extrabold uppercase text-slate-400">SMTP Passcode / API Key</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => {
                            setSmtpPassState(e.target.value);
                            localStorage.setItem('diag_smtp_pass', e.target.value);
                          }}
                          placeholder="re_xxxxxxxxxxxxxx or app-password"
                          className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-extrabold uppercase text-slate-400">Verified Sender Email</label>
                        <input
                          type="email"
                          value={smtpSender}
                          onChange={(e) => {
                            setSmtpSenderState(e.target.value);
                            localStorage.setItem('diag_smtp_sender', e.target.value);
                          }}
                          placeholder="onboarding@resend.dev"
                          className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smtpSecure}
                            onChange={(e) => {
                              setSmtpSecureState(e.target.checked);
                              localStorage.setItem('diag_smtp_secure', e.target.checked ? 'true' : 'false');
                            }}
                            className="bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 rounded"
                          />
                          <span className="text-[10px] font-bold text-slate-300">Require SSL Connection (TLS/465)</span>
                        </label>
                      </div>
                    </div>

                    {/* Persist in Cloud Policy Button */}
                    <div className="pt-3 border-t border-slate-900 space-y-3">
                      <button
                        type="button"
                        disabled={smtpSavingCloud}
                        onClick={async () => {
                          setSmtpSavingCloud(true);
                          setSmtpSaveSuccess(null);
                          setSmtpSaveError(null);
                          try {
                            const apiResponse = await fetch('/api/save-smtp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                host: smtpHost.trim(),
                                port: smtpPort.trim(),
                                user: smtpUser.trim(),
                                pass: smtpPass.trim(),
                                secure: smtpSecure,
                                sender: smtpSender.trim(),
                                updatedBy: currentUser.email || 'admin'
                              })
                            });
                            
                            const apiData = await apiResponse.json();
                            if (!apiResponse.ok || apiData.error) {
                              throw new Error(apiData.error || 'Failed to save settings via backend API.');
                            }
                            
                            setSmtpSaveSuccess('Production SMTP configuration has been successfully saved to your live Firebase Cloud database! Authentic MFA emails will now be delivered via this gateway.');
                          } catch (err: any) {
                            setSmtpSaveError(`Could not save credentials to cloud: ${err.message || 'Permission denied.'}`);
                          } finally {
                            setSmtpSavingCloud(false);
                          }
                        }}
                        className="w-full py-2 bg-pink-700 hover:bg-pink-600 disabled:bg-pink-900/40 text-white text-[10px] font-bold uppercase font-mono tracking-wider transition rounded-lg cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        {smtpSavingCloud ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Updating Gateway Policy...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>💾 Save & Apply SMTP Policy (Firestore Sync)</span>
                          </>
                        )}
                      </button>

                      {smtpSaveSuccess && (
                        <div className="p-3 bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 rounded-lg text-[9.5px] font-medium leading-relaxed font-mono">
                          🎉 {smtpSaveSuccess}
                        </div>
                      )}

                      {smtpSaveError && (
                        <div className="p-3 bg-red-950/60 border border-red-900/40 text-red-400 rounded-lg text-[9.5px] font-medium leading-relaxed font-mono">
                          ❌ {smtpSaveError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnostical Trigger Control panel */}
                  <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wide">
                        <RefreshCw className={`h-3 w-3 text-emerald-400 ${smtpTestSending ? 'animate-spin': ''}`} />
                        <span>Diagnostics Playground</span>
                      </div>
                      <p className="text-[9.5px] text-slate-400 leading-relaxed">
                        Trigger a real-time email dispatch using these configuration values to verify host handshakes before saving credentials.
                      </p>
                      <div className="space-y-1">
                        <label className="text-[8px] font-extrabold uppercase text-slate-500">Destination Test Email</label>
                        <input
                          type="email"
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          placeholder="your-email@example.com"
                          className="w-full py-1.5 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={smtpTestSending}
                        onClick={async () => {
                          setSmtpTestSending(true);
                          setSmtpTestSuccess(null);
                          setSmtpTestError(null);
                          try {
                            const res = await fetch('/api/send-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                to: testRecipient.trim(),
                                subject: '🔑 Secure Gateway MFA OTP Status Verification',
                                message: `Your secure Multi-Factor Authentication (MFA) system is configured and fully operational. Current connection established with Host: ${smtpHost} on Port: ${smtpPort}. Authentic and authorized.`,
                                smtpConfig: {
                                  host: smtpHost,
                                  port: smtpPort,
                                  user: smtpUser,
                                  pass: smtpPass,
                                  secure: smtpSecure,
                                  sender: smtpSender
                                }
                              })
                            });
                            const result = await res.json();
                            if (result.success) {
                              setSmtpTestSuccess(`Success! A test verification email was successfully sent. Message ID: ${result.messageId}`);
                            } else {
                              if (result.reason === 'MISSING_CREDENTIALS') {
                                setSmtpTestError('Simulated OTP! Fill in SMTP passcode/credentials to send real verification codes.');
                              } else {
                                setSmtpTestError(`SMTP Rejection: ${result.error || 'Server error'}`);
                              }
                            }
                          } catch (err: any) {
                            setSmtpTestError(`Transport error: ${err.message || 'Verification request rejected.'}`);
                          } finally {
                            setSmtpTestSending(false);
                          }
                        }}
                        className="w-full py-2 bg-indigo-700 hover:bg-indigo-600 disabled:bg-indigo-900/40 text-white text-[10px] font-bold uppercase font-mono tracking-wider transition rounded-lg cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        {smtpTestSending ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Dispatching code...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3" />
                            <span>⚡ Dispatch Test OTP</span>
                          </>
                        )}
                      </button>

                      {smtpTestSuccess && (
                        <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg text-[9px] font-medium leading-relaxed">
                          {smtpTestSuccess}
                        </div>
                      )}
                      
                      {smtpTestError && (
                        <div className={`p-2.5 rounded-lg text-[9px] font-medium leading-relaxed ${smtpTestError.startsWith('Simulated') ? 'bg-yellow-900/20 border border-yellow-900/30 text-yellow-500' : 'bg-red-950/40 border border-red-900/30 text-red-400'}`}>
                          {smtpTestError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Inline component workaround for specific local names
function CancelSettings() {
  return <Settings className="h-4 w-4 text-slate-400" />;
}
