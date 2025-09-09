import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseRealtimeSubscriptionsProps {
  userId: string;
  onNewMessage?: (payload: any) => void;
  onChatUpdate?: (payload: any) => void;
  onNewSuggestion?: (payload: any) => void;
}

export const useRealtimeSubscriptions = ({
  userId,
  onNewMessage,
  onChatUpdate,
  onNewSuggestion
}: UseRealtimeSubscriptionsProps) => {
  const setupSubscriptions = useCallback(() => {
    // Subscription for new WhatsApp messages
    const messagesChannel = supabase
      .channel('whatsapp_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('New message:', payload);
          onNewMessage?.(payload);
        }
      )
      .subscribe();

    // Subscription for chat updates
    const chatsChannel = supabase
      .channel('whatsapp_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_chats'
        },
        (payload) => {
          console.log('Chat update:', payload);
          onChatUpdate?.(payload);
        }
      )
      .subscribe();

    // Subscription for AI suggestions
    const suggestionsChannel = supabase
      .channel('ai_suggestions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_suggestions'
        },
        (payload) => {
          console.log('New AI suggestion:', payload);
          onNewSuggestion?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(suggestionsChannel);
    };
  }, [userId, onNewMessage, onChatUpdate, onNewSuggestion]);

  useEffect(() => {
    const cleanup = setupSubscriptions();
    return cleanup;
  }, [setupSubscriptions]);
};