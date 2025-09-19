// API client that can route to local or Vercel backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiRequestOptions extends RequestInit {
  token?: string;
}

export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const { token, ...fetchOptions } = options;
  
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  return response;
}

// Helper for common GET requests with auth
export async function apiGet(endpoint: string, token?: string) {
  return apiRequest(endpoint, { method: 'GET', token });
}

// Helper for common POST requests with auth
export async function apiPost(endpoint: string, data: any, token?: string) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

// Helper for common PUT requests with auth
export async function apiPut(endpoint: string, data: any, token?: string) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  });
}

// Helper for common DELETE requests with auth
export async function apiDelete(endpoint: string, token?: string) {
  return apiRequest(endpoint, { method: 'DELETE', token });
}
