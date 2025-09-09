import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import ChatInterface from "@/components/ChatInterface";
import WhatsAppInterface from "@/components/WhatsAppInterface";
import AuthScreen from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Check for saved API key
    const savedApiKey = localStorage.getItem("aicentral_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    setLoading(false);

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (key: string) => {
    setApiKey(key);
    localStorage.setItem("aicentral_api_key", key);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setApiKey(null);
    localStorage.removeItem("aicentral_api_key");
    setShowWhatsApp(false);
  };

  const handleAuthSuccess = () => {
    // Auth success is handled by the auth state listener
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, show auth screen
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // If authenticated but no API key for AI chat, show login screen
  if (!apiKey && !showWhatsApp) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (showWhatsApp) {
    return <WhatsAppInterface onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">AI Central</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWhatsApp(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Abrir WhatsApp
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <ChatInterface apiKey={apiKey} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default Index;