// Shared types for the admin marketing dashboard. Extracted from page.tsx
// to keep the main file focused on UI orchestration.

export type MarketingMetrics = {
  signups7d: number;
  quiz7d: number;
  waitlist7d: number;
  proUsers: number;
  funnel: {
    quiz: number;
    waitlist: number;
    signup: number;
    pro: number;
  };
};

export type HistoryEntry = {
  id: string;
  channel: "telegram" | "email";
  segment: string;
  recipientCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
};

export type FeedbackItem = {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  page: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
};

export type FeedbackSummary = {
  total: number;
  avgRating: number | null;
  ratingDistribution: { rating: number; count: number }[];
  byType: { type: string; count: number }[];
};

export type Tab =
  | "telegram"
  | "email"
  | "metrics"
  | "feedback"
  | "atribucion"
  | "tagging"
  | "testimonials"
  | "referidos"
  | "trackers"
  | "plantillas"
  | "trafico";

export type EmailTemplateStats = {
  total: number;
  delivered: number;
  failed: number;
  bounced: number;
  queued: number;
  other: number;
  lastSentAt: string | null;
  lastError: string | null;
};

export type EmailTemplateRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: string;
  builderFn?: string;
  previewable: boolean;
  stats: EmailTemplateStats;
};

export type TemplatePreview = {
  ok: boolean;
  template?: { id: string; name: string; description: string };
  subject?: string;
  html?: string;
  text?: string;
  note?: string;
  error?: string;
  message?: string;
};

export type EmailTemplatesPayload = {
  categories: Record<string, string>;
  templates: EmailTemplateRow[];
  unknownTemplates: EmailTemplateRow[];
  totals: { cataloged: number; uncataloged: number };
};

export type TrackerStatus = {
  id: "ga4" | "meta_pixel" | "inspectlet";
  name: string;
  description: string;
  configured: boolean;
  identifier: string | null;
  envVar: string;
  dashboardUrl: string;
};

export type AttributionRow = {
  source: string;
  medium: string | null;
  campaign: string | null;
  signups: number;
  proUsers: number;
  proRate: number;
};

export type AttributionReport = {
  range: "7d" | "30d" | "90d" | "all";
  rangeStart: string | null;
  totalSignups: number;
  totalPro: number;
  overallProRate: number;
  rows: AttributionRow[];
};

export type TestimonialCandidate = {
  id: string;
  type: string;
  rating: number | null;
  message: string;
  createdAt: string;
  isPublicTestimonial: boolean;
  testimonialOrder: number | null;
  user: { name: string | null; email: string };
};

export type ReferralRow = {
  userId: string;
  name: string | null;
  email: string;
  invitesCreated: number;
  invitesUsed: number;
  invitesEarned: number;
  conversionRate: number;
};

export type ReferralReason = {
  reason: string;
  generated: number;
  used: number;
  conversionRate: number; // 0..1
};

export type ReferralRetentionWindow = {
  referred: number; // % retained (0..100)
  nonReferred: number;
  referredCohort: number;
  nonReferredCohort: number;
};

export type ReferralTimelinePoint = {
  date: string;
  generated: number;
  used: number;
};

export type ReferralSummary = {
  totalInvitationsCreated: number;
  totalInvitationsUsed: number;
  uniqueInviters: number;
  overallConversionRate: number;
  topInviters: ReferralRow[];
  pending: number;
  generated7d: number;
  used7d: number;
  generated30d: number;
  used30d: number;
  byReason: ReferralReason[];
  retention: {
    d7: ReferralRetentionWindow;
    d30: ReferralRetentionWindow;
  };
  dailyTimeline: ReferralTimelinePoint[];
};
