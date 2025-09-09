import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  id: string;
  type: string;
  sender: {
    id: string;
    name: string;
  };
  chat: {
    id: string;
    name: string;
    isGroup: boolean;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log(`WhatsApp Handler - Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('WhatsApp Handler - Body:', body);

      const { action, sessionId, userId, messageData } = body;

      if (action === 'initialize-session') {
        // Inicializar nova sessão do WhatsApp
        const { data: session, error: sessionError } = await supabase
          .from('whatsapp_sessions')
          .insert({
            user_id: userId,
            session_data: {},
            is_connected: false
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          throw sessionError;
        }

        return new Response(JSON.stringify({ 
          success: true, 
          sessionId: session.id,
          message: 'Session initialized' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action === 'update-session-status') {
        // Atualizar status da sessão
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .update({
            is_connected: body.isConnected,
            phone_number: body.phoneNumber,
            session_data: body.sessionData,
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionId)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('Error updating session:', error);
          throw error;
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Session status updated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action === 'save-message') {
        // Salvar mensagem do WhatsApp
        const message: WhatsAppMessage = messageData;
        
        // Primeiro, verificar se o chat existe
        let { data: chatData, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('id')
          .eq('session_id', sessionId)
          .eq('chat_id', message.chat.id)
          .single();

        // Se o chat não existe, criar
        if (chatError || !chatData) {
          const { data: newChat, error: newChatError } = await supabase
            .from('whatsapp_chats')
            .insert({
              session_id: sessionId,
              chat_id: message.chat.id,
              chat_name: message.chat.name,
              chat_type: message.chat.isGroup ? 'group' : 'private',
              last_message_at: new Date(message.timestamp * 1000).toISOString()
            })
            .select()
            .single();

          if (newChatError) {
            console.error('Error creating chat:', newChatError);
            throw newChatError;
          }
          chatData = newChat;
        }

        // Salvar a mensagem
        const { data: savedMessage, error: messageError } = await supabase
          .from('whatsapp_messages')
          .insert({
            chat_id: chatData.id,
            message_id: message.id,
            sender_id: message.sender.id,
            sender_name: message.sender.name,
            content: message.body,
            message_type: message.type,
            is_from_me: message.from === 'me',
            timestamp: new Date(message.timestamp * 1000).toISOString()
          })
          .select();

        if (messageError) {
          console.error('Error saving message:', messageError);
          throw messageError;
        }

        // Atualizar último timestamp do chat
        await supabase
          .from('whatsapp_chats')
          .update({ 
            last_message_at: new Date(message.timestamp * 1000).toISOString()
          })
          .eq('id', chatData.id);

        return new Response(JSON.stringify({ 
          success: true,
          messageId: savedMessage[0].id,
          chatId: chatData.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (action === 'generate-ai-suggestion') {
        // Gerar sugestão de resposta com AI
        const { chatId, messageHistory, currentMessage } = body;

        // Aqui você pode integrar com OpenAI ou outro serviço de AI
        // Por agora, vou retornar uma sugestão simples
        const suggestions = [
          "Olá! Como posso ajudá-lo hoje?",
          "Obrigado por entrar em contato conosco.",
          "Vou verificar essa informação para você.",
          "Posso ajudá-lo com mais alguma coisa?"
        ];

        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

        // Salvar sugestão no banco
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_suggestions')
          .insert({
            chat_id: chatId,
            suggestion_type: 'response',
            suggestion_text: randomSuggestion,
            confidence_score: 0.8
          })
          .select()
          .single();

        if (suggestionError) {
          console.error('Error saving suggestion:', suggestionError);
          throw suggestionError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          suggestion: randomSuggestion,
          suggestionId: suggestion.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Invalid action' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      const sessionId = url.searchParams.get('sessionId');

      if (!userId) {
        return new Response(JSON.stringify({ 
          error: 'User ID required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (sessionId) {
        // Buscar sessão específica
        const { data: session, error } = await supabase
          .from('whatsapp_sessions')
          .select('*, whatsapp_chats(*)')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching session:', error);
          throw error;
        }

        return new Response(JSON.stringify(session), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Buscar todas as sessões do usuário
        const { data: sessions, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching sessions:', error);
          throw error;
        }

        return new Response(JSON.stringify(sessions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WhatsApp Handler Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});