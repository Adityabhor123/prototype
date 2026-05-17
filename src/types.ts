export type ServiceType = 'License Services' | 'Vehicle Registration' | 'Renewal' | 'DL' | 'Registration'; // Keeping old ones for compatibility
export type TokenMode = 'online' | 'offline';
export type TokenPriority = 'normal' | 'senior';
export type TokenStatus = 'waiting' | 'calling' | 'completed' | 'missed';

export interface Token {
  id: string;
  tokenDisplayId: string;
  tokenNumber: number;
  name: string;
  serviceType: ServiceType;
  mode: TokenMode;
  priority: TokenPriority;
  status: TokenStatus;
  timestamp: any; // Firestore Timestamp
  calledAt?: any;
  completedAt?: any;
  userId?: string;
  counterNumber?: number;
}

export interface QueueCounters {
  lastTokenNumber: number;
  activeNormalSinceLastSenior: number;
}
