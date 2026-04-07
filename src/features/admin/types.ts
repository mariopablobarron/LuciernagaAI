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

export interface DomainDecision {
  state: string;
  type: string;
  reason: string;
  confidence: string;
  recommendedActions: string[];
}

export interface TodayDecision {
  id: string;
  priority: Priority;
  title: string;
  description: string;
  action: string;
}

export interface DecisionMetricsData {
  samples: number;
  stateDistribution: Record<string, number>;
  stateRatios: Record<string, number>;
  decisionTypeCounts: Record<string, number>;
}

export interface EventMetrics {
  totalEventsLast7d: number;
  messagesPerUserLast7d: number;
  actionsCompletedLast7d: number;
  actionsCreatedLast7d: number;
  actionsPerConversation: number;
  actionCompletionRate: number;
  avoidanceRate: number;
  eventsByType: Record<string, number>;
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
    behaviorBased?: {
      blockedUsersCount: number;
      activeUsersCount: number;
      avoidanceUsersCount: number;
      crisisUsersCount: number;
    };
  };
  decision: {
    decision: string;
    reason: string;
    priority: Priority;
    action: string;
  };
  domainDecision?: DomainDecision;
  decisionsToday?: TodayDecision[];
  decisionMetrics?: DecisionMetricsData;
  events?: EventMetrics;
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
