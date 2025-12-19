// Customer types
export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  customer_type?: "B2C" | "B2B";
  admin_manager?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  _id: string;
  customer_id: string;
  project_type?: string;
  project_description?: string;
  status: "draft" | "active" | "on_hold" | "completed" | "cancelled";
  current_phase?: string;
  createdAt: string;
}

// Phase types
export interface Phase {
  _id: string;
  project_id: string;
  name: string;
  type_of_phase: string;
  order: number;
  status: "pending" | "in_progress" | "completed" | "on_hold";
  payment_status: "not_required" | "pending" | "partial" | "completed";
  is_completed: boolean;
}

// Task types
export interface Task {
  _id: string;
  phase_id: string;
  name: string;
  type: string;
  status: "pending" | "in_progress" | "completed" | "blocked" | "cancelled";
  required: boolean;
  due_date?: string;
}

// Meeting types
export interface Attendee {
  _id?: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ActionItem {
  _id?: string;
  text: string;
  assignee?: string;
  due_date?: string;
  completed: boolean;
}

export interface Meeting {
  _id: string;
  project_id: string;
  phase_id: string;
  title: string;
  description?: string;
  summary?: string;
  attendees: Attendee[];
  action_items: ActionItem[];
  meeting_date: string;
  status: "scheduled" | "completed" | "cancelled";
}

// Notification types
export interface Notification {
  _id: string;
  customer_id: string;
  channel: "wati" | "email" | "in_app";
  title?: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  read: boolean;
  createdAt: string;
}

// Auth types
export interface Admin {
  _id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: Admin;
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: any; // Using any to avoid index signature conflicts with pagination property
}
