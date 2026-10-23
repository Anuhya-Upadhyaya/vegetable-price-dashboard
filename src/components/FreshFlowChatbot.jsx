
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../services/api";

const initialMessage = {
  role: "assistant",
  content:
    "Hello! I'm your FreshFlow AI assistant. Ask me about vegetable prices or anything else I can help with.",
};

const styles = `
.ff-chat-launcher {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9998;
  border: 0;
  border-radius: 999px;
  padding: 14px 20px;
  background: #1d663d;
  color: white;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 8px 28px #173d2b35;
  cursor: pointer;
}
.ff-chat-launcher:hover { background: #174f30; }

.ff-chat-panel {
  position: fixed;
  right: 24px;
  bottom: 88px;
  z-index: 9999;
  width: min(390px, calc(100vw - 28px));
  height: min(570px, calc(100dvh - 115px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e0e9df;
  border-radius: 18px;
  box-shadow: 0 18px 60px #173d2b30;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ff-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 17px;
  background: #173d2b;
  color: white;
}

.ff-chat-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ff-chat-logo {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: #e4efe2;
  color: #173d2b;
  font-weight: 800;
}

.ff-chat-header h3 { margin: 0; font-size: 14px; }
.ff-chat-header p { margin: 4px 0 0; font-size: 11px; color: #d0e0d3; }

.ff-chat-close {
  border: 0;
  background: transparent;
  color: white;
  font-size: 23px;
  cursor: pointer;
}

.ff-chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 17px 13px;
  background: #f7f9f5;
}

.ff-chat-message {
  max-width: 88%;
  padding: 11px 13px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ff-chat-message.assistant {
  align-self: flex-start;
  background: white;
  color: #263b2e;
  border: 1px solid #e4eae1;
  border-bottom-left-radius: 4px;
}

.ff-chat-message.user {
  align-self: flex-end;
  background: #1d663d;
  color: white;
  border-bottom-right-radius: 4px;
}

.ff-chat-error {
  margin: 0 13px 10px;
  padding: 9px 11px;
  border-radius: 9px;
  background: #fff0ee;
  color: #9b3028;
  font-size: 12px;
}

.ff-chat-form {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e6ebe4;
  background: white;
}

.ff-chat-input {
  min-width: 0;
  flex: 1;
  padding: 12px;
  border: 1px solid #dbe3d8;
  border-radius: 11px;
  outline: none;
  font: inherit;
  font-size: 13px;
}

.ff-chat-input:focus { border-color: #398053; }

.ff-chat-send {
  border: 0;
  border-radius: 11px;
  padding: 0 15px;
  background: #1d663d;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.ff-chat-send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ff-chat-note {
  padding: 0 12px 10px;
  color: #778379;
  font-size: 10px;
  text-align: center;
  background: white;
}

@media (max-width: 480px) {
  .ff-chat-panel {
    right: 10px;
    bottom: 78px;
    width: calc(100vw - 20px);
    height: min(570px, calc(100dvh - 95px));
  }
  .ff-chat-launcher { right: 14px; bottom: 14px; }
}
`;

export default function FreshFlowChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);
    setSending(true);

    try {
      const result = await sendChatMessage(message);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.answer || "The assistant returned an empty response.",
        },
      ]);
    } catch (err) {
      setError(
        err.message ||
          "Could not reach FreshFlow AI. Check the backend and try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <style>{styles}</style>

      <button
        type="button"
        className="ff-chat-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close FreshFlow AI chat" : "Open FreshFlow AI chat"}
      >
        {open ? "Close chat ×" : "✦ Ask FreshFlow AI"}
      </button>

      {open && (
        <section className="ff-chat-panel" aria-label="FreshFlow AI chatbot">
          <header className="ff-chat-header">
            <div className="ff-chat-brand">
              <div className="ff-chat-logo">VG</div>
              <div>
                <h3>FreshFlow AI Assistant</h3>
                <p>Powered by your local Ollama model</p>
              </div>
            </div>

            <button
              type="button"
              className="ff-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="ff-chat-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`ff-chat-message ${item.role}`}
              >
                {item.content}
              </div>
            ))}

            {sending && (
              <div className="ff-chat-message assistant">
                Thinking…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && <p className="ff-chat-error">{error}</p>}

          <form className="ff-chat-form" onSubmit={handleSubmit}>
            <input
              className="ff-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question..."
              aria-label="Your message"
              maxLength={4000}
              disabled={sending}
            />

            <button
              type="submit"
              className="ff-chat-send"
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </form>

          <div className="ff-chat-note">
            Responses may take a moment while the local model runs.
          </div>
        </section>
      )}
    </>
  );
}
