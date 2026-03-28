/* ===================================================================
 * Notification Management — shared types
 * =================================================================== */

export type ChannelType = "email" | "sms";

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "completed"
  | "cancelled";

export type TriggerType =
  | "manual"
  | "automated"
  | "campaign"
  | "system";

/* ---------- Config ---------- */

export interface NotificationConfig {
  id?: number;
  channelType: ChannelType;
  provider: string;
  enabled: boolean;
  config: Record<string, string>;
  senderName: string;
  senderAddress: string;
  dailyLimit: number;
  sentToday?: number;
}

/* ---------- Template ---------- */

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
}

export interface NotificationTemplate {
  id?: number;
  name: string;
  templateKey: string;
  channelType: ChannelType;
  subject: string;
  body: string;
  htmlBody?: string;
  isActive: boolean;
  isDefault?: boolean;
  variables?: TemplateVariable[];
}

/* ---------- Log ---------- */

export interface NotificationLog {
  id: number;
  channelType: ChannelType;
  recipient: string;
  recipientName?: string;
  templateKey?: string;
  subject?: string;
  body?: string;
  status: NotificationStatus;
  errorMessage?: string;
  externalId?: string;
  patientId?: number;
  patientName?: string;
  sentBy?: string;
  triggerType?: TriggerType;
  metadata?: Record<string, unknown>;
  sentAt: string;
  deliveredAt?: string;
  createdAt?: string;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalQueued: number;
}

/* ---------- Preference ---------- */

export type EventType =
  | "appointment_reminder"
  | "appointment_confirmation"
  | "lab_result_ready"
  | "prescription_ready"
  | "recall_due"
  | "billing_statement";

export interface NotificationPreference {
  id?: number;
  eventType: EventType;
  emailEnabled: boolean;
  smsEnabled: boolean;
  timing: string;
  templateId?: number;
}

/* ---------- Campaign ---------- */

export interface BulkCampaign {
  id?: number;
  name: string;
  channelType: ChannelType;
  templateId?: number;
  subject?: string;
  body?: string;
  targetCriteria?: Record<string, unknown>;
  totalRecipients?: number;
  sentCount?: number;
  failedCount?: number;
  status: CampaignStatus;
  scheduledAt?: string;
  createdBy?: string;
}
