import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import Markdown from "react-markdown";
interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
}
interface ChatWidgetProps {
  csrfToken: string;
}
export function ChatWidget({ csrfToken }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "bot",
      text: "Olá! Eu sou a SupportAI, assistente virtual de suporte da AcmeCorp. Como posso ajudar com os chamados hoje?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userText = inputValue.trim();
    setInputValue("");
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ message: userText }),
      });
      if (response.ok) {
        const data = await response.json();
        const newBotMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: data.reply,
        };
        setMessages((prev) => [...prev, newBotMsg]);
      } else {
        const newBotMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Desculpe, ocorreu um erro ao tentar processar sua mensagem.",
        };
        setMessages((prev) => [...prev, newBotMsg]);
      }
    } catch (err) {
      const newBotMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Desculpe, falha de conexão.",
      };
      setMessages((prev) => [...prev, newBotMsg]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      {" "}
      {/* Floating Action Button */}{" "}
      <button
        aria-label="Abrir assistente"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-transform hover:scale-105 z-40 border-none cursor-pointer ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
      >
        {" "}
        <MessageSquare className="w-6 h-6" />{" "}
      </button>{" "}
      {/* Chat Window */}{" "}
      <div
        className={`fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col bg-surface rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right z-50 overflow-hidden border border-border ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
      >
        {" "}
        {/* Header */}{" "}
        <div className={`p-4 border-b flex items-center justify-between`}>
          {" "}
          <div className="flex items-center space-x-2">
            {" "}
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent font-bold flex items-center justify-center text-sm overflow-hidden">
              <img src="/SupportAI-profile.jpg" alt="SupportAI" className="w-full h-full object-cover" />
            </div>{" "}
            <div>
              {" "}
              <h3 className="font-bold text-sm">SupportAI</h3>{" "}
              <p className="text-[10px] text-text-muted">
                Suporte AcmeCorp
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <button
            aria-label="Fechar assistente"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-border :bg-slate-700 text-text-muted cursor-pointer bg-transparent border-none"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>{" "}
        </div>{" "}
        {/* Messages Area */}{" "}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {" "}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {" "}
              <div
                className={`flex items-end space-x-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}
              >
                {" "}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.sender === "user" ? "bg-background-subtle text-text-secondary" : "bg-accent/20 text-accent font-bold text-xs"}`}
                >
                  {" "}
                  {msg.sender === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <img src="/SupportAI-profile.jpg" alt="SupportAI" className="w-full h-full object-cover rounded-full" />
                  )}{" "}
                </div>{" "}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed markdown-body ${msg.sender === "user" ? "bg-brand text-white" : "bg-background-subtle border border-border"}`}
                >
                  {" "}
                  {msg.sender === "user" ? (
                    msg.text
                  ) : (
                    <Markdown>{msg.text}</Markdown>
                  )}{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
          {isLoading && (
            <div className="flex justify-start">
               {" "}
              <div className="flex items-end space-x-2 max-w-[85%]">
                {" "}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs overflow-hidden">
                  {" "}
                  <img src="/SupportAI-profile.jpg" alt="SupportAI" className="w-full h-full object-cover rounded-full" />{" "}
                </div>{" "}
                <div className={`p-3 rounded-2xl text-xs flex space-x-1`}>
                  {" "}
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />{" "}
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />{" "}
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />{" "}
                </div>{" "}
              </div>{" "}
            </div>
          )}{" "}
          <div ref={messagesEndRef} />{" "}
        </div>{" "}
        {/* Input Area */}{" "}
        <div className={`p-3 border-t`}>
          {" "}
          <div
            className={`flex items-center space-x-2 p-1 border rounded-xl overflow-hidden`}
          >
            {" "}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Pergunte sobre os chamados..."
              className="flex-1 bg-transparent border-none outline-none text-xs px-3 py-2 text-inherit"
            />{" "}
            <button
              aria-label="Enviar mensagem"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 rounded-lg bg-accent text-white disabled:opacity-50 hover:bg-brand transition-colors border-none cursor-pointer"
            >
              {" "}
              <Send className="w-4 h-4" />{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </>
  );
}
