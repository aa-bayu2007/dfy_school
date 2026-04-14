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
            if (response.status === 401 && !endpoint.includes('/auth/login')) {
                // Clear auth data and redirect to login
                localStorage.removeItem('user_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }

            // Sanitize technical errors (5xx)
            if (response.status >= 500) {
                throw new Error('Terjadi kesalahan pada server. Silakan coba lagi nanti.');
            }

            // Provide a default message for 4xx if json.message or json.error is missing
            const errorMessage = json.message || json.error || `Gagal memproses permintaan (${response.status})`;
            throw new Error(errorMessage);
        }

        // Normalize ID to id recursively
        const normalize = (obj: unknown): unknown => {
            if (Array.isArray(obj)) {
                return obj.map(normalize);
            }
            if (obj !== null && typeof obj === 'object') {
                const newObj: Record<string, unknown> = {};
                const typedObj = obj as Record<string, unknown>;
                for (const key in typedObj) {
                    const value = typedObj[key];
                    if (key === 'ID') {
                        newObj.id = normalize(value);
                    } else if ((key.toLowerCase() === 'nis' || key.toLowerCase() === 'nip') && typeof value === 'string') {
                        // Remove trailing .0 from NIS/NIP if present
                        newObj[key] = value.endsWith('.0') ? value.slice(0, -2) : value;
                    } else {
                        newObj[key] = normalize(value);
                    }
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

    post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    put<T>(endpoint: string, body?: unknown, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    patch<T>(endpoint: string, body?: unknown, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    delete<T>(endpoint: string, body?: unknown, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'DELETE',
            body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
        });
    }
}

export const apiClient = new ApiClient();
