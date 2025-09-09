-- Create tables for WhatsApp integration and AI assistant

-- Table for storing WhatsApp connections/sessions
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_data JSONB,
  phone_number TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing WhatsApp conversations/chats
CREATE TABLE public.whatsapp_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL, -- WhatsApp chat ID
  chat_name TEXT,
  chat_type TEXT DEFAULT 'private', -- 'private' or 'group'
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- WhatsApp message ID
  sender_id TEXT NOT NULL, -- WhatsApp contact ID
  sender_name TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'audio', etc.
  is_from_me BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI assistant suggestions and context
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'response', 'context', 'action'
  suggestion_text TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.5,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_sessions
CREATE POLICY "Users can view their own WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp sessions" 
ON public.whatsapp_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_chats
CREATE POLICY "Users can view chats from their sessions" 
ON public.whatsapp_chats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_sessions 
    WHERE id = whatsapp_chats.session_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats for their sessions" 
ON public.whatsapp_chats 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_sessions 
    WHERE id = whatsapp_chats.session_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update chats from their sessions" 
ON public.whatsapp_chats 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_sessions 
    WHERE id = whatsapp_chats.session_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete chats from their sessions" 
ON public.whatsapp_chats 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_sessions 
    WHERE id = whatsapp_chats.session_id AND user_id = auth.uid()
  )
);

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view messages from their chats" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats wc
    JOIN public.whatsapp_sessions ws ON wc.session_id = ws.id
    WHERE wc.id = whatsapp_messages.chat_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their chats" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats wc
    JOIN public.whatsapp_sessions ws ON wc.session_id = ws.id
    WHERE wc.id = whatsapp_messages.chat_id AND ws.user_id = auth.uid()
  )
);

-- RLS Policies for ai_suggestions
CREATE POLICY "Users can view AI suggestions for their chats" 
ON public.ai_suggestions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats wc
    JOIN public.whatsapp_sessions ws ON wc.session_id = ws.id
    WHERE wc.id = ai_suggestions.chat_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create AI suggestions for their chats" 
ON public.ai_suggestions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats wc
    JOIN public.whatsapp_sessions ws ON wc.session_id = ws.id
    WHERE wc.id = ai_suggestions.chat_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update AI suggestions for their chats" 
ON public.ai_suggestions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats wc
    JOIN public.whatsapp_sessions ws ON wc.session_id = ws.id
    WHERE wc.id = ai_suggestions.chat_id AND ws.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_sessions_user_id ON public.whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_chats_session_id ON public.whatsapp_chats(session_id);
CREATE INDEX idx_whatsapp_messages_chat_id ON public.whatsapp_messages(chat_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);
CREATE INDEX idx_ai_suggestions_chat_id ON public.ai_suggestions(chat_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_chats_updated_at
BEFORE UPDATE ON public.whatsapp_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_chats REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.ai_suggestions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.whatsapp_sessions;
ALTER publication supabase_realtime ADD TABLE public.whatsapp_chats;
ALTER publication supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER publication supabase_realtime ADD TABLE public.ai_suggestions;