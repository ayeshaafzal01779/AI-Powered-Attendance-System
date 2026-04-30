(function () {
  // ── State ──
  let chatHistory = [];
  let isLoading = false;

  // ── DOM ──
  const bubble = document.getElementById("chat-bubble");
  const window_ = document.getElementById("chat-window");
  const closeBtn = document.getElementById("chat-close");
  const messages = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  if (!bubble) return; // chatbot HTML nahi hai toh kuch mat karo

  // ── Toggle ──
  bubble.addEventListener("click", () => {
    const isOpen = window_.style.display === "flex";
    window_.style.display = isOpen ? "none" : "flex";
    if (!isOpen && messages.children.length === 0) {
      addWelcomeMessage();
    }
  });

  closeBtn.addEventListener("click", () => {
    window_.style.display = "none";
  });

  // ── Send ──
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    addMsg(text, "user");
    input.value = "";
    setLoading(true);

    const typing = addMsg("AI is thinking...", "bot typing");

    try {
      const res = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          history: chatHistory,
        }),
      });

      const data = await res.json();
      typing.remove();

      if (data.status === "success") {
        addMsg(data.reply, "bot");
        // History update
        chatHistory.push({ role: "user", content: text });
        chatHistory.push({ role: "assistant", content: data.reply });
        // Sirf last 10 rakhna
        if (chatHistory.length > 20) {
          chatHistory = chatHistory.slice(-20);
        }
      } else {
        addMsg("Error: " + (data.message || "Unknown error"), "bot");
      }
    } catch (err) {
      typing.remove();
      addMsg("Fetch error: " + err.message, "bot");
    }

    setLoading(false);
  }

  function addMsg(text, type) {
    const div = document.createElement("div");
    div.className = `chat-msg ${type}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function setLoading(state) {
    isLoading = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  function addWelcomeMessage() {
    addMsg("Hello! I'm your AI assistant. How can I help you today? 😊", "bot");
  }
})();
