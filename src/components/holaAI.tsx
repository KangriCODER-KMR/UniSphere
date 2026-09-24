/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Bot, X, Send, Sparkles, AlertCircle } from 'lucide-react';
import { dbService } from '../lib/db';
import { UserProfile } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface HolaAIProps {
  currentUser: UserProfile;
}

export default function HolaAI({ currentUser }: HolaAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial friendly greeting
    const welcomeMsg: Message = {
      id: 'welcome',
      sender: 'bot',
      text: `Hello ${currentUser.name}! I am **holaAI**, your campus Madadgaar. 🌟\n\nI can help you dynamically fetch: \n- **My Attendance registers**\n- **Notices & events**\n- **Fee ledgers & structures**\n- **Digital library stocks**\n- **Campus placements**\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
  }, [currentUser]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate smart bot response after a brief delay
    setTimeout(() => {
      const botResponseText = generateAssistantReply(textToSend);
      const botMsg: Message = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const generateAssistantReply = (input: string): string => {
    const text = input.toLowerCase();

    // Context retrievals
    if (text.includes('attendance') || text.includes('absent') || text.includes('present')) {
      if (currentUser.role === 'student') {
        const studentObj = dbService.getStudents().find(s => s.id === currentUser.id || s.email === currentUser.email);
        if (studentObj) {
          return `Your biometric attendance is currently sitting at **${studentObj.currentAttendance}%**. ${
            studentObj.currentAttendance >= 75 
              ? 'Excellent! You satisfy the minimum 75% proctored requirement.' 
              : 'Warning: Your attendance is below 75%. Please attend lectures or contact your warden.'
          }`;
        }
        return 'We registered 85% general system attendance for your profile.';
      } else if (currentUser.role === 'teacher') {
        return 'Teachers can mark attendance from the "My Schedule" and "Mark Attendance" menus. Select your class code and enter rosters.';
      }
      return 'Biometric registers are currently 100% online across Babbage Block and Franklin Wing.';
    }

    if (text.includes('notice') || text.includes('news') || text.includes('bulletin')) {
      const activeNotices = dbService.getNotices();
      if (activeNotices.length > 0) {
        return `We have ${activeNotices.length} active announcements:\n\n` + 
          activeNotices.map((n, idx) => `${idx + 1}. **${n.title}** (${n.priority.toUpperCase()}) - *${n.content}*`).join('\n');
      }
      return 'No new announcements on the notice board today.';
    }

    if (text.includes('fee') || text.includes('payment') || text.includes('due') || text.includes('bill')) {
      if (currentUser.role === 'student') {
        const totalDue = 68000;
        const totalPaid = dbService.getPayments().filter(p => p.studentId === currentUser.id).reduce((sum, p) => sum + p.amount, 0);
        const rem = totalDue - totalPaid;
        return `Your tuition billing card lists:\n- **Total fees**: ₹${totalDue.toLocaleString()}\n- **Paid**: ₹${totalPaid.toLocaleString()}\n- **Outstanding Balance**: ₹${Math.max(0, rem).toLocaleString()}.\n\n${
          rem > 0 ? 'You can clear this instantly via the **Fee Payment** tab.' : 'Great! All fees are settled.'
        }`;
      }
      return 'General annual tuition budget details are managed in the Financial Ledger section under Admin.';
    }

    if (text.includes('library') || text.includes('book') || text.includes('borrow')) {
      const books = dbService.getBooks();
      return `Our digital library contains catalogs like:\n` + 
        books.map(b => `- **${b.title}** by ${b.author} (${b.available} copies available)`).join('\n') + 
        `\n\nYou can issue these instantly in the **Digital Library** services tab!`;
    }

    if (text.includes('placement') || text.includes('job') || text.includes('career') || text.includes('internship')) {
      const jobs = dbService.getJobs();
      return `Active recruitment drives currently live on campus:\n` + 
        jobs.map(j => `- **${j.company}** - *${j.position}* (${j.package || j.stipend})`).join('\n') + 
        `\n\nApply and monitor status under the **Placement Cell** view!`;
    }

    if (text.includes('complaint') || text.includes('grievance') || text.includes('canteen')) {
      if (currentUser.role === 'student') {
        const comps = dbService.getComplaints().filter(c => c.studentId === currentUser.id);
        return `You have **${comps.length}** logged complaints. You can submit new tickets for room leaks, electrical issues, or food quality, and track them under the **File Complaint** panel.`;
      }
      return 'Students can submit concerns through their portals, which are instantly routed to you in Admin Complaint Management.';
    }

    if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('help')) {
      return `Hi there, I am botJK! I can retrieve real-time details from your student cards, exams results, fee structures, library records, or jobs. Go ahead, ask me anything!`;
    }

    // Default response
    return `That’s a great question! While I explore your query about "${input}", note that you can access all these proctored parameters (Marketplace e-store, Hostels visitor logs, Timetables, and proctored active Exam Modules) straight from your responsive left sidebar tabs!`;
  };

  const suggestionPills = [
    'My Attendance?',
    'What notices are active?',
    'Fee bill balance?',
    'Recruitment drives?',
    'Library stocks?'
  ];

  return (
    <div id="holaai-assistant-widget">
      {/* Floating launcher trigger */}
      <button
        id="holaai-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 border border-purple-500/30 hover:scale-105 active:scale-95"
        title="Ask holaAI Madadgaar"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="holaai-panel"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-4 shrink-0 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                    <span>holaAI assistant</span>
                    <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300 animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest leading-none mt-1">Sultanpur Madadgaar</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conversation Log area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/80 custom-scrollbar">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white font-semibold rounded-tr-none'
                        : 'bg-slate-850 text-slate-100 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                    <div className="text-[9px] text-slate-400 mt-1 italic text-right">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-850 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-400 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Helper suggestion pills */}
            <div className="p-2 border-t border-slate-800/60 bg-slate-950 shrink-0 flex items-center overflow-x-auto gap-2 no-scrollbar">
              {suggestionPills.map((pill, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(pill)}
                  className="shrink-0 px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-indigo-300 font-bold hover:text-white hover:border-indigo-500 rounded-full transition-all cursor-pointer"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Form Input panel */}
            <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputValue);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask botJK anything (e.g. My Attendance?)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
