import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Key, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginScreenProps {
  onLogin: (apiKey: string) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira sua chave API",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://aicentral.store/api/v1/validate-key", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          toast({
            title: "Login realizado com sucesso!",
            description: `Bem-vindo! Plano: ${data.plan_name}`,
          });
          onLogin(apiKey);
        } else {
          throw new Error("Chave API inválida");
        }
      } else {
        throw new Error("Erro na validação da chave");
      }
    } catch (error) {
      toast({
        title: "Erro de autenticação",
        description: "Chave API inválida ou erro na conexão",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-whatsapp-green/10 to-whatsapp-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-whatsapp-green rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">AiCentral Chat</h1>
          <p className="text-muted-foreground">Seu assistente inteligente integrado ao WhatsApp</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Key className="w-5 h-5" />
              Autenticação
            </CardTitle>
            <CardDescription>
              Entre com sua chave API da AiCentral para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium">
                  Chave API
                </label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Insira sua chave API da AiCentral"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="transition-all duration-200"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-whatsapp-green hover:bg-whatsapp-green-dark text-white"
                disabled={loading}
              >
                {loading ? "Validando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Não possui uma chave API?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open("https://aicentral.store", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Obter chave gratuita
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by AiCentral</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;