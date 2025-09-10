import { useState } from "react";
import WhatsAppChat from "./WhatsAppChat";
import AIAssistantChat from "./AIAssistantChat";

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

interface WhatsAppInterfaceProps {
  onLogout: () => void;
}

const WhatsAppInterface = ({ onLogout }: WhatsAppInterfaceProps) => {
  const [currentChat, setCurrentChat] = useState<WhatsAppChatData | null>(null);
  const [currentMessages, setCurrentMessages] = useState<WhatsAppMessage[]>([]);

  const handleChatChange = (chat: WhatsAppChatData | null, messages: WhatsAppMessage[]) => {
    setCurrentChat(chat);
    setCurrentMessages(messages);
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Chat do WhatsApp */}
      <WhatsAppChat 
        onLogout={onLogout}
        onChatChange={handleChatChange}
      />
      
      {/* Assistente IA */}
      <AIAssistantChat 
        currentWhatsAppChat={currentChat}
        currentWhatsAppMessages={currentMessages}
      />
    </div>
  );
};

export default WhatsAppInterface;