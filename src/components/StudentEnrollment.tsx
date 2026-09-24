/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Edit2, Trash2, Filter, 
  Download, Printer, GraduationCap, DollarSign, 
  TrendingUp, Calendar, Mail, Phone, X, Check, FileSpreadsheet, Eye
} from 'lucide-react';
import { Student, Department, StudentStatus, FinancialStatus } from '../types';
import { dbService } from '../lib/db';

interface StudentEnrollmentProps {
  departments: Department[];
}

export default function StudentEnrollment({ departments }: StudentEnrollmentProps) {
  // --- STATE DECLARATIONS ---
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Input Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    admissionNo: '',
    dob: '',
    departmentId: '',
    enrollmentDate: '',
    status: 'Enrolled' as StudentStatus,
    gpa: 4.0,
    financialStatus: 'Paid' as FinancialStatus,
    contactNumber: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [departments]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const records = await dbService.getStudents();
      setStudents([...records]);
    } catch (e) {
      setError('Failed to fetch school enrollment registries.');
    } finally {
      setLoading(false);
    }
  };

  // --- FORM HANDLING ---
  const handleOpenAdd = () => {
    setFormData({
      id: `stud-${Date.now()}`,
      name: '',
      email: '',
      admissionNo: `ADM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      dob: '2005-01-01',
      departmentId: departments[0]?.id || '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'Enrolled',
      gpa: 3.0,
      financialStatus: 'Paid',
      contactNumber: ''
    });
    setIsEditing(false);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData({ ...student });
    setIsEditing(true);
    setError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gpa' ? Number(value) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict value validations
    if (!formData.name || !formData.email || !formData.contactNumber) {
      setError('Full Name, Email and Contact Number are required fields.');
      return;
    }

    if (formData.gpa < 0 || formData.gpa > 4.0) {
      setError('GPA must range strictly between 0.0 and 4.0.');
      return;
    }

    try {
      if (isEditing) {
        await dbService.updateStudent(formData as Student);
      } else {
        await dbService.addStudent(formData as Student);
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.message || 'Operation blocked by security rules.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you certain you wish to permanently purge student ${name}?`)) {
      try {
        await dbService.deleteStudent(id);
        fetchStudents();
      } catch (err: any) {
        alert(err.message || 'Error occurred during deletion.');
      }
    }
  };

  // --- EXPORT CONTROLS ---
  const handleExportCSV = () => {
    dbService.exportCSV('students');
  };

  const triggerRecordPrint = (student: Student) => {
    setSelectedStudent(student);
    setIsPrintModalOpen(true);
  };

  const executePrinter = () => {
    window.print();
  };

  // --- FILTERED DATA COMPUTATION ---
  const filteredStudents = students.filter(student => {
    const queryMatch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    const deptMatch = deptFilter === 'ALL' || student.departmentId === deptFilter;
    const statusMatch = statusFilter === 'ALL' || student.status === statusFilter;

    return queryMatch && deptMatch && statusMatch;
  });

  const getDeptName = (id: string) => {
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : 'Unknown department';
  };

  const getStatusBadgeStyle = (status: StudentStatus) => {
    switch (status) {
      case 'Enrolled': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Suspended': return 'bg-red-50 text-red-700 border-red-100';
      case 'Graduated': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Inactive': return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getFinancialBadgeStyle = (status: FinancialStatus) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Overdue': return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION CARD HEADER & METRICS SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Student Enrollment Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Maintain and audit registered student rosters, fee statuses, GPA scores, and department affiliations.
          </p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button
            id="student-csv-export"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Generate CSV Report</span>
          </button>
          <button
            id="student-add-btn"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-800 shadow-xs p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="student-search-input"
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
            placeholder="Search by student name, admission number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Department Filter Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center space-x-1">
            <Filter className="h-3 w-3" />
            <span>Filter Program</span>
          </label>
          <select
            id="student-dept-filter"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.code}</option>
            ))}
          </select>
        </div>

        {/* Enrollment Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center space-x-1">
            <GraduationCap className="h-3 w-3" />
            <span>Studies Status</span>
          </label>
          <select
            id="student-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Suspended">Suspended</option>
            <option value="Graduated">Graduated</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        /* ROBUST STUDENT GRID COMPONENT */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/75 dark:bg-slate-950/75">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Department Affiliation
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Performance (GPA)
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Tuition / Financials
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Action Suite
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((stud) => (
                    <tr key={stud.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Account */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                            {stud.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{stud.name}</div>
                            <div className="text-xs text-slate-400 font-mono tracking-tight">{stud.admissionNo}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department Major */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {getDeptName(stud.departmentId)}
                      </td>

                      {/* GPA Metrics */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-slate-400" />
                          <span className={`text-sm font-semibold ${
                            (stud.gpa ?? 0) >= 3.5 ? 'text-emerald-600 dark:text-emerald-450 font-bold' : 
                            (stud.gpa ?? 0) >= 2.0 ? 'text-slate-705 dark:text-slate-300' : 'text-red-500'
                          }`}>
                            {(stud.gpa ?? 8.5).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Enrolled Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${getStatusBadgeStyle(stud.status)}`}>
                          {stud.status}
                        </span>
                      </td>

                      {/* Tuition Ledger Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${getFinancialBadgeStyle(stud.financialStatus)}`}>
                          {stud.financialStatus}
                        </span>
                      </td>

                      {/* Print and Modify Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-1.5 h-full">
                        <button
                          onClick={() => triggerRecordPrint(stud)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors inline-block"
                          title="Print Academic Record Transcript"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(stud)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors inline-block"
                          title="Edit Student Record"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(stud.id, stud.name)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-655 transition-colors inline-block"
                          title="Purge Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      No matching student enrollment records located.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REMAINS HIGHLY SCALABLE - FORM DIALOG FOR ADD/EDIT STUDS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Modify Student Dossier' : 'Register & Enroll New Student'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="e.g. Liam Thompson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">School Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="liam.thompson@school.edu"
                  />
                </div>
              </div>

              {/* Row 2: Admission, DOB, Contact */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Admission Index No</label>
                  <input
                    type="text"
                    name="admissionNo"
                    disabled
                    value={formData.admissionNo}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contact Number *</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Row 3: Department, enrollment date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Academic Department Major *</label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Commencement Date *</label>
                  <input
                    type="date"
                    name="enrollmentDate"
                    required
                    value={formData.enrollmentDate}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Row 4: Study status, GPA, tuition */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Enrollment Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="Enrolled">Enrolled</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cumulative GPA (0.00-4.00) *</label>
                  <input
                    type="number"
                    name="gpa"
                    required
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={formData.gpa}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ledger Financial status</label>
                  <select
                    name="financialStatus"
                    value={formData.financialStatus}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-md"
                >
                  Commit Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT DIALOG WINDOW (CONVERTS VIA PRINT TO HIGH RESOLUTION PDF / PRINT PREVIEW) */}
      {isPrintModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/45 flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:h-full print:max-w-none print:rounded-none">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
              <h2 className="font-bold text-slate-900">Academic Sheet Print Preview</h2>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Frame Area */}
            <div id="print-area" className="p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="border border-slate-300 p-8 rounded-lg bg-white relative print:border-0 print:p-0">
                
                {/* School Header */}
                <div className="text-center pb-6 border-b border-slate-200">
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider font-sans">
                    Academix School System
                  </h1>
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-widest mt-1">
                    Official Student Enroll Dossier & Academic Sheet
                  </p>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-y-4 md:grid-cols-2 gap-x-6 mt-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Full Legal Name
                    </h4>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Admission Number
                    </h4>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-1">{selectedStudent.admissionNo}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Student Major Dept
                    </h4>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {getDeptName(selectedStudent.departmentId)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Commencement Date
                    </h4>
                    <p className="text-sm text-slate-800 mt-1">{selectedStudent.enrollmentDate}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Student Institutional Email
                    </h4>
                    <p className="text-sm text-slate-800 mt-1">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Emergency Contact Number
                    </h4>
                    <p className="text-sm text-slate-800 mt-1">{selectedStudent.contactNumber}</p>
                  </div>
                </div>

                {/* Score & Ledger Box */}
                <div className="grid grid-cols-3 gap-4 border border-slate-200 p-4 rounded-xl mt-8 bg-slate-50/50">
                  <div className="text-center md:border-r border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment Status</p>
                    <p className="text-sm font-bold mt-1 text-blue-700">{selectedStudent.status}</p>
                  </div>
                  <div className="text-center md:border-r border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative GPA</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{(selectedStudent?.gpa ?? 8.5).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tuition Status</p>
                    <p className="text-sm font-bold mt-1 text-emerald-700">{selectedStudent.financialStatus}</p>
                  </div>
                </div>

                {/* Official Sign Off */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-left">
                    <p className="text-xs text-slate-400 font-mono">Date Printed: {new Date().toLocaleDateString()}</p>
                    <p className="text-[9px] text-slate-400">Printed via Auth Session of: Admin Staff</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="border-b border-slate-400 h-8" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                      Registrars Seal
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Print trigger footer controls */}
            <div className="flex justify-end space-x-2 px-6 py-4 bg-slate-50 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close View
              </button>
              <button
                onClick={executePrinter}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4" />
                <span>Trigger PDF / Print</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
