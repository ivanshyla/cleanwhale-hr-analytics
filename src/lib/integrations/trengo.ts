// Интеграция с Trengo API

export interface TrengoConfig {
  apiToken: string;
  baseUrl?: string; // По умолчанию https://app.trengo.com/api/v2
}

export interface TrengoTicket {
  id: number;
  reference: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'PENDING' | 'SOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  created_at: string;
  updated_at: string;
  solved_at?: string;
  closed_at?: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  contact?: {
    id: number;
    name: string;
    email: string;
  };
  channel: {
    id: number;
    name: string;
    type: string;
  };
  tags: string[];
  custom_fields: Record<string, any>;
  first_response_time?: number; // в секундах
  resolution_time?: number; // в секундах
}

export interface TrengoMessage {
  id: number;
  ticket_id: number;
  body: string;
  message_type: 'INBOUND' | 'OUTBOUND' | 'NOTE';
  created_at: string;
  updated_at: string;
  sender: {
    id: number;
    name: string;
    email: string;
    type: 'USER' | 'CONTACT';
  };
  channel: {
    id: number;
    name: string;
    type: string;
  };
}

export interface TrengoMetrics {
  totalTickets: number;
  resolvedTickets: number;
  newTickets: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  avgResponseTime: number; // в часах
  avgResolutionTime: number; // в часах
  ticketsByStatus: {
    open: number;
    pending: number;
    solved: number;
    closed: number;
  };
  ticketsByPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}

export class TrengoIntegration {
  private config: TrengoConfig;
  private baseUrl: string;

  constructor(config: TrengoConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://app.trengo.com/api/v2';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Trengo API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
  }

  async getTickets(params: {
    since?: Date;
    until?: Date;
    status?: string;
    assignee_id?: number;
    page?: number;
    per_page?: number;
  } = {}): Promise<{ data: TrengoTicket[]; meta: any }> {
    const searchParams = new URLSearchParams();

    if (params.since) {
      searchParams.append('created_at[gte]', params.since.toISOString());
    }

    if (params.until) {
      searchParams.append('created_at[lte]', params.until.toISOString());
    }

    if (params.status) {
      searchParams.append('status', params.status);
    }

    if (params.assignee_id) {
      searchParams.append('assignee_id', params.assignee_id.toString());
    }

    searchParams.append('page', (params.page || 1).toString());
    searchParams.append('per_page', (params.per_page || 100).toString());

    const endpoint = `/tickets?${searchParams.toString()}`;
    return this.makeRequest(endpoint);
  }

  async getMessages(ticketId: number): Promise<{ data: TrengoMessage[] }> {
    return this.makeRequest(`/tickets/${ticketId}/messages`);
  }

  async getMessagesInPeriod(since: Date, until: Date): Promise<TrengoMessage[]> {
    try {
      // Получаем все тикеты за период
      const ticketsResponse = await this.getTickets({ since, until, per_page: 1000 });
      const tickets = ticketsResponse.data;

      // Получаем сообщения для каждого тикета
      const allMessages: TrengoMessage[] = [];
      
      for (const ticket of tickets) {
        try {
          const messagesResponse = await this.getMessages(ticket.id);
          const ticketMessages = messagesResponse.data.filter(message => {
            const messageDate = new Date(message.created_at);
            return messageDate >= since && messageDate <= until;
          });
          allMessages.push(...ticketMessages);
        } catch (error) {
          console.warn(`Failed to fetch messages for ticket ${ticket.id}:`, error);
        }
      }

      return allMessages;
    } catch (error) {
      console.error('Error fetching Trengo messages:', error);
      throw error;
    }
  }

