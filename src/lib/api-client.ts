import { API_BASE_URL } from '@/config/api';

class ApiClient {
    private getToken() {
        return localStorage.getItem('user_token');
    }

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = this.getToken();
        const headers = new Headers(options.headers);

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const json = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Clear auth data and redirect to login
                localStorage.removeItem('user_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            throw new Error(json.message || json.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Normalize ID to id recursively
        const normalize = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(normalize);
            if (obj !== null && typeof obj === 'object') {
                const newObj: any = {};
                for (const key in obj) {
                    if (key === 'ID') newObj.id = normalize(obj[key]);
                    else newObj[key] = normalize(obj[key]);
                }
                return newObj;
            }
            return obj;
        };

        return normalize(json.data) as T;
    }

    get<T>(endpoint: string, options?: RequestInit) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    post<T>(endpoint: string, body?: any, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body?: any, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string, options?: RequestInit) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
