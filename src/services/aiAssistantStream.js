import { API_BASE as API } from "../config";

function authHeaders() {
  const token = sessionStorage.getItem("iam_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POSTs to an SSE endpoint and invokes `handlers` as frames arrive.
 * handlers: { onMeta, onDelta, onToolCall, onConfirmRequired, onDone, onError }
 * Returns an AbortController so the caller can cancel an in-flight stream
 * (e.g. the user navigates away or starts a new message).
 */
function postAndStream(path, body, handlers) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...authHeaders(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        handlers.onError?.(`Request failed (${res.status}). Please try again.`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line.
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const rawFrame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          dispatchFrame(rawFrame, handlers);
        }
      }
      // Flush any trailing partial frame (some servers omit the final blank line).
      if (buffer.trim()) dispatchFrame(buffer, handlers);
    } catch (err) {
      if (err.name !== "AbortError") {
        handlers.onError?.("Lost connection to the AI assistant. Please try again.");
      }
    }
  })();

  return controller;
}

function dispatchFrame(rawFrame, handlers) {
  let eventName = "message";
  const dataLines = [];
  for (const line of rawFrame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  const data = dataLines.join("\n");

  switch (eventName) {
    case "meta": {
      try { handlers.onMeta?.(JSON.parse(data)); } catch { /* ignore */ }
      break;
    }
    case "delta":
      if (data) handlers.onDelta?.(data);
      break;
    case "tool_call": {
      try { handlers.onToolCall?.(JSON.parse(data)); } catch { /* ignore */ }
      break;
    }
    case "confirm_required": {
      try { handlers.onConfirmRequired?.(JSON.parse(data)); } catch { /* ignore */ }
      break;
    }
    case "done":
      handlers.onDone?.();
      break;
    case "error":
      handlers.onError?.(data || "Something went wrong.");
      break;
    default:
      break;
  }
}

export function streamAssistantMessage({ conversationId, message }, handlers) {
  return postAndStream("/api/ai/assistant/stream", { conversationId, message }, handlers);
}

export function streamAssistantConfirm({ actionId, approve }, handlers) {
  return postAndStream("/api/ai/assistant/confirm", { actionId, approve }, handlers);
}

export async function fetchConversations() {
  const res = await fetch(`${API}/api/ai/assistant/conversations`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchConversationMessages(conversationId) {
  const res = await fetch(`${API}/api/ai/assistant/conversations/${conversationId}/messages`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}
