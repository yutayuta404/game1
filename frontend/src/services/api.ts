const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkError) {
      throw new Error('Cannot connect to server. Please ensure the backend is running on http://localhost:3001');
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      // Dead/expired session on a protected route: drop the token and let the app recover
      // (page reload triggers Telegram auto-login or shows the login screen).
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        this.setToken(null);
        setTimeout(() => window.location.reload(), 1200);
        throw new Error('Session expired — signing you back in…');
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  async login(username: string): Promise<{ user: any; token: string }> {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    this.setToken(data.token);
    return data;
  }

  async loginTelegram(initData: string): Promise<{ user: any; token: string }> {
    const data = await this.request<{ user: any; token: string }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: any }> {
    return this.request<{ user: any }>('/auth/me');
  }

  async getCurrentRound(): Promise<{ round: any; userBet: any }> {
    return this.request<{ round: any; userBet: any }>('/game/round');
  }

  async placeBet(selection: 'MESSI' | 'RONALDO', amount: number): Promise<{ success: boolean; bet: any; newBalance: number }> {
    return this.request<{ success: boolean; bet: any; newBalance: number }>('/game/bet', {
      method: 'POST',
      body: JSON.stringify({ selection, amount }),
    });
  }

  async settleRound(): Promise<any> {
    return this.request<any>('/game/settle', {
      method: 'POST',
    });
  }

  async getMyBets(): Promise<{ bets: any[] }> {
    return this.request<{ bets: any[] }>('/game/my-bets');
  }

  async getTransactions(): Promise<{ transactions: any[] }> {
    return this.request<{ transactions: any[] }>('/game/transactions');
  }

  async getVault(): Promise<{ vault: any }> {
    return this.request<{ vault: any }>('/game/vault');
  }

  async getChat(): Promise<{ messages: Array<{ id: string; userId: string; username: string; text: string; createdAt: string }> }> {
    return this.request<{ messages: any[] }>('/game/chat');
  }

  async sendChat(text: string): Promise<{ message: any }> {
    return this.request<{ message: any }>('/game/chat', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getRecentBets(): Promise<{ bets: Array<{ id: string; roundId: string; user: string; selection: 'MESSI' | 'RONALDO'; amount: number; createdAt: string }> }> {
    return this.request<{ bets: any[] }>('/game/recent-bets');
  }

  async getRoundHistory(): Promise<{ rounds: any[] }> {
    return this.request<{ rounds: any[] }>('/game/history');
  }

  async reportAudit(type: 'AUTO_START' | 'AUTO_CANCEL', detail: Record<string, unknown>): Promise<void> {
    try {
      await this.request('/game/audit', {
        method: 'POST',
        body: JSON.stringify({ type, detail }),
      });
    } catch { /* audit is best-effort */ }
  }

  async getMyPayments(): Promise<{ requests: any[] }> {
    return this.request<{ requests: any[] }>('/game/payment-requests');
  }

  async createPaymentRequest(payload: {
    type: 'TOPUP' | 'WITHDRAW';
    coins: number;
    packageLabel?: string;
    platform?: string;
    txnRef?: string;
    screenshot?: string;
    accountNumber?: string;
  }): Promise<{ success: boolean; request: any }> {
    return this.request<{ success: boolean; request: any }>('/game/payment-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async adminTopUp(username: string, amount: number, type: 'CREDIT' | 'DEBIT'): Promise<any> {
    return this.request<any>('/admin/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'admin-secret-key-for-topup',
      },
      body: JSON.stringify({ username, amount, type }),
    });
  }
}

export const api = new ApiService();