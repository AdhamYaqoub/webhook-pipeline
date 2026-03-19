export type ProcessingActionType = 'echo' | 'extract_field' | 'template';

export interface Pipeline {
  id: string;
  name: string;
  description?: string | null;
  sourceToken: string;
  actionType: ProcessingActionType;
  actionConfig: unknown;
  createdAt: Date;
}

export interface Subscriber {
  id: string;
  pipelineId: string;
  targetUrl: string;
  headers: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export interface Job {
  id: string;
  pipelineId: string;
  payload: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  lastError?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

export type DeliveryStatus = 'success' | 'failed';

export interface DeliveryAttempt {
  id: string;
  jobId: string;
  subscriberId: string;
  status: DeliveryStatus;
  httpStatus?: number | null;
  responseBody?: string | null;
  error?: string | null;
  attemptNumber: number;
  createdAt: Date;
}

