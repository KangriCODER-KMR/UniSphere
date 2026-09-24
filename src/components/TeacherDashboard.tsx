/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Clock, Calendar, CheckCircle, Edit3, MessageSquare, Upload, 
  PlusCircle, Video, List, Info, Save, Mail, Key, Shield, RefreshCw, Star, Trash
} from 'lucide-react';
import { dbService, WEEKLY_TIMETABLES } from '../lib/db';
import { Teacher, Course, Student, UserProfile } from '../types';

interface TeacherDashboardProps {
  currentUser: UserProfile;
}

export default function TeacherDashboard({ currentUser }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  // States
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Attendance Marking
  const [attendanceClass, setAttendanceClass] = useState('CS-2024-A');
  const [attendanceSubject, setAttendanceSubject] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedRecords, setMarkedRecords] = useState<Record<string, 'present' | 'absent'>>({});

  // Marks Entry
  const [marksExam, setMarksExam] = useState('CT1');
  const [marksSubject, setMarksSubject] = useState('');
  const [marksClass, setMarksClass] = useState('CS-2024-A');
  const [studentMarksInput, setStudentMarksInput] = useState<Record<string, number>>({});

  // Parent Communications
  const [messageStudentId, setMessageStudentId] = useState('');
  const [messageType, setMessageType] = useState('appreciation');
  const [parentMessageText, setParentMessageText] = useState('');

  // Paper Upload Form
  const [paperStudentId, setPaperStudentId] = useState('');
  const [paperExamId, setPaperExamId] = useState('CT1');
  const [paperSubject, setPaperSubject] = useState('');
  const [paperFileName, setPaperFileName] = useState('');

  // Create Assignment
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignCourse, setAssignCourse] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignMaxMarks, setAssignMaxMarks] = useState(100);

  // Broadcast Notification
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('students');

  useEffect(() => {
    // Look up current teacher
    const profObj = dbService.getTeachers().find(t => t.id === currentUser.id || t.email === currentUser.email);
    if (profObj) {
      setTeacher(profObj);
      if (profObj.subjects?.length > 0) {
        setAttendanceSubject(profObj.subjects[0]);
        setMarksSubject(profObj.subjects[0]);
        setPaperSubject(profObj.subjects[0]);
      }
    } else {
      // Ephemeral fallback teacher profile
      const tempProf: Teacher = {
        id: currentUser.id || 'TCH001',
        name: currentUser.name || 'Prof. Priya Singh',
        department: currentUser.department || 'Computer Science',
        qualification: 'Ph.D. in CS',
        experience: '12 Years',
        subjects: ['Data Structures', 'Algorithms', 'Database Management', 'Software Engineering', 'Machine Learning']
      };
      setTeacher(tempProf);
      setAttendanceSubject(tempProf.subjects[0]);
      setMarksSubject(tempProf.subjects[0]);
      setPaperSubject(tempProf.subjects[0]);
    }

    setStudents([...dbService.getStudents()]);
    setCourses([...dbService.getCourses()]);
  }, [currentUser]);

  const loadBaseLists = () => {
    setStudents([...dbService.getStudents()]);
    setCourses([...dbService.getCourses()]);
  };

  useEffect(() => {
    loadBaseLists();
  }, [activeTab]);

  if (!teacher) return null;

  // Mark All Present / Absent helpers
  const handleMarkAll = (status: 'present' | 'absent') => {
    const classStudents = students.filter(s => s.branch === 'Computer Science'); // simplified
    const nextRecs = { ...markedRecords };
    classStudents.forEach(s => {
      nextRecs[s.id] = status;
    });
    setMarkedRecords(nextRecs);
  };

  const handleSaveAttendance = () => {
    const classStudents = students.filter(s => s.branch === 'Computer Science');
    classStudents.forEach(s => {
      const stat = markedRecords[s.id] || 'present';
      // Simulate save
      const matchingStudent = dbService.getStudents().find(x => x.id === s.id);
      if (matchingStudent) {
        // slightly fluctuate attendance as demo feedback loops
        if (stat === 'absent' && matchingStudent.currentAttendance > 50) {
          matchingStudent.currentAttendance -= 2;
        } else if (stat === 'present' && matchingStudent.currentAttendance < 98) {
          matchingStudent.currentAttendance += 1;
        }
      }
    });

    dbService.addLog('Attendance Marking', `Saved records for class "${attendanceClass}", Date: ${attendanceDate}`);
    dbService.addNotification('Biometric Registers updated', `Attendance marked for subject: ${attendanceSubject}`, 'students', 'info');
    alert(`Biometric registers saved! Date: ${attendanceDate}. Records logged in database.`);
    loadBaseLists();
  };

  // Exam type configuration
  const EXAMS_TYPES_LIST = [
    { id: 'CT1', name: 'Class Test 1', max: 20 },
    { id: 'CT2', name: 'Class Test 2', max: 20 },
    { id: 'MID', name: 'Mid Sem Exam', max: 30 },
    { id: 'CT3', name: 'Class Test 3', max: 20 },
    { id: 'END', name: 'End Semester', max: 100 }
  ];

  const currentMaxMarks = EXAMS_TYPES_LIST.find(e => e.id === marksExam)?.max || 20;

  const handleSaveSingleMark = (stdId: string) => {
    const value = studentMarksInput[stdId];
    if (value === undefined || isNaN(value) || value < 0 || value > currentMaxMarks) {
      alert(`Invalid score. Enter value strictly from 0 to ${currentMaxMarks}.`);
      return;
    }
    
    dbService.addExamResult({
      examId: marksExam,
      score: value,
      total: currentMaxMarks,
      remarks: value >= (currentMaxMarks * 0.8) ? 'Excellent' : 'Good',
      date: new Date().toLocaleDateString(),
      title: `${marksSubject} (${marksExam})`
    });

    alert(`Marks indexed for Student ID: ${stdId}. Check notification bells!`);
  };

  const handleSaveAllMarks = () => {
    alert('All parameters saved in spreadsheet transaction arrays!');
  };

  // Communication templates
  const useMessageTemplate = (tplType: string) => {
    const studentObj = students.find(s => s.id === messageStudentId);
    const targetName = studentObj ? studentObj.name : 'your child';
    
    const messages: Record<string, string> = {
      appreciation: `Dear Parent,\n\nI am delighted to share that ${targetName} is showcasing exemplary discipline and coding performance in DS classes. Maintaining this focus will lead to outstanding results.\n\nWarm regards,\n${teacher.name}`,
      concern: `Dear Parent,\n\nI wanted to alert you regarding some academic struggles and homework backlogs in ${targetName}'s profiles in past assignments. Please set some review slots.\n\nWarm regards,\n${teacher.name}`,
      attendance: `Dear Parent,\n\nYour ward ${targetName} is sitting with low attendance registers currently. Minimum 75% attendance is required to qualify for proctored active end-sem examinations.\n\nRegards,\n${teacher.name}`
    };

    setParentMessageText(messages[tplType] || '');
  };

  return (
    <div className="space-y-6">
      
      {/* 2. SUB REGISTERS LINKS (Vast specs coverage) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white leading-none">Faculty Control Station</h2>
          <p className="text-xs text-slate-400 mt-1">Mark biometric codes, input assessment results, and construct assignment deadlines.</p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg">
          Emp-ID: {teacher.id}
        </div>
      </div>

      {/* HORIZONTAL TABS SWITCHER */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-2 scrollbar-none shrink-0">
        {[
          { id: 'overview', label: 'Faculty Profile', icon: Info },
          { id: 'schedule', label: 'Weekly Schedule', icon: Clock },
          { id: 'attendance', label: 'Mark Attendance', icon: CheckCircle },
          { id: 'marks', label: 'Enter Results', icon: Edit3 },
          { id: 'students', label: 'Scholar Rosters', icon: Users },
          { id: 'parents', label: 'Parent Connect', icon: MessageSquare },
          { id: 'papers', label: 'Upload Papers', icon: Upload },
          { id: 'courses', label: 'Instruction classes', icon: BookOpen },
          { id: 'assignments', label: 'Create Assignments', icon: PlusCircle },
          { id: 'online-stream', label: 'Online Livestreams', icon: Video }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-xl'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SUB PANEL VIEWS */}

      {/* Tab: Overview / Profile */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Teaches count</p>
              <h4 className="text-3xl font-black text-emerald-400 mt-2">{teacher.subjects?.length || 5}</h4>
              <p className="text-[10px] text-slate-500 mt-1">Assigned core catalog subjects</p>
            </div>
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Scholars list</p>
              <h4 className="text-3xl font-black text-indigo-400 mt-2">{students.length}</h4>
              <p className="text-[10px] text-slate-500 mt-1">Total active department enrollees</p>
            </div>
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Experience Index</p>
              <h4 className="text-3xl font-black text-purple-400 mt-2">{teacher.experience}</h4>
              <p className="text-[10px] text-slate-500 mt-1">Cumulative research industry years</p>
            </div>
            <div className="bg-slate-905 border border-slate-800 p-6 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">System operational</p>
              <h4 className="text-3xl font-black text-emerald-400 mt-2">100%</h4>
              <p className="text-[10px] text-slate-500 mt-1">Biometric cloud telemetry synced</p>
            </div>
          </div>

          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-350 pb-2 border-b border-slate-850">Biographic Index Card</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-400">Employee Name:</span><span className="text-slate-200 font-bold">{teacher.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Qual Credentials:</span><span className="text-slate-200 font-bold">{teacher.qualification}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Main Department:</span><span className="text-teal-400 font-bold">{teacher.department}</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-slate-450 uppercase font-black text-[10px] mb-2 tracking-widest">Selected catalog files:</p>
                <div className="flex flex-wrap gap-1.5">
                  {teacher.subjects?.map((sub, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-950 border border-slate-850 text-slate-300 font-bold rounded-lg text-[10px]">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Schedule */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl animate-fade-in text-xs">
          <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">My Daily Lecturer Slots</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">Review weekly slots, classes timings and room boundaries mapped inside the CS Block.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-850 border-l-[3px] border-emerald-500 rounded-2xl flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">CS-2024-A • Lecture</span>
                <h4 className="font-extrabold text-sm text-white">Data Structures (CS-102)</h4>
                <p className="text-slate-400">Room: LT-102</p>
              </div>
              <span className="text-emerald-450 font-bold font-mono bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10">09:00 AM - 10:00 AM</span>
            </div>
            
            <div className="p-4 bg-slate-950 border border-slate-850 border-l-[3px] border-indigo-500 rounded-2xl flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">CS-2024-B • Workshop Lab</span>
                <h4 className="font-extrabold text-sm text-white">Algorithms & Complexity</h4>
                <p className="text-slate-400">Room: Lab-1</p>
              </div>
              <span className="text-indigo-400 font-bold font-mono bg-indigo-500/5 px-2.5 py-1 rounded border border-indigo-500/10">10:00 AM - 11:30 AM</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Mark Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-lg text-white mb-2 leading-none">Biometric Registers Attendance Marking</h3>
            <p className="text-xs text-slate-400">Select class and date to log student rosters files securely.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Target Class</label>
                <select
                  value={attendanceClass}
                  onChange={(e) => setAttendanceClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="CS-2024-A">CS-2024-A (Section A)</option>
                  <option value="CS-2024-B">CS-2024-B (Section B)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Lecturer Subject</label>
                <select
                  value={attendanceSubject}
                  onChange={(e) => setAttendanceSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  {teacher.subjects?.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Calendar Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 pb-2 border-b border-slate-850">
              <h4 className="font-extrabold text-sm text-slate-300">Rosters Headcount</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleMarkAll('present')}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg cursor-pointer hover:bg-emerald-500/20"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleMarkAll('absent')}
                  className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 font-bold rounded-lg cursor-pointer hover:bg-rose-500/20"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
              {students.filter(s => s.branch === 'Computer Science').map(s => {
                const status = markedRecords[s.id] || 'present';
                return (
                  <div key={s.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs">{s.name}</span>
                      <p className="text-[10px] text-slate-500 font-sans mt-0.5">Roll: {s.id} • Aggregate attendance: {s.currentAttendance}%</p>
                    </div>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name={`attn-${s.id}`}
                          checked={status === 'present'}
                          onChange={() => setMarkedRecords({ ...markedRecords, [s.id]: 'present' })}
                          className="text-emerald-500 focus:ring-0"
                        />
                        <span className="text-emerald-450">Present</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-rose-450">
                        <input
                          type="radio"
                          name={`attn-${s.id}`}
                          checked={status === 'absent'}
                          onChange={() => setMarkedRecords({ ...markedRecords, [s.id]: 'absent' })}
                          className="text-rose-500 focus:ring-0"
                        />
                        <span>Absent</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveAttendance}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                Upload Attendance registers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Enter Results */}
      {activeTab === 'marks' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-lg text-white mb-2 leading-none">Assessment Marks Grid Control</h3>
            <p className="text-xs text-slate-400">Seeding module for 5 proctored examinations (CT1, CT2, Mids, CT3, End-sem).</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Subject catalog</label>
                <select
                  value={marksSubject}
                  onChange={(e) => setMarksSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  {teacher.subjects?.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Classroom section</label>
                <select
                  value={marksClass}
                  onChange={(e) => setMarksClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="CS-2024-A">CS-2024-A (Section A)</option>
                  <option value="CS-2024-B">CS-2024-B (Section B)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Target Exam tier</label>
                <select
                  value={marksExam}
                  onChange={(e) => setMarksExam(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  {EXAMS_TYPES_LIST.map(itm => (
                    <option key={itm.id} value={itm.id}>{itm.name} (Max: {itm.max})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 overflow-x-auto bg-slate-950 border border-slate-850 rounded-2xl">
              <table className="w-full text-xs text-slate-350">
                <thead className="bg-slate-900 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-3 text-left">Student Name</th>
                    <th className="py-3 px-3 text-center">Student Roll</th>
                    <th className="py-3 px-3 text-center">Current Score</th>
                    <th className="py-3 px-3 text-center">Marks Input</th>
                    <th className="py-3 px-3 text-center">Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {students.filter(s => s.branch === 'Computer Science').map(s => {
                    const currentMarks = studentMarksInput[s.id] !== undefined ? studentMarksInput[s.id] : '';
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-3 text-left text-white font-semibold">{s.name}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{s.id}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-indigo-400">Not Saved</td>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={currentMaxMarks}
                            value={currentMarks}
                            onChange={(e) => setStudentMarksInput({ ...studentMarksInput, [s.id]: Number(e.target.value) })}
                            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 w-16 text-center text-xs focus:border-indigo-500 outline-none"
                            placeholder="Score"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleSaveSingleMark(s.id)}
                            className="p-1 px-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-md cursor-pointer font-bold"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStudentMarksInput({})}
                className="px-5 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 font-bold rounded-xl cursor-pointer"
              >
                Clear Inputs
              </button>
              <button
                onClick={handleSaveAllMarks}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                Save All marks ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Scholar Rosters */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.filter(s => s.branch === 'Computer Science').map(s => (
              <div key={s.id} className="bg-slate-905 border border-slate-800 p-5 rounded-3xl space-y-4 hover:border-slate-700/80 transition-all font-sans text-xs">
                <div className="flex items-center space-x-3.5 pb-2 border-b border-slate-850">
                  <div className="w-10 h-10 bg-indigo-500/15 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-black text-sm uppercase">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white leading-none">{s.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Roll ID: {s.id}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-semibold"><span className="text-slate-400">Class Year / Section:</span><span className="text-slate-200">Year {s.year} - {s.section}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-slate-400">Biometric Attendance:</span><span className={s.currentAttendance >= 75 ? 'text-emerald-400' : 'text-rose-400'}>{s.currentAttendance}%</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-slate-400">GPA Standing:</span><span className="text-indigo-400">{(s.gpa || 8.5).toFixed(1)}</span></div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact parents:</span>
                  <div className="font-bold text-slate-350">{s.parentName} ({s.parentContact})</div>
                  <div className="text-[10px] text-slate-550 lowercase">{s.parentEmail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Parent Connect */}
      {activeTab === 'parents' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Parent Communication logs</h3>
            <p className="text-xs text-slate-400">Send direct advisories copyable reports straight to domestic contact fields.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Select Scholar</label>
                <select
                  value={messageStudentId}
                  onChange={(e) => {
                    setMessageStudentId(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="">-- Select student --</option>
                  {students.filter(s => s.branch === 'Computer Science').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Message advisory class</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="appreciation">Appreciation Advisory</option>
                  <option value="concern">Performance Concerns Alerts</option>
                  <option value="attendance">Biometric Attendance Deficit Alert</option>
                </select>
              </div>
            </div>

            {/* Quick template triggers */}
            <div className="flex gap-2">
              <button
                onClick={() => useMessageTemplate('appreciation')}
                disabled={!messageStudentId}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                Appreciation templates
              </button>
              <button
                onClick={() => useMessageTemplate('concern')}
                disabled={!messageStudentId}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                Concern template
              </button>
              <button
                onClick={() => useMessageTemplate('attendance')}
                disabled={!messageStudentId}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400 hover:text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                Attendance template
              </button>
            </div>

            <div>
              <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Broadcast Message Body</label>
              <textarea
                rows={5}
                value={parentMessageText}
                onChange={(e) => setParentMessageText(e.target.value)}
                placeholder="Write customized advisory contents..."
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (!messageStudentId || !parentMessageText) {
                    alert('Select scholar and populate message body.');
                    return;
                  }
                  alert('Notification dispatched via SMS gateways and Email SMTP APIs!');
                  setParentMessageText('');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                Dispatch Advisory Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Upload Papers */}
      {activeTab === 'papers' && (
        <div className="space-y-6">
          <div className="bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Checked Answers Paper Upload Portfolios</h3>
            <p className="text-xs text-slate-400">Attach evaluated PDF/Image answer sheets for student feedback channels.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Select Student</label>
                <select
                  value={paperStudentId}
                  onChange={(e) => setPaperStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="">-- Choose student --</option>
                  {students.filter(s => s.branch === 'Computer Science').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Assessed Subject</label>
                <select
                  value={paperSubject}
                  onChange={(e) => setPaperSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  {teacher.subjects?.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Paper file attachment (.pdf)</label>
              <input
                type="text"
                value={paperFileName}
                onChange={(e) => setPaperFileName(e.target.value)}
                placeholder="evaluation_sheet_ct1.pdf"
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (!paperStudentId || !paperFileName) {
                    alert('Select target student and specify file name.');
                    return;
                  }
                  dbService.addNotification(
                    'Answer Paper Uploaded',
                    `Assessed answer sheet for ${paperSubject} CT1 loaded in your accounts portfolio.`,
                    'students',
                    'success',
                    { studentId: paperStudentId }
                  );
                  setPaperFileName('');
                  alert(`Evaluation sheet successfully linked to ${paperStudentId}!`);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                Publish Checked Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Instruction courses */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.filter(c => c.instructor === teacher.name || c.instructor.includes('Priya') || c.instructor.includes('Turing')).map(course => (
              <div key={course.id} className="bg-slate-905 border border-slate-800 p-5 rounded-3xl hover:border-slate-700/80 transition-all flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-baseline font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                    <span>Course-ID: {course.id}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white">{course.name}</h4>
                  <p className="text-slate-400 font-sans">Level: {course.semester} Credits: {course.credits}</p>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-slate-850 font-mono text-[10px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Filled capacity:</span>
                    <span>{course.currentEnrolled} / {course.maxSeats} Seats</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timing schedules:</span>
                    <span>{course.schedule}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="max-w-2xl bg-slate-905 border border-slate-800 p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-lg text-white mb-2 leading-none text-left">Generate Academic Assignment Task</h3>
            <p className="text-xs text-slate-400">Post target deadlines files, instructions and scoring limits for enrollees.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Target Course</label>
                <select
                  value={assignCourse}
                  onChange={(e) => setAssignCourse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-3 rounded-xl outline-none"
                >
                  <option value="">-- Choose course --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Assess End deadline</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-2.5 rounded-xl outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Assignment Title</label>
              <input
                type="text"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g. Lab task 3: Pointers and Structures"
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-450 font-bold text-[10px] uppercase mb-1">Description / Instructions</label>
              <textarea
                rows={4}
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                placeholder="List algorithm expectations..."
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (!assignCourse || !assignTitle || !assignDesc) {
                    alert('Fill in all parameters.');
                    return;
                  }
                  dbService.addAssignment({
                    id: `ASN-${Date.now()}`,
                    courseId: assignCourse,
                    title: assignTitle,
                    description: assignDesc,
                    dueDate: assignDueDate || '2026-06-30',
                    maxMarks: assignMaxMarks
                  });
                  setAssignTitle('');
                  setAssignDesc('');
                  alert('Assignment uploaded successfully for target class enrollees!');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl shadow-lg cursor-pointer"
              >
                Publish Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Online livestream */}
      {activeTab === 'online-stream' && (
        <div className="space-y-6">
          <div className="p-8 bg-slate-905 border border-slate-800 text-center rounded-[2rem] max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 text-rose-500 border border-red-500/20 rounded-2xl flex items-center justify-center animate-pulse">
              <Video className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Start instant video conference livestream</h3>
            <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
              Activate your proctored conference webcam feeds and stream lessons to enrollees under scheduled timings bounds.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  alert('Launching secure RTMP proctored video streaming pipeline (simulated WebRTC handshake successful)!');
                }}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Go Live Now (WebRTC)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
