// Интеграция с CRM системой (универсальная для различных CRM)

export interface CrmConfig {
  apiEndpoint: string;
  apiKey: string;
  projectId?: string;
  crmType: 'HUBSPOT' | 'SALESFORCE' | 'AMOCRM' | 'BITRIX24' | 'CUSTOM';
}

export interface CrmTicket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  tags: string[];
  resolutionTime?: number; // в минутах до решения
}

export interface CrmMetrics {
  totalTickets: number;
  resolvedTickets: number;
  newTickets: number;
  avgResponseTime: number; // в часах
  avgResolutionTime: number; // в часах
  ticketsByStatus: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  ticketsByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export class CrmIntegration {
  private config: CrmConfig;

  constructor(config: CrmConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiEndpoint}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...options.headers,
    };

    // Специфичные заголовки для разных CRM
    switch (this.config.crmType) {
      case 'HUBSPOT':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'AMOCRM':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'BITRIX24':
        // Bitrix24 использует другой формат авторизации (без Authorization header)
        break;
      default:
        break;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`CRM API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTickets(since?: Date, before?: Date, status?: string): Promise<CrmTicket[]> {
    try {
      let endpoint = '/tickets';
      const params = new URLSearchParams();

      if (since) {
        params.append('created_after', since.toISOString());
      }

      if (before) {
        params.append('created_before', before.toISOString());
      }

      if (status) {
        params.append('status', status);
      }

      if (this.config.projectId) {
        params.append('project_id', this.config.projectId);
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await this.makeRequest(endpoint);
      
      // Нормализуем ответ в зависимости от типа CRM
      return this.normalizeTickets(response);
    } catch (error) {
      console.error('Error fetching CRM tickets:', error);
      throw error;
    }
  }

  private normalizeTickets(response: any): CrmTicket[] {
    // Нормализация данных в зависимости от типа CRM
    switch (this.config.crmType) {
      case 'HUBSPOT':
        return this.normalizeHubSpotTickets(response);
      case 'AMOCRM':
        return this.normalizeAmoCrmTickets(response);
      case 'BITRIX24':
        return this.normalizeBitrixTickets(response);
      default:
        return this.normalizeGenericTickets(response);
    }
  }

  private normalizeHubSpotTickets(response: any): CrmTicket[] {
    return response.results?.map((ticket: any) => ({
      id: ticket.id,
      title: ticket.properties.subject || '',
      description: ticket.properties.content || '',
      status: this.mapHubSpotStatus(ticket.properties.hs_pipeline_stage),
      priority: this.mapHubSpotPriority(ticket.properties.hs_ticket_priority),
      createdAt: ticket.properties.createdate,
      updatedAt: ticket.properties.lastmodifieddate,
      resolvedAt: ticket.properties.closed_date,
      assignedTo: ticket.properties.hubspot_owner_id ? {
        id: ticket.properties.hubspot_owner_id,
        name: '',
        email: ''
      } : undefined,
      tags: [],
      resolutionTime: ticket.properties.time_to_close,
    })) || [];
  }

  private normalizeAmoCrmTickets(response: any): CrmTicket[] {
    return response._embedded?.leads?.map((lead: any) => ({
      id: lead.id.toString(),
      title: lead.name || '',
      description: '',
      status: this.mapAmoCrmStatus(lead.status_id),
      priority: 'MEDIUM' as const,
      createdAt: new Date(lead.created_at * 1000).toISOString(),
      updatedAt: new Date(lead.updated_at * 1000).toISOString(),
      resolvedAt: lead.closed_at ? new Date(lead.closed_at * 1000).toISOString() : undefined,
      tags: lead._embedded?.tags?.map((tag: any) => tag.name) || [],
    })) || [];
  }

  private normalizeBitrixTickets(response: any): CrmTicket[] {
    return response.result?.map((item: any) => ({
      id: item.ID,
      title: item.TITLE || '',
      description: item.DESCRIPTION || '',
      status: this.mapBitrixStatus(item.STATUS_ID),
      priority: this.mapBitrixPriority(item.PRIORITY),
      createdAt: item.DATE_CREATE,
      updatedAt: item.DATE_MODIFY,
      resolvedAt: item.CLOSED_DATE,
      assignedTo: item.ASSIGNED_BY_ID ? {
        id: item.ASSIGNED_BY_ID,
        name: '',
        email: ''
      } : undefined,
      tags: [],
    })) || [];
  }

  private normalizeGenericTickets(response: any): CrmTicket[] {
    return response.data || response.tickets || response.results || [];
  }

  async getWeeklyMetrics(weekStart: Date, weekEnd: Date): Promise<CrmMetrics> {
    try {
      const allTickets = await this.getTickets(weekStart, weekEnd);
      
      const resolvedTickets = allTickets.filter(
        ticket => ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
      );

      const newTickets = allTickets.filter(ticket => {
        const createdAt = new Date(ticket.createdAt);
        return createdAt >= weekStart && createdAt <= weekEnd;
      });


      // Вычисляем среднее время решения (в часах)
      const avgResolutionTime = resolvedTickets.reduce((acc, ticket) => {
        return acc + (ticket.resolutionTime ? ticket.resolutionTime / 60 : 0);
      }, 0) / (resolvedTickets.length || 1);

      // Группируем по статусам
      const ticketsByStatus = allTickets.reduce((acc, ticket) => {
        const status = ticket.status.toLowerCase();
        switch (status) {
          case 'open':
            acc.open++;
            break;
          case 'in_progress':
            acc.inProgress++;
            break;
          case 'resolved':
            acc.resolved++;
            break;
          case 'closed':
            acc.closed++;
            break;
        }
        return acc;
      }, { open: 0, inProgress: 0, resolved: 0, closed: 0 });

      // Группируем по приоритетам
      const ticketsByPriority = allTickets.reduce((acc, ticket) => {
        const priority = ticket.priority.toLowerCase();
        switch (priority) {
          case 'low':
            acc.low++;
            break;
          case 'medium':
            acc.medium++;
            break;
          case 'high':
            acc.high++;
            break;
          case 'urgent':
            acc.urgent++;
            break;
        }
        return acc;
      }, { low: 0, medium: 0, high: 0, urgent: 0 });

      return {
        totalTickets: allTickets.length,
        resolvedTickets: resolvedTickets.length,
        newTickets: newTickets.length,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        ticketsByStatus: { open: 0, inProgress: 0, resolved: 0, closed: 0 },
        ticketsByPriority: { low: 0, medium: 0, high: 0, urgent: 0 }
      };
    } catch (error) {
      console.error('Error calculating CRM metrics:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/tickets?limit=1');
      return true;
    } catch (error) {
      console.error('CRM connection test failed:', error);
      return false;
    }
  }

  // Маппинг статусов для разных CRM
  private mapHubSpotStatus(status: string): CrmTicket['status'] {
    const statusMap: Record<string, CrmTicket['status']> = {
      '1': 'OPEN',
      '2': 'IN_PROGRESS', 
      '3': 'RESOLVED',
      '4': 'CLOSED',
    };
    return statusMap[status] || 'OPEN';
  }

  private mapAmoCrmStatus(statusId: number): CrmTicket['status'] {
    // AmoCRM использует числовые ID статусов
    if (statusId <= 142) return 'OPEN';
    if (statusId === 143) return 'RESOLVED';
    return 'CLOSED';
  }

  private mapBitrixStatus(statusId: string): CrmTicket['status'] {
    const statusMap: Record<string, CrmTicket['status']> = {
      'NEW': 'OPEN',
      'IN_PROGRESS': 'IN_PROGRESS',
      'RESOLVED': 'RESOLVED',
      'CLOSED': 'CLOSED',
    };
    return statusMap[statusId] || 'OPEN';
  }

  private mapHubSpotPriority(priority: string): CrmTicket['priority'] {
    const priorityMap: Record<string, CrmTicket['priority']> = {
      'LOW': 'LOW',
      'MEDIUM': 'MEDIUM',
      'HIGH': 'HIGH',
      'URGENT': 'URGENT',
    };
    return priorityMap[priority] || 'MEDIUM';
  }

  private mapBitrixPriority(priority: string): CrmTicket['priority'] {
    const priorityMap: Record<string, CrmTicket['priority']> = {
      '1': 'LOW',
      '2': 'MEDIUM',
      '3': 'HIGH',
      '4': 'URGENT',
    };
    return priorityMap[priority] || 'MEDIUM';
  }
}

// Фабрика для создания CRM интеграции
export function createCrmIntegration(
  apiEndpoint: string,
  apiKey: string,
  crmType: CrmConfig['crmType'] = 'CUSTOM',
  projectId?: string
): CrmIntegration {
  return new CrmIntegration({ apiEndpoint, apiKey, crmType, projectId });
}

// Валидация настроек CRM
export function validateCrmConfig(config: Partial<CrmConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
    errors.push('URL API CRM обязателен');
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API ключ CRM обязателен');
  }
  
  if (config.apiEndpoint && !config.apiEndpoint.startsWith('http')) {
    errors.push('URL API должен начинаться с http:// или https://');
  }
  
  return errors;
}
