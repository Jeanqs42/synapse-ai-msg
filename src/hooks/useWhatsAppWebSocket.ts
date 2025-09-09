import { useEffect, useRef, useState } from "react";

interface UseWhatsAppWebSocketProps {
  sessionId: string | null;
  onMessage?: (data: any) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const useWhatsAppWebSocket = ({
  sessionId,
  onMessage,
  onConnectionChange
}: UseWhatsAppWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const connectWebSocket = () => {
      const wsUrl = `wss://efvroqtjfrwdsxzjzoob.functions.supabase.co/functions/v1/whatsapp-websocket`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WhatsApp WebSocket connected');
        setIsConnected(true);
        onConnectionChange?.(true);
        
        // Initialize session
        ws.current?.send(JSON.stringify({ 
          type: 'initialize',
          sessionId 
        }));
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WhatsApp WebSocket message:', data);
        onMessage?.(data);
      };

      ws.current.onerror = (error) => {
        console.error('WhatsApp WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WhatsApp WebSocket closed');
        setIsConnected(false);
        onConnectionChange?.(false);
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (sessionId) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId, onMessage, onConnectionChange]);

  const sendMessage = (data: any) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(data));
    }
  };

  return {
    isConnected,
    sendMessage
  };
};