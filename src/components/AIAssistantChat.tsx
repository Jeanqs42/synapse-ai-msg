import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Send, 
  Lightbulb,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface AIMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

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

interface AIAssistantChatProps {
  currentWhatsAppChat: WhatsAppChatData | null;
  currentWhatsAppMessages: WhatsAppMessage[];
}

const AIAssistantChat = ({ currentWhatsAppChat, currentWhatsAppMessages }: AIAssistantChatProps) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Adicionar mensagem de boas-vindas quando o componente é montado
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        content: "Olá! Sou seu assistente de IA para WhatsApp. Posso ajudar você a:\n\n• Analisar conversas\n• Sugerir respostas\n• Criar estratégias de atendimento\n• Responder dúvidas sobre clientes\n\nSelecione uma conversa no WhatsApp e me pergunte qualquer coisa!",
        sender: "assistant",
        timestamp: new Date()
      }]);
    }
  }, []);

  useEffect(() => {
    // Gerar sugestões quando o chat do WhatsApp muda
    if (currentWhatsAppChat && currentWhatsAppMessages.length > 0) {
      generateSuggestions();
    }
  }, [currentWhatsAppChat, currentWhatsAppMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateSuggestions = () => {
    if (!currentWhatsAppChat || currentWhatsAppMessages.length === 0) return;

    const lastMessage = currentWhatsAppMessages[currentWhatsAppMessages.length - 1];
    
    // Sugestões baseadas na última mensagem
    let newSuggestions: string[] = [];

    if (!lastMessage.is_from_me) {
      // Se a última mensagem não é nossa, sugerir respostas
      if (lastMessage.content.toLowerCase().includes('preço') || lastMessage.content.toLowerCase().includes('valor')) {
        newSuggestions = [
          "Como posso ajudar com informações sobre preços?",
          "Vou verificar os valores atualizados para você.",
          "Temos algumas opções que podem interessar. Posso detalhar?"
        ];
      } else if (lastMessage.content.toLowerCase().includes('obrigad') || lastMessage.content.toLowerCase().includes('valeu')) {
        newSuggestions = [
          "Por nada! Estou sempre aqui para ajudar.",
          "Fico feliz em poder ajudar! 😊",
          "Sempre às ordens! Precisa de mais alguma coisa?"
        ];
      } else if (lastMessage.content.toLowerCase().includes('oi') || lastMessage.content.toLowerCase().includes('olá')) {
        newSuggestions = [
          `Olá ${currentWhatsAppChat.chat_name}! Como posso ajudar você hoje?`,
          "Oi! Seja bem-vindo(a)! Em que posso ser útil?",
          "Olá! Que bom ter você aqui. Como posso ajudar?"
        ];
      } else {
        newSuggestions = [
          "Entendi sua mensagem. Como posso ajudar?",
          "Obrigado pela mensagem. Vou verificar isso para você.",
          "Perfeito! Deixe-me ajudar você com isso."
        ];
      }
    }

    setSuggestions(newSuggestions);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      content: newMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    try {
      // Simular resposta da IA baseada no contexto
      await new Promise(resolve => setTimeout(resolve, 1000));

      let aiResponse = "";

      if (newMessage.toLowerCase().includes('analisar') || newMessage.toLowerCase().includes('análise')) {
        if (currentWhatsAppChat && currentWhatsAppMessages.length > 0) {
          const totalMessages = currentWhatsAppMessages.length;
          const myMessages = currentWhatsAppMessages.filter(m => m.is_from_me).length;
          const theirMessages = totalMessages - myMessages;
          
          aiResponse = `📊 **Análise da conversa com ${currentWhatsAppChat.chat_name}:**\n\n• Total de mensagens: ${totalMessages}\n• Suas mensagens: ${myMessages}\n• Mensagens do cliente: ${theirMessages}\n• Taxa de resposta: ${((myMessages/totalMessages)*100).toFixed(1)}%\n\n💡 **Insights:** ${myMessages > theirMessages ? 'Você está sendo bem responsivo!' : 'O cliente está bem engajado na conversa.'}`;
        } else {
          aiResponse = "Para analisar uma conversa, primeiro selecione um chat no WhatsApp. Assim posso ver o histórico e fornecer insights detalhados.";
        }
      } else if (newMessage.toLowerCase().includes('sugest') || newMessage.toLowerCase().includes('responder')) {
        if (currentWhatsAppMessages.length > 0) {
          const lastMessage = currentWhatsAppMessages[currentWhatsAppMessages.length - 1];
          aiResponse = `💡 **Sugestões de resposta para a mensagem:**\n"${lastMessage.content}"\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        } else {
          aiResponse = "Selecione uma conversa no WhatsApp para que eu possa sugerir respostas baseadas no contexto.";
        }
      } else if (newMessage.toLowerCase().includes('resumo') || newMessage.toLowerCase().includes('resumir')) {
        if (currentWhatsAppMessages.length > 0) {
          aiResponse = `📝 **Resumo da conversa:**\n\nCliente: ${currentWhatsAppChat?.chat_name}\nMensagens recentes: ${Math.min(5, currentWhatsAppMessages.length)}\n\n🔄 **Últimas interações:**\n${currentWhatsAppMessages.slice(-3).map(m => `• ${m.is_from_me ? 'Você' : m.sender_name}: ${m.content.substring(0, 50)}...`).join('\n')}`;
        } else {
          aiResponse = "Não há conversa selecionada para resumir. Escolha um chat no WhatsApp primeiro.";
        }
      } else {
        aiResponse = `Entendi sua pergunta: "${newMessage}"\n\nComo seu assistente de IA, posso ajudar você com:\n\n🔍 **Análise de conversas** - Digite "analisar"\n💬 **Sugestões de resposta** - Digite "sugerir"\n📋 **Resumo de chats** - Digite "resumo"\n\nO que você gostaria de fazer?`;
      }

      const assistantMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        content: aiResponse,
        sender: "assistant",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending AI message:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  const useSuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">Assistente IA</h2>
            <p className="text-xs text-muted-foreground">
              {currentWhatsAppChat ? `Analisando: ${currentWhatsAppChat.chat_name}` : 'Selecione um chat'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat do assistente */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Sugestões rápidas */}
      {suggestions.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span className="text-xs font-medium">Sugestões para WhatsApp:</span>
          </div>
          <div className="space-y-1">
            {suggestions.slice(0, 2).map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto p-2 text-xs"
                onClick={() => toast.success(`Sugestão copiada: ${suggestion}`)}
              >
                <Sparkles className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input de mensagem */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Pergunte ao assistente..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
            className="text-sm"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !newMessage.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Botões de ação rápida */}
        <div className="flex gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("Analisar esta conversa")}
          >
            📊 Analisar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("Sugerir resposta")}
          >
            💡 Sugerir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => setNewMessage("Resumir conversa")}
          >
            📝 Resumo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantChat;