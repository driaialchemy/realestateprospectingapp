import { FAQ_ITEMS, OFF_TOPIC_PHRASES, OUTSIDE_ANSWER, UNKNOWN_ANSWER } from "./faq-data.js";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function answerFor(question) {
  const query = normalize(question);
  if (!query) return "";

  const faqMatch = FAQ_ITEMS.find((item) => item.keywords.some((keyword) => query.includes(keyword)));
  if (faqMatch) return faqMatch.answer;

  if (OFF_TOPIC_PHRASES.some((phrase) => query.includes(phrase))) return OUTSIDE_ANSWER;

  const chitChat = /^(hi|hello|hey|thanks|thank you|yo|sup)([!.? ]|$)/.test(query);
  if (chitChat) return OUTSIDE_ANSWER;

  return UNKNOWN_ANSWER;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function addMessage(log, role, text) {
  const bubble = el("p", `faq-msg faq-msg-${role}`, text);
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

const root = el("div", "faq-widget");
root.innerHTML = `
  <button type="button" class="faq-toggle" aria-expanded="false" aria-controls="faq-panel">
    <span class="faq-toggle-icon" aria-hidden="true">?</span>
    <span class="faq-toggle-label">Help</span>
  </button>
  <section id="faq-panel" class="faq-panel" hidden>
    <header class="faq-header">
      <h2>Dashboard help</h2>
      <button type="button" class="faq-close" aria-label="Close help">Close</button>
    </header>
    <div class="faq-log" role="log" aria-live="polite"></div>
    <form class="faq-form">
      <label class="faq-field">
        <span class="faq-sr">Ask a question</span>
        <input name="question" type="text" maxlength="240" placeholder="Ask about this site" autocomplete="off">
      </label>
      <button type="submit">Send</button>
    </form>
  </section>
`;

document.body.appendChild(root);

const toggle = root.querySelector(".faq-toggle");
const panel = root.querySelector("#faq-panel");
const close = root.querySelector(".faq-close");
const log = root.querySelector(".faq-log");
const form = root.querySelector(".faq-form");
const input = root.querySelector("input[name='question']");
let greeted = false;

function setOpen(open) {
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  root.classList.toggle("is-open", open);
  if (open && !greeted) {
    addMessage(log, "bot", "I can answer a few basics about this site. Try asking what the score means, or how to filter leads.");
    greeted = true;
  }
  if (open) input.focus();
}

toggle.addEventListener("click", () => setOpen(panel.hidden));
close.addEventListener("click", () => setOpen(false));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  addMessage(log, "user", question);
  addMessage(log, "bot", answerFor(question));
  input.value = "";
});
