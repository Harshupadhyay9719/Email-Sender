const getApiBaseUrl = () => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv.VITE_API_URL) {
    return metaEnv.VITE_API_URL;
  }
  const { protocol, hostname, port } = window.location;
  if (port === '5173' || port === '3000') {
    return `${protocol}//${hostname}:5000/api/v1`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}/api/v1`;
};

export const API_BASE_URL = getApiBaseUrl();

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle CSV/Binary downloads directly
  const contentType = response.headers.get('Content-Type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('spreadsheetml'))) {
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return (await response.blob()) as any;
  }

  if (response.status === 401) {
    // Session expired
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect if not on login page
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'API Request failed');
  }

  // Backend response format: { success: boolean, statusCode: number, message: string, data?: T }
  return result.data;
}
