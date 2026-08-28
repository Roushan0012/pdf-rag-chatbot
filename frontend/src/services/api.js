// Uses VITE_API_URL environment variable if set, otherwise defaults to local Vite proxy '/api'
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Upload PDF to backend for parent-child chunking and hybrid indexing.
 */
export async function uploadPDF(file, sessionId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

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
  try {
    const response = await fetch(`${API_BASE}/chat`, {
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
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned error ${response.status}`);
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
  const res = await fetch(`${API_BASE}/session/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

/**
 * Clear memory for a session.
 */
export async function resetSession(sessionId) {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    method: 'DELETE',
  });
  return res.json();
}
