import { apiClient } from './apiClient';

export interface BugReportPayload {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  pageUrl?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
}

export interface FeatureRequestPayload {
  title: string;
  description: string;
}

class FeedbackService {
  async submitBugReport(payload: BugReportPayload) {
    const enriched = {
      ...payload,
      pageUrl: payload.pageUrl || window.location.href,
      userAgent: payload.userAgent || navigator.userAgent,
      browser: payload.browser || getBrowser(),
      os: payload.os || getOS(),
    };
    const response = await apiClient.post<any>('/mainframe/bug-reports', enriched);
    return response.data;
  }

  async submitFeatureRequest(payload: FeatureRequestPayload) {
    const response = await apiClient.post<any>('/mainframe/feature-requests', payload);
    return response.data;
  }
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Unknown';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

export const feedbackService = new FeedbackService();
