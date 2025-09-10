import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  Phone, 
  MoreVertical, 
  Search,
  Wifi,
  WifiOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_id: string;
  is_from_me: boolean;
  timestamp: string;
  message_type: string;
}

interface WhatsAppChatData {
  id: string;
  chat_id: string;
  chat_name: string;
  chat_type: string;
  last_message_at: string;
}

interface WhatsAppChatProps {
  onLogout: () => void;
  onChatChange: (chat: WhatsAppChatData | null, messages: WhatsAppMessage[]) => void;
}

const WhatsAppChat = ({ onLogout, onChatChange }: WhatsAppChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [chats, setChats] = useState<WhatsAppChatData[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChatData | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeWhatsApp();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    // Notificar o componente pai sobre mudanças no chat
    onChatChange(selectedChat, messages);
  }, [selectedChat, messages, onChatChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeWhatsApp = async () => {
    try {
      // Como removemos a autenticação Supabase, vamos simular um usuário
      const userId = "simulated-user-id";

      const response = await supabase.functions.invoke('whatsapp-handler', {
        body: { 
          action: 'initialize-session',
          userId: userId
        }
      });

      if (response.data?.sessionId) {
        setCurrentSession(response.data.sessionId);
        connectWebSocket(response.data.sessionId);
        loadChats();
      }
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      toast.error("Erro ao inicializar WhatsApp");
    }
  };

  const connectWebSocket = (sessionId: string) => {
    const wsUrl = `wss://efvroqtjfrwdsxzjzoob.functions.supabase.co/functions/v1/whatsapp-websocket`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WhatsApp WebSocket connected');
      ws.current?.send(JSON.stringify({ 
        type: 'initialize',
        sessionId 
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'qr_code':
          if (data.qr) {
            toast.info("Escaneie o QR Code no WhatsApp Web");
          }
          break;
        case 'connection':
          if (data.status === 'connected') {
            setIsConnected(true);
            toast.success("WhatsApp conectado!");
            loadChats();
          }
          break;
        case 'message_sent':
          toast.success("Mensagem enviada!");
          break;
        case 'new_message':
          loadMessages(selectedChat?.id || '');
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error('WhatsApp WebSocket error:', error);
      toast.error("Erro na conexão WhatsApp");
    };

    ws.current.onclose = () => {
      console.log('WhatsApp WebSocket closed');
      setIsConnected(false);
    };
  };

  const loadChats = async () => {
    try {
      // Simulando dados de chat para demonstração
      const mockChats = [
        {
          id: "1",
          chat_id: "5511999999999@c.us",
          chat_name: "João Silva",
          chat_type: "private",
          last_message_at: new Date().toISOString()
        },
        {
          id: "2", 
          chat_id: "5511888888888@c.us",
          chat_name: "Maria Santos",
          chat_type: "private",
          last_message_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setChats(mockChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error("Erro ao carregar conversas");
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      // Simulando mensagens para demonstração
      const mockMessages = [
        {
          id: "1",
          content: "Olá! Como posso ajudar?",
          sender_name: "João Silva",
          sender_id: "5511999999999@c.us",
          is_from_me: false,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          message_type: "text"
        },
        {
          id: "2",
          content: "Oi! Gostaria de saber sobre seus serviços.",
          sender_name: "Você",
          sender_id: "me",
          is_from_me: true,
          timestamp: new Date(Date.now() - 1700000).toISOString(),
          message_type: "text"
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Erro ao carregar mensagens");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !ws.current) return;

    setIsLoading(true);
    try {
      ws.current.send(JSON.stringify({
        type: 'send_message',
        chatId: selectedChat.chat_id,
        messageText: newMessage,
        sessionId: currentSession
      }));

      // Adicionar mensagem localmente para feedback imediato
      const newMsg: WhatsAppMessage = {
        id: `msg_${Date.now()}`,
        content: newMessage,
        sender_name: "Você",
        sender_id: "me",
        is_from_me: true,
        timestamp: new Date().toISOString(),
        message_type: "text"
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.chat_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.chat_id.includes(searchTerm)
  );

  return (
    <div className="flex h-full">
      {/* Sidebar - Lista de conversas */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              WhatsApp
            </h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Wifi className="w-3 h-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Desconectado
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={onLogout}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Número conectado */}
          {phoneNumber && (
            <div className="text-sm text-muted-foreground mb-3">
              Conectado: {phoneNumber}
            </div>
          )}

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de conversas */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChat?.id === chat.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>
                      {chat.chat_name?.substring(0, 2).toUpperCase() || 'WA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{chat.chat_name || chat.chat_id}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(chat.last_message_at).toLocaleDateString()}
                    </p>
                  </div>
                  {chat.chat_type === 'group' && (
                    <Badge variant="outline" className="text-xs">Grupo</Badge>
                  )}
                </div>
              </div>
            ))}
            
            {filteredChats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
                <p className="text-sm">Conecte-se ao WhatsApp para começar</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header do chat */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedChat.chat_name?.substring(0, 2).toUpperCase() || 'WA'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedChat.chat_name || selectedChat.chat_id}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.chat_type === 'group' ? 'Grupo' : 'Contato'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_from_me
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!message.is_from_me && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {message.sender_name}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.is_from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input de mensagem */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={!isConnected || isLoading}
                />
                <Button onClick={sendMessage} disabled={!isConnected || isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">Selecione uma conversa</h2>
              <p className="text-muted-foreground">
                Escolha uma conversa para começar a conversar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppChat;