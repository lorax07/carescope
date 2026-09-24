import { useState, type FormEvent } from "react";

type ChatMessage = { role: "user" | "assistant"; text: string };

const OPENING =
  "Ask about turnaround time, productivity, or quality metrics.";

function answerFor(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("productivity") || q.includes("analyst")) {
    return "Productivity this week is 42 samples per analyst. The busiest bench is HPLC, at 96% of staffed hours.";
  }
  if (q.includes("quality") || q.includes("capa") || q.includes("ooc")) {
    return "Quality this month: 3 open CAPAs, 1.2% out-of-control results, and a 99.1% review-on-time rate.";
  }
  return "Average turnaround time this week is 18.4 hours. 94% of samples were released on time, across 126 released samples.";
}

export function InsightsChatPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: OPENING },
  ]);

  function ask(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: answerFor(question) },
    ]);
    setDraft("");
  }

  return (
    <div className="lims-page insights-chat">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Turn laboratory data into operational intelligence</p>
          <h1>Insights</h1>
        </div>
      </div>
      <section className="insights-thread" aria-live="polite">
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`insights-msg ${message.role}`}>
            {message.text}
          </p>
        ))}
      </section>
      <form className="insights-ask" onSubmit={ask}>
        <label className="sr-only" htmlFor="insights-question">
          Ask about laboratory metrics
        </label>
        <input
          id="insights-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about laboratory metrics"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">
          Ask
        </button>
      </form>
    </div>
  );
}
