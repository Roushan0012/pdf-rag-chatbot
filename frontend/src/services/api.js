/**
 * Get active API Base URL from localStorage, env var, or local proxy.
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
  return import.meta.env.VITE_API_URL || '/api';
}

export function setApiBase(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('custom_backend_url');
  } else {
    localStorage.setItem('custom_backend_url', url.trim());
  }
}

/**
 * Check backend health status.
 */
export async function checkBackendHealth() {
  const apiBase = getApiBase();
  try {
    const res = await fetch(`${apiBase}/health`, { method: 'GET' });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, error: 'Server returned non-JSON response (HTML fallback).' };
    }
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message || 'Cannot reach backend server.' };
  }
}

/**
 * Upload PDF to backend for parent-child chunking and hybrid indexing.
 */
export async function uploadPDF(file, sessionId = null) {
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
    throw new Error(
      `Cannot connect to backend at "${apiBase}". If you are using Vercel, please provide your deployed Backend URL in Connection Settings.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend API not found at "${apiBase}" (received HTML instead of API response). Please ensure your Python Flask backend is running and connected.`
    );
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload and index PDF');
  }

  return data;
}

/**
 * Send chat message and stream response tokens + source metadata via SSE.
 */
export async function streamChatMessage({
  message,
  sessionId,
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
