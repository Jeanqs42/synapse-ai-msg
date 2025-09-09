import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, Smartphone, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WhatsAppQRModal = ({ open, onOpenChange }: WhatsAppQRModalProps) => {
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const { toast } = useToast();

  const connectWhatsApp = () => {
    setConnectionStatus("connecting");
    
    // Simula processo de conexão
    setTimeout(() => {
      setConnectionStatus("connected");
      toast({
        title: "WhatsApp conectado!",
        description: "Sua conta do WhatsApp foi conectada com sucesso.",
      });
    }, 3000);
  };

  const disconnectWhatsApp = () => {
    setConnectionStatus("disconnected");
    toast({
      title: "WhatsApp desconectado",
      description: "Sua conta do WhatsApp foi desconectada.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do WhatsApp para integrar com o assistente AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {connectionStatus === "disconnected" && (
            <>
              <Card className="p-6 text-center">
                <div className="mx-auto w-32 h-32 bg-muted rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Conectar" para gerar o QR Code
                </p>
              </Card>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs">
                    1
                  </div>
                  <p>Clique em "Conectar WhatsApp" abaixo</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs">
                    2
                  </div>
                  <p>Abra o WhatsApp no seu celular</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs">
                    3
                  </div>
                  <p>Toque em "Dispositivos conectados" e depois "Conectar um dispositivo"</p>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-xs">
                    4
                  </div>
                  <p>Escaneie o QR Code que aparecerá na tela</p>
                </div>
              </div>

              <Button 
                onClick={connectWhatsApp}
                className="w-full bg-whatsapp-green hover:bg-whatsapp-green-dark"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
            </>
          )}

          {connectionStatus === "connecting" && (
            <Card className="p-6 text-center">
              <div className="mx-auto w-32 h-32 bg-whatsapp-green/10 rounded-lg flex items-center justify-center mb-4">
                <Loader2 className="w-16 h-16 text-whatsapp-green animate-spin" />
              </div>
              <h3 className="font-semibold mb-2">Aguardando conexão...</h3>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code no seu WhatsApp para conectar
              </p>
            </Card>
          )}

          {connectionStatus === "connected" && (
            <Card className="p-6 text-center">
              <div className="mx-auto w-32 h-32 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">WhatsApp Conectado!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sua conta do WhatsApp está conectada e funcionando
              </p>
              <Button 
                onClick={disconnectWhatsApp}
                variant="outline"
                className="w-full"
              >
                Desconectar
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRModal;