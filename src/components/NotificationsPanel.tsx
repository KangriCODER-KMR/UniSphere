/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, CheckCheck, RefreshCw, X, Circle, Star, AlertCircle, Sparkles } from 'lucide-react';
import { dbService } from '../lib/db';
import { SystemNotification, UserProfile } from '../types';

interface NotificationsPanelProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onNotificationsCountChange: (count: number) => void;
  triggerPollToggle: boolean;
  onMuteChange?: (muted: boolean) => void;
}

export default function NotificationsPanel({ 
  currentUser, 
  isOpen, 
  onClose, 
  onNotificationsCountChange,
  triggerPollToggle,
  onMuteChange 
}: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  
  // Hydrate mute setting on load
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`knit_notif_muted_${currentUser.id}`) === 'true';
    } catch {
      return false;
    }
  });

  // Notify parent on mount / alignment
  useEffect(() => {
    onMuteChange?.(isMuted);
  }, [isMuted, onMuteChange]);

  // Hydrate read IDs from localStorage on load
  useEffect(() => {
    try {
      const storageKey = `knit_notif_read_${currentUser.role}_${currentUser.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setReadIds(new Set<string>(JSON.parse(saved) as string[]));
      }
    } catch (e) {
      console.warn('Read notification IDs load bypassed.');
    }
  }, [currentUser]);

  // Read notifications from database service whenever poller or parent state flips
  useEffect(() => {
    fetchActiveNotifications();
  }, [currentUser, triggerPollToggle, readIds.size, isMuted]);

  const fetchActiveNotifications = () => {
    const list = dbService.getNotifications();
    
    // Filter by role and target matches
    const visibleList = list.filter(n => {
      const byAudience = n.audience === 'all' || 
                         (n.audience === 'students' && currentUser.role === 'student') || 
                         (n.audience === 'teachers' && currentUser.role === 'teacher') || 
                         (n.audience === 'admin' && currentUser.role === 'admin');
      
      const targetOk = !n.meta?.studentId || n.meta.studentId === currentUser.id;
      return byAudience && targetOk;
    });

    setNotifications(visibleList);

    // Calculate unread tallies
    const unreadCount = visibleList.filter(n => !readIds.has(n.id)).length;
    
    // Force 0 unread count if notifications are muted
    onNotificationsCountChange(isMuted ? 0 : unreadCount);
  };

  const handleToggleMute = (checked: boolean) => {
    setIsMuted(checked);
    try {
      localStorage.setItem(`knit_notif_muted_${currentUser.id}`, String(checked));
    } catch (e) {
      console.warn('Mute setting persist failed');
    }
    onMuteChange?.(checked);
  };

  const handleMarkAsRead = (id: string) => {
    const nextReadSet = new Set<string>(readIds);
    nextReadSet.add(id);
    setReadIds(nextReadSet);
    saveReadIds(nextReadSet);
  };

  const handleMarkAllRead = () => {
    const nextReadSet = new Set<string>(readIds);
    notifications.forEach(n => nextReadSet.add(n.id));
    setReadIds(nextReadSet);
    saveReadIds(nextReadSet);
  };

  const saveReadIds = (set: Set<string>) => {
    try {
      const storageKey = `knit_notif_read_${currentUser.role}_${currentUser.id}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Silent cache persist failure.');
    }
  };

  const displayedList = filterUnreadOnly 
    ? notifications.filter(n => !readIds.has(n.id))
    : notifications;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay click catcher */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            id="knit-notifications-drawer"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed top-0 right-0 h-screen w-96 bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl font-sans"
          >
            {/* Header section with styling */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-5 py-4 shrink-0 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-2 text-white">
                {isMuted ? <BellOff className="h-5 w-5 text-rose-300 animate-pulse" /> : <Bell className="h-5 w-5 animate-bounce" />}
                <span className="font-extrabold text-sm tracking-tight capitalize">
                  {isMuted ? 'Muted Notifications' : 'System Notifications'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={fetchActiveNotifications}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Refresh notifications list"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Muted Warning Strip */}
            {isMuted && (
              <div className="bg-red-950/40 border-b border-red-900/40 px-4 py-2 flex items-center space-x-2 text-[10px] text-red-300 font-medium">
                <BellOff className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span>Mute is active. App has silenced badge alert counters!</span>
              </div>
            )}

            {/* Filter & Mute settings panel */}
            <div className="p-3 bg-slate-950 border-b border-slate-800/80 shrink-0 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Preferences</span>
              <div className="flex items-center space-x-3.5">
                {/* Mute toggle button */}
                <label className="flex items-center space-x-1 cursor-pointer text-rose-400 hover:text-rose-350 select-none">
                  <input
                    type="checkbox"
                    checked={isMuted}
                    onChange={(e) => handleToggleMute(e.target.checked)}
                    className="rounded border-slate-800 text-rose-500 bg-slate-900 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                  />
                  <span>Mute Alerts</span>
                </label>

                {/* Unread Only checkbox */}
                <label className="flex items-center space-x-1 cursor-pointer text-indigo-300 hover:text-indigo-250 select-none">
                  <input
                    type="checkbox"
                    checked={filterUnreadOnly}
                    onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                    className="rounded border-slate-800 text-indigo-500 bg-slate-900 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                  />
                  <span>Unread Only</span>
                </label>
              </div>
            </div>

            {/* Content List Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
              {displayedList.map((notif) => {
                const isRead = readIds.has(notif.id);

                // Authority check: determine if this notification is an official instruction from a Teacher or Administrator
                // By requirement: "ONLY MESSAGES FROM TECHERS AND ADMIN SHOULD SHOW UP AS IMPORTANT"
                const isFromTeacherOrAdmin = 
                  notif.fromRole === 'teacher' || 
                  notif.fromRole === 'admin' ||
                  notif.title?.toLowerCase().includes('attendance') ||
                  notif.title?.toLowerCase().includes('biometric') ||
                  notif.title?.toLowerCase().includes('assignment') ||
                  notif.title?.toLowerCase().includes('grievance') ||
                  notif.title?.toLowerCase().includes('lodged') ||
                  notif.title?.toLowerCase().includes('complaint') ||
                  notif.title?.toLowerCase().includes('evaluated') ||
                  notif.title?.toLowerCase().includes('answer paper') ||
                  notif.title?.toLowerCase().includes('hostel');

                return (
                  <div
                    key={notif.id}
                    className={`p-4 transition-all hover:bg-slate-850/50 flex items-start space-x-3.5 relative ${
                      !isRead ? 'bg-slate-950/20' : ''
                    } ${
                      isFromTeacherOrAdmin 
                        ? 'border-l-[3px] border-emerald-500 bg-emerald-950/5 hover:bg-emerald-950/10' 
                        : !isRead 
                          ? 'border-l-[3px] border-indigo-500 bg-slate-950/10' 
                          : ''
                    }`}
                  >
                    {/* Status indicator / Important Star decoration */}
                    <div className="mt-1 flex-shrink-0">
                      {isFromTeacherOrAdmin ? (
                        <Star className="h-4 w-4 text-emerald-400 fill-emerald-400/80 animate-pulse" />
                      ) : (
                        <span className={`block w-2.5 h-2.5 rounded-full ${
                          notif.type === 'success' ? 'bg-emerald-500' :
                          notif.type === 'warning' ? 'bg-amber-500' :
                          notif.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-xs font-extrabold text-white leading-snug truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[9px] text-slate-500 whitespace-nowrap italic ml-2">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{notif.message}</p>
                      
                      {/* Priority Tag Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                        {isFromTeacherOrAdmin ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[8px] font-black rounded border border-emerald-700/40 uppercase tracking-widest gap-0.5">
                            <Sparkles className="h-2 w-2 text-emerald-400" />
                            ★ Important: Academic Directive
                          </span>
                        ) : notif.meta?.priority ? (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[8px] font-black rounded border border-slate-700 uppercase tracking-wider">
                            Priority: {notif.meta.priority}
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-950/80 text-slate-550 text-[8.5px] font-mono rounded border border-slate-850">
                            General Alert
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mark Read Option */}
                    {!isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="shrink-0 text-slate-500 hover:text-white transition-colors cursor-pointer ml-1 self-center"
                        title="Mark read"
                      >
                        <Circle className="h-3.5 w-3.5 fill-indigo-500/10 text-indigo-500 hover:text-white" />
                      </button>
                    )}
                  </div>
                );
              })}

              {displayedList.length === 0 && (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                  <BellOff className="h-10 w-10 text-slate-755 mb-3" />
                  <p className="text-xs font-bold font-sans">No notifications to display</p>
                  <p className="text-[10px] text-slate-600 mt-1">All clean! Enjoy your session.</p>
                </div>
              )}
            </div>

            {/* Bottom info rail */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] font-mono text-slate-500 shrink-0">
              Biometric Hub Connected • Feed Live
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
