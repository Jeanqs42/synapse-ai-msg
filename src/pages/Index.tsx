import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import ChatInterface from "@/components/ChatInterface";
import WhatsAppInterface from "@/components/WhatsAppInterface";

const Index = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(() => {
    // Check for saved API key
    const savedApiKey = localStorage.getItem("aicentral_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (key: string) => {
    setApiKey(key);
    localStorage.setItem("aicentral_api_key", key);
  };

  const handleLogout = () => {
    setApiKey(null);
    localStorage.removeItem("aicentral_api_key");
    setShowWhatsApp(false);
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

  // If no API key, show login screen
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
              className="bg-whatsapp-green text-white px-4 py-2 rounded-lg hover:bg-whatsapp-green-dark transition-colors"
            >
              Abrir WhatsApp
            </button>
            <button
              onClick={handleLogout}
              className="bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
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