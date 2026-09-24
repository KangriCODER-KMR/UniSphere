/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart2, FileText, ClipboardList, RefreshCw, 
  TrendingUp, Wallet, Award, Users, ArrowDownToLine, Printer 
} from 'lucide-react';
import { Student, Department, Course, LogEntry } from '../types';
import { dbService } from '../lib/db';

interface ReportsGeneratorProps {
  departments: Department[];
  students: Student[];
  courses: Course[];
}

export default function ReportsGenerator({ departments, students, courses }: ReportsGeneratorProps) {
  // --- STATE DECLARATIONS ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const records = await dbService.getLogs();
      setLogs([...records]);
    } catch (e) {
      console.warn('Logging trail load failures.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // --- STATS ENGINES ---
  const totalStudents = students.length;
  const enrolledStudents = students.filter(s => s.status === 'Enrolled').length;
  const activeCourses = courses.length;

  // Calculative sum of yearly allocation budgets
  const totalSchoolBudget = departments.reduce((acc, d) => acc + d.budget, 0);

  // Cumulative Average GPA scores
  const averageGPA = students.length > 0 
    ? (students.reduce((acc, s) => acc + (s.gpa ?? 8.5), 0) / students.length).toFixed(2)
    : '0.00';

  // Average student to teacher headcount ratio estimation
  const totalTeachers = courses.reduce((acc, c) => acc + 1, 0) || 5; 
  const studentTeacherRatio = (enrolledStudents / totalTeachers).toFixed(1);

  // Fetch active ledger statuses for charts
  const countFinancialStatus = (status: 'Paid' | 'Pending' | 'Overdue') => {
    return students.filter(s => s.financialStatus === status).length;
  };

  const handleExportAll = () => {
    // Sequentially download students, departments and course matrices
    dbService.exportCSV('students');
    setTimeout(() => dbService.exportCSV('departments'), 400);
    setTimeout(() => dbService.exportCSV('courses'), 800);
  };

  return (
    <div className="space-y-6">

      {/* SECTION CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Real-Time Reports & Audits</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time visual monitoring of school budgets, averages, student-teacher rosters, and chronological audit logs.
          </p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button
            id="audit-refresh-btn"
            onClick={fetchLogs}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
            title="Refresh logs trail"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            id="reports-export-all-btn"
            onClick={handleExportAll}
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>Export Database (CSV)</span>
          </button>
        </div>
      </div>

      {/* CORE STATISTICAL COUNTS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Active Enrolled Roster */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Enrollment</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{enrolledStudents} / {totalStudents}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Stated active course slots</p>
          </div>
        </div>

        {/* Card 2: Cumulative GPA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cohort Avg GPA</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{averageGPA}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Scaled on 4.0 standard</p>
          </div>
        </div>

        {/* Card 3: School Operating Budget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annual Allocation</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">${totalSchoolBudget.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Sum from departments budgets</p>
          </div>
        </div>

        {/* Card 4: Density Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student-Teacher Ratio</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{studentTeacherRatio} : 1</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">Average density metric</p>
          </div>
        </div>

      </div>

      {/* VISUAL REPORT ZONE (BUDGET SPENDS & FEES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column Left: Visual Department Budget Comparisons */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-blue-600" />
              <span>Department Budget Allocation Bar Charts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Visual comparison of allocated annual funding bounds per faculty.</p>
          </div>
          
          <div className="space-y-4">
            {departments.map((dept) => {
              // Percentage calculation relative to total budget
              const pct = totalSchoolBudget > 0 ? (dept.budget / totalSchoolBudget) * 100 : 0;
              return (
                <div key={dept.id} className="space-y-1.5 animate-pulse-once">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-755 dark:text-slate-300 font-bold">{dept.name} ({dept.code})</span>
                    <span className="text-slate-900 dark:text-slate-100">${dept.budget.toLocaleString()}</span>
                  </div>
                  {/* Progress Bar Track */}
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex">
                    <motion.div 
                      className="bg-blue-600 rounded-full h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column Right: Fee Collection Records */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <span>Tuition Ledger Accounts Shares</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Fee collection metrics across registered portfolios.</p>
          </div>

          <div className="space-y-3.5 pt-3">
            {/* Paid status Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-405 mb-1">
                <span>Settled (Paid)</span>
                <span>{countFinancialStatus('Paid')} students</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${students.length > 0 ? (countFinancialStatus('Paid') / students.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Pending status */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-405 mb-1">
                <span>In-Process (Pending)</span>
                <span>{countFinancialStatus('Pending')} students</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${students.length > 0 ? (countFinancialStatus('Pending') / students.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Overdue status */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-405 mb-1">
                <span>Outstanding (Overdue)</span>
                <span>{countFinancialStatus('Overdue')} students</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full" 
                  style={{ width: `${students.length > 0 ? (countFinancialStatus('Overdue') / students.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SYSTEM SECURITY AUDIT TRAIL LOG VIEWER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-slate-700 dark:text-slate-350" />
              <span>Chronological Security & Access Trail Logs</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Immutable track of database additions, deletes, and edits.</p>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
            ReadOnly Audit Tally
          </span>
        </div>

        {loadingLogs ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500" />
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl text-xs flex justify-between items-start space-x-4 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <div className="space-y-1 truncate-wrap">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-950 px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-505 dark:text-slate-400">by {log.userName}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-sans mt-1 leading-relaxed text-[11px]">{log.details}</p>
                </div>
                {/* UTC timestamp parser */}
                <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap text-right">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-slate-400 py-6 text-xs">No administrative actions have been logged yet.</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
