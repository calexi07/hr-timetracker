export type Role = 'admin' | 'employee'

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  employee_id: number | null
  created_at: string
}

export interface Timesheet {
  id: string
  user_id: string
  employee_id: number
  employee_name: string
  date: string
  check_in: string
  check_out: string
  hours_worked: number
  department: string
  created_at: string
  updated_at: string
}

export interface ParsedTimesheet {
  employee_id: number
  employee_name: string
  department: string
  date: string
  check_in: string
  check_out: string
  hours_worked: number
}

export interface UploadLog {
  id: string
  uploaded_by: string
  filename: string
  records_inserted: number
  status: 'success' | 'error'
  error_message: string | null
  created_at: string
}
