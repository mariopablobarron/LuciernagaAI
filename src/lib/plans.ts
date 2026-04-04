export type Plan = 'free' | 'pro';

export const PLANS = {
  free: {
    name: 'Gratis',
    price: 0,
    limits: {
      conversationsPerMonth: 10,
      messagesPerConversation: 20,
      impulsoEnabled: false,
      diagnosticoEnabled: true,
    },
  },
  pro: {
    name: 'Pro',
    price: 9,
    currency: '€',
    interval: 'mes',
    limits: {
      conversationsPerMonth: Infinity,
      messagesPerConversation: Infinity,
      impulsoEnabled: true,
      diagnosticoEnabled: true,
    },
  },
} as const;

export const FREE_LIMIT_MESSAGE = 'Has alcanzado el límite del plan gratuito. Actualiza a Pro para conversaciones ilimitadas.';