  async getWeeklyMetrics(weekStart: Date, weekEnd: Date): Promise<TrengoMetrics> {
    try {
      // Получаем тикеты и сообщения за период
      const [ticketsResponse, messages] = await Promise.all([
        this.getTickets({ since: weekStart, until: weekEnd, per_page: 1000 }),
        this.getMessagesInPeriod(weekStart, weekEnd)
      ]);

      const tickets = ticketsResponse.data;

      // Считаем различные метрики
      const totalTickets = tickets.length;
      
      const resolvedTickets = tickets.filter(
        ticket => ticket.status === 'SOLVED' || ticket.status === 'CLOSED'
      ).length;

      const newTickets = tickets.filter(ticket => {
        const createdAt = new Date(ticket.created_at);
        return createdAt >= weekStart && createdAt <= weekEnd;
      }).length;

      const totalMessages = messages.length;
      const inboundMessages = messages.filter(msg => msg.message_type === 'INBOUND').length;
      const outboundMessages = messages.filter(msg => msg.message_type === 'OUTBOUND').length;

      // Вычисляем среднее время ответа (в часах)
      const ticketsWithResponseTime = tickets.filter(t => t.first_response_time);
      const avgResponseTime = ticketsWithResponseTime.length > 0 ?
        ticketsWithResponseTime.reduce((acc, t) => acc + (t.first_response_time! / 3600), 0) / ticketsWithResponseTime.length : 0;

      // Вычисляем среднее время решения (в часах)
      const ticketsWithResolutionTime = tickets.filter(t => t.resolution_time);
      const avgResolutionTime = ticketsWithResolutionTime.length > 0 ?
        ticketsWithResolutionTime.reduce((acc, t) => acc + (t.resolution_time! / 3600), 0) / ticketsWithResolutionTime.length : 0;

      // Группируем по статусам
      const ticketsByStatus = tickets.reduce((acc, ticket) => {
        const status = ticket.status.toLowerCase();
        switch (status) {
          case 'open':
            acc.open++;
            break;
          case 'pending':
            acc.pending++;
            break;
          case 'solved':
            acc.solved++;
            break;
          case 'closed':
            acc.closed++;
            break;
        }
        return acc;
      }, { open: 0, pending: 0, solved: 0, closed: 0 });

      // Группируем по приоритетам
      const ticketsByPriority = tickets.reduce((acc, ticket) => {
        const priority = ticket.priority.toLowerCase();
        switch (priority) {
          case 'low':
            acc.low++;
            break;
          case 'normal':
            acc.normal++;
            break;
          case 'high':
            acc.high++;
            break;
          case 'urgent':
            acc.urgent++;
            break;
        }
        return acc;
      }, { low: 0, normal: 0, high: 0, urgent: 0 });

      return {
        totalTickets,
        resolvedTickets,
        newTickets,
        totalMessages,
        inboundMessages,
        outboundMessages,
        avgResponseTime,
        avgResolutionTime,
        ticketsByStatus,
        ticketsByPriority,
      };
    } catch (error) {
      console.error('Error calculating Trengo metrics:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Проверяем подключение, получив первую страницу тикетов
      await this.getTickets({ per_page: 1 });
      return { success: true, message: 'Подключение к Trengo успешно установлено' };
    } catch (error) {
      console.error('Trengo connection test failed:', error);
      return { 
        success: false, 
        message: `Ошибка подключения к Trengo: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      };
    }
  }

  async getChannels(): Promise<{ data: any[] }> {
    return this.makeRequest('/channels');
  }

  async getUsers(): Promise<{ data: any[] }> {
    return this.makeRequest('/users');
  }
}

// Фабрика для создания Trengo интеграции
export function createTrengoIntegration(apiToken: string, baseUrl?: string): TrengoIntegration {
  return new TrengoIntegration({ apiToken, baseUrl });
}

// Валидация настроек Trengo
export function validateTrengoConfig(config: Partial<TrengoConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.apiToken || config.apiToken.trim() === '') {
    errors.push('API токен Trengo обязателен');
  }
  
  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    errors.push('URL API должен начинаться с http:// или https://');
  }
  
  return errors;
}

// Хелпер для маппинга Trengo статусов в наши статусы
export function mapTrengoStatus(trengoStatus: string): 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' {
  switch (trengoStatus.toUpperCase()) {
    case 'OPEN':
      return 'OPEN';
    case 'PENDING':
      return 'IN_PROGRESS';
    case 'SOLVED':
      return 'RESOLVED';
    case 'CLOSED':
      return 'CLOSED';
    default:
      return 'OPEN';
  }
}
