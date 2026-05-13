export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Procedure {
  id: string;
  name: string;
  category?: string;
  videoUrl: string;
  pdfUrl: string;
  description: string;
  zaloGroupUrl?: string;
}

export interface Appointment {
  id: string;
  citizenName: string;
  phone: string;
  citizenId: string;
  procedureId: string;
  procedureName: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  recordCode: string;
  processedBy?: string;
  processedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface SlotConfig {
  maxCapacity: number;
  currentCount: number;
}
