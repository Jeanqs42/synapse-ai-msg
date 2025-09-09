import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, LogOut, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WhatsAppQRModal from "./WhatsAppQRModal";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatInterfaceProps {
  apiKey: string;
  onLogout: () => void;
}

const ChatInterface = ({ apiKey, onLogout }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Sou seu assistente inteligente da AiCentral. Como posso ajudar você hoje?",
      sender: "assistant",
      timestamp: new Date(),
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showQRModal, setShowQRModal] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setLoading(true);

    try {
      const response = await fetch("https://aicentral.store/api/v1/ask", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: newMessage,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na API");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: data.id || Date.now().toString(),
        content: data.answer || "Desculpe, não consegui processar sua solicitação.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-whatsapp-bg">
      {/* Sidebar */}
      <div className="w-80 bg-whatsapp-sidebar border-r border-whatsapp-border flex flex-col">
        {/* Header */}
        <div className="p-4 bg-whatsapp-green text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-white/20 text-white">
                <Bot className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">AiCentral</h2>
              <p className="text-xs opacity-90">Assistente Inteligente</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setShowQRModal(true)}
            >
              <QrCode className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg p-4 mb-4 border">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-whatsapp-green text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium">Assistente AI</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {messages[messages.length - 1]?.content || "Inicie uma conversa..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 bg-whatsapp-sidebar border-b border-whatsapp-border flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-whatsapp-green text-white">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">Assistente AiCentral</h3>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-whatsapp-green text-white"
                      : "bg-whatsapp-message-received border"
                  } shadow-sm`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === "user" ? "text-white/70" : "text-muted-foreground"
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-whatsapp-message-received border px-4 py-2 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Digitando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 bg-whatsapp-sidebar border-t border-whatsapp-border">
          <div className="flex items-end gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-h-[40px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-whatsapp-green hover:bg-whatsapp-green-dark shrink-0"
              disabled={loading || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <WhatsAppQRModal 
        open={showQRModal} 
        onOpenChange={setShowQRModal}
      />
    </div>
  );
};

export default ChatInterface;