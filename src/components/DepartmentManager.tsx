/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Landmark, DollarSign, MapPin, Award, X, AlertCircle } from 'lucide-react';
import { Department, UserProfile } from '../types';
import { dbService } from '../lib/db';

interface DepartmentManagerProps {
  currentUser: UserProfile | null;
}

export default function DepartmentManager({ currentUser }: DepartmentManagerProps) {
  // --- STATE DECLARATIONS ---
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    head: '',
    budget: 0,
    description: '',
    roomNumber: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // --- COMPONENT DID MOUNT DATA RETRIEVAL ---
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const list = await dbService.getDepartments();
      setDepartments([...list]);
    } catch (e) {
      setError('Could not download departments inventory.');
    } finally {
      setLoading(false);
    }
  };

  // --- FORM HANDLING ---
  const handleOpenAdd = () => {
    setFormData({
      id: `dept-${Date.now()}`,
      name: '',
      code: '',
      head: '',
      budget: 150000,
      description: '',
      roomNumber: ''
    });
    setIsEditing(false);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setFormData({ ...dept });
    setIsEditing(true);
    setError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? Number(value) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Code & ID poisoning and structure validations (conforming to regex guards)
    const idRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!idRegex.test(formData.code)) {
      setError('Department Code contain only alphanumeric letters and dashes.');
      return;
    }

    if (!formData.name || !formData.head || !formData.roomNumber) {
      setError('Please populate all compulsory department markers.');
      return;
    }

    try {
      if (isEditing) {
        await dbService.updateDepartment(formData as Department);
      } else {
        await dbService.addDepartment(formData as Department);
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setError(err.message || 'Operation forbidden due to security rules.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (currentUser?.role !== 'Admin') {
      alert('Security clearance of ADMIN level is required to delete faculties.');
      return;
    }

    if (confirm(`Are you certain you wish to purge ${name}? All historic assignments will be updated.`)) {
      try {
        await dbService.deleteDepartment(id);
        fetchDepartments();
      } catch (err: any) {
        alert(err.message || 'Database rule restriction block.');
      }
    }
  };

  const handleCSVExport = () => {
    dbService.exportCSV('departments');
  };

  // --- RENDER COMPONENT ---
  return (
    <div className="space-y-6">
      
      {/* Header and Call-To-Action Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Faculty Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure school programs, budgetary assignments, heads of faculties, and office suites.
          </p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button
            id="dept-export-btn"
            onClick={handleCSVExport}
            className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Export CSV
          </button>
          
          {/* Creating Departments restricted by default to Admin tier */}
          {currentUser?.role === 'Admin' && (
            <button
              id="add-dept-btn"
              onClick={handleOpenAdd}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-md inline-flex"
            >
              <Plus className="h-4 w-4" />
              <span>Create Department</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        /* Department Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => (
            <motion.div
              key={dept.id}
              layoutId={dept.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{dept.name}</h3>
                      <span className="inline-block mt-1 text-xs font-semibold bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-350 px-2.5 py-0.5 rounded-md">
                        Code: {dept.code}
                      </span>
                    </div>
                  </div>
                  
                  {/* Edit Controls */}
                  <div className="flex space-x-1 shrink-0 ml-4">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Edit details"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {currentUser?.role === 'Admin' && (
                      <button
                        onClick={() => handleDelete(dept.id, dept.name)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-655 transition-colors"
                        title="Purge Department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Body */}
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                  {dept.description}
                </p>
              </div>

              {/* Stats Footer Block */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-1.5">
                  <Award className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Faculty Head</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-205 truncate" title={dept.head}>{dept.head}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Annual Budget</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-205">${dept.budget.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="truncate">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Office Suite</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-205 truncate" title={dept.roomNumber}>{dept.roomNumber}</p>
                  </div>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL WINDOW */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Modify Faculty Details' : 'Register New Faculty Program'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-xl flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Department Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="e.g. Chemical Physics"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Code / Abbr *</label>
                  <input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="e.g. CHPH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Head of Department *</label>
                  <input
                    type="text"
                    name="head"
                    required
                    value={formData.head}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="Dr. Jordan West"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Operating Budget ($Value) *</label>
                  <input
                    type="number"
                    name="budget"
                    required
                    min="0"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Office Location / Suite *</label>
                <input
                  type="text"
                  name="roomNumber"
                  required
                  value={formData.roomNumber}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Babbage Suite 501"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Syllabus Overview Focus</label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                  placeholder="Elucidate on the curriculum boundaries and departments aims..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300 font-medium rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
