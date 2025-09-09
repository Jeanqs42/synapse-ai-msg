import { useState, useEffect } from "react";
import LoginScreen from "@/components/LoginScreen";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se já existe uma chave API salva no localStorage
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-whatsapp-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <ChatInterface apiKey={apiKey} onLogout={handleLogout} />;
};

export default Index;