export function getApiBaseUrl() {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    ''
  ).trim();

  const runtimeUrl = (
    (typeof window !== 'undefined' && window.__STAYFLOW_API_URL__) ||
    (typeof window !== 'undefined' && localStorage.getItem('stayflow_api_url')) ||
    ''
  ).trim();

  let rawUrl = runtimeUrl || envUrl;

  // On HTTPS cloud deployments (e.g. Vercel), ignore localhost/127.0.0.1 from static .env to prevent mixed content blocking
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawUrl && (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))) {
    if (!runtimeUrl) {
      rawUrl = '';
    }
  }

  if (rawUrl) {
    return rawUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  // Local development auto-fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000';
  }

  return '';
}

export const API_BASE_URL = getApiBaseUrl();

export function getToken() {
  try {
    const sessionToken = sessionStorage.getItem('stayflow_access_token');
    if (sessionToken) return sessionToken;
  } catch {}
  try {
    return localStorage.getItem('stayflow_access_token');
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (token) {
    try { sessionStorage.setItem('stayflow_access_token', token); } catch {}
    try { localStorage.setItem('stayflow_access_token', token); } catch {}
  } else {
    try { sessionStorage.removeItem('stayflow_access_token'); } catch {}
    try { sessionStorage.removeItem('stayflow_active_tenant_id'); } catch {}
    try { localStorage.removeItem('stayflow_access_token'); } catch {}
    try { localStorage.removeItem('stayflow_active_tenant_id'); } catch {}
    try { localStorage.removeItem('sf_dismissed_alerts'); } catch {}
  }
}

export function getActiveTenantId() {
  try {
    const sessionTid = sessionStorage.getItem('stayflow_active_tenant_id');
    if (sessionTid) return sessionTid;
  } catch {}
  try {
    return localStorage.getItem('stayflow_active_tenant_id') || null;
  } catch {
    return null;
  }
}

export function setActiveTenantId(tenantId) {
  if (tenantId) {
    try { sessionStorage.setItem('stayflow_active_tenant_id', String(tenantId)); } catch {}
    try { localStorage.setItem('stayflow_active_tenant_id', String(tenantId)); } catch {}
  } else {
    try { sessionStorage.removeItem('stayflow_active_tenant_id'); } catch {}
    try { localStorage.removeItem('stayflow_active_tenant_id'); } catch {}
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const activeTenantId = getActiveTenantId();

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  const headers = { 
    Accept: 'application/json', 
    ...(body && !(body instanceof FormData) && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), 
    ...options.headers 
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (activeTenantId && !headers['X-Tenant-Id']) {
    headers['X-Tenant-Id'] = String(activeTenantId);
  }

  const baseUrl = getApiBaseUrl();
  const targetUrl = baseUrl ? `${baseUrl}${path}` : path;
  let response;
  try {
    response = await fetch(targetUrl, { ...options, headers, body });
  } catch (err) {
    if (baseUrl) {
      throw new Error(
        `Backend server is unreachable at ${baseUrl}. Please ensure your Railway backend is deployed and active.`
      );
    } else {
      // If no base URL is set (e.g. running locally without .env), try 127.0.0.1:8000
      try {
        response = await fetch(`http://127.0.0.1:8000${path}`, { ...options, headers, body });
      } catch (innerErr) {
        throw new Error(
          'Backend server is unreachable. If deployed on Vercel, please set VITE_API_BASE_URL in your Vercel Project Settings > Environment Variables pointing to your Railway backend URL (e.g. https://your-backend.up.railway.app).'
        );
      }
    }
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      'Unable to reach API server (received HTML response). If deployed on Vercel, please set VITE_API_BASE_URL in your Vercel Project Settings > Environment Variables pointing to your Railway backend URL (e.g. https://your-app.up.railway.app).'
    );
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // If unauthorized and we have a token, attempt transparent token refresh
    if (response.status === 401 && token && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
      try {
        const refreshUrl = baseUrl ? `${baseUrl}/api/auth/refresh` : '/api/auth/refresh';
        let refreshRes = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        }).catch(() => null);

        if (!refreshRes || !refreshRes.ok) {
          refreshRes = await fetch(`http://127.0.0.1:8000/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ token })
          }).catch(() => null);
        }

        if (refreshRes && refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.access_token) {
            setToken(refreshData.access_token);
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${refreshData.access_token}`
            };
            const retryRes = await fetch(targetUrl, { ...options, headers: retryHeaders, body });
            if (retryRes.status === 204) return null;
            const retryPayload = await retryRes.json().catch(() => ({}));
            if (retryRes.ok) {
              return retryPayload;
            }
          }
        }
      } catch (e) {
        // Continue to regular error handling
      }
    }

    if (response.status === 401 && (path === '/api/auth/me' || !token)) {
      setToken(null);
    }
    let detail = payload.detail || payload.message || `Request failed (${response.status})`;
    if (Array.isArray(detail)) {
      detail = detail.map((d) => (d.msg ? `${d.loc ? d.loc.slice(1).join(' ') + ': ' : ''}${d.msg}` : JSON.stringify(d))).join(' | ');
    } else if (typeof detail !== 'string') {
      detail = JSON.stringify(detail);
    }
    throw new Error(detail);
  }
  return payload;
}

