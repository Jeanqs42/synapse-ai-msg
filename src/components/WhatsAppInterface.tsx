import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Send, 
  Phone, 
  MoreVertical, 
  Search,
  Bot,
  Lightbulb,
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

interface WhatsAppChat {
  id: string;
  chat_id: string;
  chat_name: string;
  chat_type: string;
  last_message_at: string;
}

interface AISuggestion {
  id: string;
  suggestion_text: string;
  suggestion_type: string;
  confidence_score: number;
}

interface WhatsAppInterfaceProps {
  onLogout: () => void;
}

const WhatsAppInterface = ({ onLogout }: WhatsAppInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
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
      generateAISuggestions();
    }
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeWhatsApp = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se já existe uma sessão ativa
      const response = await supabase.functions.invoke('whatsapp-handler', {
        body: { 
          action: 'initialize-session',
          userId: user.id
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
      console.log('WebSocket connected');
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
            setShowQRCode(true);
          }
          break;
        case 'connection':
          if (data.status === 'connected') {
            setIsConnected(true);
            setShowQRCode(false);
            toast.success("WhatsApp conectado!");
            loadChats();
          }
          break;
        case 'message_sent':
          toast.success("Mensagem enviada!");
          break;
        case 'new_message':
          // Nova mensagem recebida
          loadMessages(selectedChat?.id || '');
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error("Erro na conexão WebSocket");
    };

    ws.current.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
    };
  };

  const loadChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentSession) return;

      const { data, error } = await supabase
        .from('whatsapp_chats')
        .select(`
          id,
          chat_id,
          chat_name,
          chat_type,
          last_message_at,
          whatsapp_sessions!inner(user_id)
        `)
        .eq('whatsapp_sessions.user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error("Erro ao carregar conversas");
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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

      // Salvar mensagem localmente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('whatsapp-handler', {
          body: {
            action: 'save-message',
            sessionId: currentSession,
            messageData: {
              id: `msg_${Date.now()}`,
              from: 'me',
              to: selectedChat.chat_id,
              body: newMessage,
              timestamp: Math.floor(Date.now() / 1000),
              type: 'text',
              sender: {
                id: user.id,
                name: 'Você'
              },
              chat: {
                id: selectedChat.chat_id,
                name: selectedChat.chat_name,
                isGroup: selectedChat.chat_type === 'group'
              }
            }
          }
        });
      }

      setNewMessage("");
      loadMessages(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAISuggestions = async () => {
    if (!selectedChat) return;

    try {
      const response = await supabase.functions.invoke('whatsapp-handler', {
        body: {
          action: 'generate-ai-suggestion',
          chatId: selectedChat.id,
          messageHistory: messages.slice(-5), // Últimas 5 mensagens
          currentMessage: messages[messages.length - 1]
        }
      });

      if (response.data?.suggestion) {
        setAiSuggestions([{
          id: response.data.suggestionId,
          suggestion_text: response.data.suggestion,
          suggestion_type: 'response',
          confidence_score: 0.8
        }]);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
  };

  const filteredChats = chats.filter(chat => 
    chat.chat_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.chat_id.includes(searchTerm)
  );

  return (
    <div className="h-screen bg-background flex">
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

      {/* Área principal */}
      <div className="flex-1 flex">
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

        {/* Assistente AI */}
        <div className="w-80 border-l border-border bg-card">
          <Tabs defaultValue="assistant" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4">
              <TabsTrigger value="assistant">Assistente</TabsTrigger>
              <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="assistant" className="mt-0 h-full">
                <Card className="h-full m-4 mt-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Assistente AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        O assistente AI está analisando a conversa para fornecer sugestões de respostas...
                      </div>
                      
                      {selectedChat && (
                        <div className="space-y-3">
                          <div className="p-3 bg-primary/5 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Contexto da Conversa</h4>
                            <p className="text-xs text-muted-foreground">
                              Conversa com {selectedChat.chat_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {messages.length} mensagens
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={generateAISuggestions}
                            className="w-full"
                          >
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Gerar Sugestões
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="suggestions" className="mt-0 h-full">
                <Card className="h-full m-4 mt-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Sugestões de Resposta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-full">
                      <div className="space-y-3">
                        {aiSuggestions.map((suggestion) => (
                          <div key={suggestion.id} className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => useSuggestion(suggestion.suggestion_text)}
                              className="w-full text-left p-3 h-auto whitespace-normal"
                            >
                              {suggestion.suggestion_text}
                            </Button>
                            <div className="text-xs text-muted-foreground px-2">
                              Confiança: {Math.round(suggestion.confidence_score * 100)}%
                            </div>
                            <Separator />
                          </div>
                        ))}
                        
                        {aiSuggestions.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma sugestão disponível</p>
                            <p className="text-xs">Selecione uma conversa para gerar sugestões</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Modal QR Code */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Conectar WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-8 bg-white rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie o QR code com seu WhatsApp
                </p>
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
                  <MessageCircle className="w-16 h-16 text-gray-400" />
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowQRCode(false)}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInterface;