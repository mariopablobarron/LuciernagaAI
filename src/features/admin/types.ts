export type Priority = "low" | "medium" | "high";

export interface Insight {
  type: string;
  title: string;
  content: string;
  action: string;
  priority: Priority;
}

export interface AlertItem {
  type: "critical" | "warning";
  title: string;
  message: string;
}

export interface AdminInsightsResponse {
  metrics: {
    retentionDay3: number;
    retentionDay7: number;
    dropOffPoint: string;
    checkinDrop: number;
    dominantState: string;
    confidence?: "low" | "medium" | "high";
    sampleSize?: number;
  };
  activity: {
    usersCreatedLast7d: number;
    activeUsersLast7d: number;
    messagesLast7d: number;
    checkinsLast7d: number;
  };
  segments: {
    totalUsers: number;
    newUsers: number;
    returningUsers: number;
    activeNewUsers: number;
    activeReturningUsers: number;
    inactiveUsers: number;
  };
  decision: {
    decision: string;
    reason: string;
    priority: Priority;
    action: string;
  };
  alerts: AlertItem[];
  insights: Insight[];
  crisis: {
    last24h: {
      total: number;
      high: number;
      critical: number;
    };
    latestEvents: Array<{
      userId: string;
      level: "high" | "critical";
      message: string;
      createdAt: string;
    }>;
  };
  avoidance: {
    last7d: {
      total: number;
      postpone: number;
      refuse: number;
      uniqueUsers: number;
    };
    topActions: Array<{
      actionId: string;
      description: string;
      goalTitle: string | null;
      total: number;
      postpone: number;
      refuse: number;
    }>;
  };
  decisionHistory?: Array<{
    id: string;
    metric: string;
    value: number;
    decision: string;
    createdAt: string;
  }>;
  insightHistory?: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    action: string;
    priority: Priority;
    confidence: "low" | "medium" | "high";
    createdAt: string;
  }>;
}
