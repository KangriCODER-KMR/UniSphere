/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, 
  User, Calendar, Clock, MapPin, Layers, Users, X, Info 
} from 'lucide-react';
import { Course, Department } from '../types';
import { dbService } from '../lib/db';

interface CourseAssignmentsProps {
  departments: Department[];
}

export default function CourseAssignments({ departments }: CourseAssignmentsProps) {
  // --- STATE DECLARATIONS ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Course Filtering & Searching State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Input Form States
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    departmentId: '',
    instructorName: '',
    credits: 3,
    maxCapacity: 40,
    currentEnrollment: 0,
    schedule: '',
    room: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [departments]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const records = await dbService.getCourses();
      setCourses([...records]);
    } catch (e) {
      setError('Could not compile course registers records.');
    } finally {
      setLoading(false);
    }
  };

  // --- FORM SUBMISSION CONTROLS ---
  const handleOpenAdd = () => {
    setFormData({
      id: `course-${Date.now()}`,
      name: '',
      code: '',
      departmentId: departments[0]?.id || '',
      instructorName: '',
      credits: 3,
      maxCapacity: 50,
      currentEnrollment: 0,
      schedule: 'Mon/Wed 10:00 AM - 11:30 AM',
      room: 'Main Aud-A'
    });
    setIsEditing(false);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setFormData({ ...course });
    setIsEditing(true);
    setError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'credits' || name === 'maxCapacity' || name === 'currentEnrollment') 
        ? Number(value) 
        : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Checks
    if (!formData.name || !formData.code || !formData.instructorName || !formData.room) {
      setError('Please fill in Name, Code, Instructor Name, and Classroom.');
      return;
    }

    if (formData.credits < 1 || formData.credits > 6) {
      setError('Credits weight must range strictly between 1 and 6.');
      return;
    }

    try {
      if (isEditing) {
        await dbService.updateCourse(formData as Course);
      } else {
        await dbService.addCourse(formData as Course);
      }
      setIsModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      setError(err.message || 'Operation forbidden by security rules.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you certain you wish to purge course assignment ${name}?`)) {
      try {
        await dbService.deleteCourse(id);
        fetchCourses();
      } catch (err: any) {
        alert(err.message || 'Error occurred during deletion.');
      }
    }
  };

  const handleCSVExport = () => {
    dbService.exportCSV('courses');
  };

  // --- FILTERED COMPUTATIONS ---
  const filteredCourses = courses.filter(course => {
    const queryMatch = 
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

    const deptMatch = selectedDeptFilter === 'ALL' || course.departmentId === selectedDeptFilter;

    return queryMatch && deptMatch;
  });

  const getDeptCode = (id: string) => {
    const d = departments.find(dep => dep.id === id);
    return d ? d.code : 'GEN';
  };

  return (
    <div className="space-y-6">

      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Course Assignments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Design program structures, configure course load weights, allocate class schedules, and assign faculty leads.
          </p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button
            id="course-csv-export"
            onClick={handleCSVExport}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Export Courses CSV
          </button>
          <button
            id="course-add-btn"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Course</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS ZONE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        {/* Dynamic Search Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="course-search-field"
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
            placeholder="Search by course name, code, or faculty lead name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Major Filter Selector */}
        <div className="w-full md:w-64">
          <select
            id="course-dept-selector"
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        /* COURSE GRID CARD COMPONENT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                layoutId={course.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
              >
                {/* Decorative Side Ribbon Indicating Department Code */}
                <div className="absolute top-0 right-0 h-2 bg-blue-600 w-full" />
                
                <div>
                  {/* Title & Core Details block */}
                  <div className="flex justify-between items-start mt-1">
                    <div>
                      <span className="inline-block text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-md font-mono mb-1">
                        {course.code}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-105 leading-tight block">{course.name}</h3>
                    </div>
                    {/* Actions tools */}
                    <div className="flex space-x-1 ml-4 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(course)}
                        className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Edit course allocations"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id, course.name)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-655 transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Course metrics */}
                  <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-250 truncate">{course.instructorName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{course.schedule}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{course.room}</span>
                    </div>
                  </div>
                </div>

                {/* Enrollment tally and weight footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-705 dark:text-slate-300">Credits: {course.credits} SU</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <div className="text-right">
                      <span className={`text-xs font-bold leading-none ${
                        course.currentEnrollment >= course.maxCapacity * 0.9 ? 'text-rose-600' : 'text-slate-705 dark:text-slate-305'
                      }`}>
                        {course.currentEnrollment}/{course.maxCapacity}
                      </span>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Enrolled</p>
                    </div>
                  </div>
                </div>

              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No matching courses located. Add active curriculums to see grids.
            </div>
          )}
        </div>
      )}

      {/* COURSE FORM ALLOCATIONS ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Modify Curricula Assignments' : 'Register & Assign New Course'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/35 text-red-700 dark:text-red-405 text-xs font-medium rounded-xl">
                  <span>{error}</span>
                </div>
              )}

              {/* Row 1: Name and Code */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Course Naming *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="e.g. Statistical Inference"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Index Code *</label>
                  <input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="STA-302"
                  />
                </div>
              </div>

              {/* Row 2: Department and Instructor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Holding Department *</label>
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
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Faculty Instructor *</label>
                  <input
                    type="text"
                    name="instructorName"
                    required
                    value={formData.instructorName}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="Prof. Maria Curie"
                  />
                </div>
              </div>

              {/* Row 3: Class weights and capacities */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Course Credits *</label>
                  <input
                    type="number"
                    name="credits"
                    required
                    min="1"
                    max="6"
                    value={formData.credits}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Max Hall Capacity *</label>
                  <input
                    type="number"
                    name="maxCapacity"
                    required
                    min="10"
                    max="150"
                    value={formData.maxCapacity}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Row 4: Schedule timeslot & classroom location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Weekly Schedule Slot *</label>
                  <input
                    type="text"
                    name="schedule"
                    required
                    value={formData.schedule}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="Mon/Wed 02:00 PM - 03:30 PM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Classroom Location Room *</label>
                  <input
                    type="text"
                    name="room"
                    required
                    value={formData.room}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="Franklin Hall 204"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-md"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
