/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin' | 'Admin' | 'Staff';

export interface UserProfile {
  id: string; // matches username or email or individual ID
  uid?: string; // fallback field for compatibility
  name: string;
  email: string;
  role: UserRole;
  department?: string; // used for teachers
  branch?: string; // used for students
  year?: number;
  section?: string;
  subjects?: string[];
  qualification?: string;
  experience?: string;
  designation?: string;
  joinedDate?: string;
  approved?: boolean;
  phone?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head: string;
  budget: number;
  description: string;
  roomNumber: string;
}

export type StudentStatus = 'Enrolled' | 'Suspended' | 'Graduated' | 'Inactive';
export type FinancialStatus = 'Paid' | 'Pending' | 'Overdue';

export interface Student {
  id: string; // Roll number, e.g., CS2024001
  name: string;
  branch: string;
  year: number;
  section: string;
  parentName: string;
  parentContact: string;
  parentEmail: string;
  address: string;
  currentAttendance: number;
  status?: StudentStatus;
  email?: string;
  admissionNo?: string;
  dob?: string;
  departmentId?: string;
  enrollmentDate?: string;
  gpa?: number;
  financialStatus?: FinancialStatus;
  contactNumber?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  department: string;
  qualification: string;
  experience: string;
  subjects: string[];
}

export interface Course {
  id: string; // Course ID, e.g., CS101
  name: string;
  credits: number;
  department: string; // e.g. "Computer Science" or code
  semester: string; // e.g. "Fall 2024"
  maxSeats: number;
  currentEnrolled: number;
  instructor: string;
  schedule: string;
  room: string;
}

export interface StudentRegistration {
  studentId: string;
  courseId: string;
  status: 'registered' | 'pending' | 'dropped';
  registrationDate: string;
  grade: string | null;
}

export interface Complaint {
  id: string;
  studentId: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'processing';
  date: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CollegeEvent {
  id: string;
  title: string;
  description: string;
  detailedDescription?: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  category: string;
  image: string;
  registrationLink?: string;
  featured?: boolean;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ParentMessage {
  id: string;
  studentId: string;
  teacherId: string;
  message: string;
  type?: string;
  date: string;
}

export interface Broadcast {
  id: string;
  audience: 'all' | 'students' | 'teachers' | string;
  priority?: 'normal' | 'important' | 'urgent';
  subject: string;
  message: string;
  date: string;
  from: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  audience: 'all' | 'students' | 'teachers' | 'admin';
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: string;
  meta?: {
    studentId?: string;
    complaintId?: string;
    memoryId?: string;
    priority?: string;
    courseId?: string;
  };
}

export interface BatchMemory {
  id: string;
  batchYear: number;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  addedBy?: string;
  timestamp?: string;
}

export interface TimetableSlot {
  time: string;
  subject: string;
  room: string;
  teacher?: string;
  type?: string; // 'Lecture' | 'Lab' | 'Tutorial'
}

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  sellerType: 'admin' | 'student';
  sellerId?: string; // Private, hidden from buyer
  sellerName?: string; // Private, hidden from buyer
  sellerEmail?: string; // Private, hidden from buyer
  price: number; // calculated Public Price: sellerPrice + commission
  originalPrice: number;
  stock: number;
  images: string[];
  condition: 'new' | 'used';
  rating: number;
  reviews: number;
  tags?: string[];
  listedDate?: string;
  status?: string;
}

export interface StoreProductPrivate {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  sellerPrice: number;
  adminCommission: number;
}

export interface MarketplaceSettings {
  id: string;
  globalType: 'percentage' | 'flat';
  globalPercentage: number;
  globalFlat: number;
  payoutBankName: string;
  payoutAccountNo: string;
  payoutRoutingCode: string;
  payoutAccountHolder: string;
  stripeConnected: boolean;
  stripeAccountId: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedDate?: string;
}

export interface MarketplaceOrder {
  id: string;
  studentId: string;
  studentName: string;
  items: {
    productId: string;
    title: string;
    price: number;
    quantity: number;
    thumbnail?: string;
  }[];
  totalAmount: number;
  adminCommissionEarned?: number;
  paymentStatus: 'paid' | 'pending';
  deliveryStatus: 'Processing' | 'Delivered' | 'Ready for Pickup';
  orderDate: string;
}

export interface PlacementJob {
  id: string;
  company: string;
  position: string;
  type: 'Internship' | 'Full Time';
  location: string;
  stipend: string; // stipend or package
  deadline: string;
  logo: string;
  description: string;
  eligibility?: string;
  package?: string;
  lastDate?: string;
}

export interface JobApplication {
  id: string;
  studentId: string;
  jobId: string;
  status: string;
  date?: string;
  applicationDate?: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  available: number;
  total: number;
  cover: string;
  category?: string;
  availableCopies?: number;
  totalCopies?: number;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
  status: 'issued' | 'returned' | 'overdue';
  fine?: number;
  returnDate?: string;
}

export interface Hostel {
  id: string;
  name: string;
  type: 'Boys' | 'Girls';
  roomTypes: string[];
  amenities: string[];
  monthlyRent: number;
  availableRooms: number;
  totalRooms: number;
  warden: {
    name: string;
    contact: string;
    office: string;
  };
  messMenu: Record<string, { Breakfast: string; Lunch: string; Dinner: string }>;
  image: string;
}

export interface HostelAllocation {
  id: string;
  studentId: string;
  hostelId: string;
  roomNo: string;
  roomType: string;
  allocationDate: string;
  checkinDate: string;
  status: 'active' | 'inactive' | 'pending';
  monthlyRent: number;
}

export interface OnlineExam {
  id: string;
  courseId: string;
  title: string;
  date: string;
  startTime: string;
  duration: number; // minutes
  totalMarks: number;
  status: 'upcoming' | 'active' | 'completed';
  instructions: string;
  syllabus: string;
  type: 'Theory' | 'Practical' | 'Quiz' | 'Hackathon';
}

export interface ExamResult {
  examId: string;
  score: number;
  total: number;
  remarks: string;
  date: string;
  title?: string;
  percentage?: number;
  grade?: string;
  resultDate?: string;
  id?: string;
  studentId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface FeeStructure {
  id: string;
  semester: string;
  tuitionFee: number;
  hostelFee: number;
  libraryFee: number;
  examFee: number;
  total: number;
  dueDate: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  semester: string;
  status: 'completed' | 'pending' | 'failed';
  paymentDate: string;
  transactionId?: string;
  paymentMethod?: string;
  purpose?: string;
  method?: string;
  date?: string;
   HisDate?: string;
}

export interface InstitutionalConfig {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
  domain: string;
  location: string;
  accentColor: string;
  logoSubtitle: string;
  foundationYear: string;
  historyText: string;
  currencySymbol: string;
}

