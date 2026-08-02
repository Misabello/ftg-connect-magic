import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askDataAgent } from "@/lib/ftg/agent.functions";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuánto se vendió en los últimos 7 días por sede?",
  "¿Qué productos tienen stock bajo?",
  "¿Hay cajas abiertas ahora?",
  "¿Cuánto tengo por cobrar y vencido?",
];

export function DataAgentDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ask = useServerFn(askDataAgent);
  const { language } = useI18n();

  const mutation = useMutation({
    mutationFn: (history: ChatMessage[]) => ask({ data: { messages: history, language } }),
    onSuccess: (result) => {
      setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `No pude responder: ${error.message}` },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function send(text: string) {
    const value = text.trim();
    if (!value || mutation.isPending) return;
    const history = [...messages, { role: "user" as const, content: value }];
    setMessages(history);
    setInput("");
    mutation.mutate(history.slice(-12));
    inputRef.current?.focus();
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[540px] max-h-[75vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6">
          <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">FTG Copiloto</p>
              <p className="truncate text-xs text-muted-foreground">Consultas sobre tus datos</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar agente">
              <X className="size-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Preguntame sobre ventas, cajas, stock, clientes, finanzas, fotos u operaciones.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "prose prose-sm max-w-none text-foreground dark:prose-invert",
                  )}
                >
                  {message.role === "user" ? (
                    message.content
                  ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {mutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Analizando la base…
              </div>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Escribí tu consulta…"
              className="min-h-[44px] resize-none"
            />
            <Button type="submit" size="icon" disabled={mutation.isPending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-6 right-4 z-50 size-14 rounded-full shadow-xl sm:right-6"
        aria-label="Abrir agente de datos"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </Button>
    </>
  );
}