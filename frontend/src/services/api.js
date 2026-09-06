const PRIMARY_PRODUCTION_BACKEND = 'https://pdf-rag-chatbot-3-yw6u.onrender.com/api';
const FALLBACK_PRODUCTION_BACKEND = 'https://pdf-rag-backend-cvxe.onrender.com/api';

/**
 * Get active API Base URL from localStorage, env var, or live production default.
 */
export function getApiBase() {
  const customUrl = localStorage.getItem('custom_backend_url');
  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && !clean.includes('/api/')) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    let clean = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && !clean.includes('/api/')) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  // Local development fallback
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '/api';
  }

  // Production default: connects seamlessly to your latest live Render backend for all visitors
  return PRIMARY_PRODUCTION_BACKEND;
}

export function setApiBase(url) {
  if (
    !url ||
    !url.trim() ||
    url.trim() === PRIMARY_PRODUCTION_BACKEND ||
    url.trim() === FALLBACK_PRODUCTION_BACKEND
  ) {
    localStorage.removeItem('custom_backend_url');
  } else {
    localStorage.setItem('custom_backend_url', url.trim());
  }
}

/**
 * Check backend health status with timeout and fallback support.
 */
export async function checkBackendHealth() {
  const apiBase = getApiBase();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${apiBase}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, error: 'Server returned non-JSON response (HTML fallback).' };
    }
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    // If primary backend failed, test fallback
    if (apiBase === PRIMARY_PRODUCTION_BACKEND) {
      try {
        const fbRes = await fetch(`${FALLBACK_PRODUCTION_BACKEND}/health`, { method: 'GET' });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          return { ok: true, data: fbData };
        }
      } catch (fbErr) {
        // pass
      }
    }
    return { ok: false, error: err.message || 'Cannot reach backend server.' };
  }
}

/**
 * Upload PDF to backend for parent-child chunking and hybrid indexing.
 * Automatically retries if server was sleeping on cold-start.
 */
export async function uploadPDF(file, sessionId = null, retryCount = 0) {
  const apiBase = getApiBase();
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  let response;
  try {
    response = await fetch(`${apiBase}/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (netErr) {
    // If server was sleeping or cold-starting, auto-retry once after 3.5s
    if (retryCount < 2) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return uploadPDF(file, sessionId, retryCount + 1);
    }
    throw new Error(
      `Unable to reach backend (${netErr.message || 'Network error'}). The server is warming up. Please try uploading once more.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (retryCount < 2) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return uploadPDF(file, sessionId, retryCount + 1);
    }
    throw new Error(
      `Server returned unexpected response (${response.status}). The engine is waking up. Please retry in a moment.`
    );
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload and index PDF');
  }

  return data;
}

/**
 * Ingest bundled sample document for instant testing.
 */
export async function loadSamplePDF(sessionId = null) {
  const apiBase = getApiBase();
  let response;
  try {
    response = await fetch(`${apiBase}/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch (netErr) {
    throw new Error(`Unable to reach backend: ${netErr.message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned non-JSON response (${response.status}).`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load sample PDF');
  }

  return data;
}

/**
 * Send chat message and stream response tokens + source metadata via SSE.
 */
export async function streamChatMessage({
  message,
  sessionId,
  topK = 15,
  topN = 5,
  temperature = 0.1,
  model = null,
  onSources,
  onToken,
  onDone,
  onError,
  signal
}) {
  const apiBase = getApiBase();
  try {
    const response = await fetch(`${apiBase}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        stream: true,
        topK,
        topN,
        temperature,
        model,
      }),
      signal,
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errMsg = `Server returned error ${response.status}`;
      if (contentType.includes('application/json')) {
        const errData = await response.json().catch(() => ({}));
        errMsg = errData.error || errMsg;
      }
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep unfinished line in buffer

      let currentEvent = 'message';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim();
        } else if (trimmed.startsWith('data:')) {
          const rawData = trimmed.replace('data:', '').trim();
          try {
            const parsed = JSON.parse(rawData);

            if (currentEvent === 'sources') {
              if (onSources) onSources(parsed);
            } else if (currentEvent === 'token') {
              if (onToken) onToken(parsed.token);
            } else if (currentEvent === 'done') {
              if (onDone) onDone(parsed);
            } else if (currentEvent === 'error') {
              if (onError) onError(new Error(parsed.error));
            }
          } catch (jsonErr) {
            console.error('Error parsing SSE JSON:', jsonErr, rawData);
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Stream aborted by user');
    } else {
      if (onError) onError(err);
    }
  }
}

/**
 * Fetch status of an existing session.
 */
export async function getSessionStatus(sessionId) {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/session/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

/**
 * Clear memory for a session.
 */
export async function resetSession(sessionId) {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/session/${sessionId}`, {
    method: 'DELETE',
  });
  return res.json();
}

/**
 * Remove only the active indexed document from session.
 */
export async function removeDocument(sessionId) {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/document/${sessionId}`, {
    method: 'DELETE',
  });
  return res.json();
}

