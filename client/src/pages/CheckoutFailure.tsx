import { useLocation } from "wouter";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CheckoutFailure() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-md">
          <Card className="p-8 text-center bg-card border-border/30">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Ops! Algo deu errado</h1>
            <p className="text-muted-foreground mb-8">
              Não conseguimos processar seu pagamento. Por favor, tente novamente ou escolha outro método.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full bg-gold-gradient text-black font-semibold"
                onClick={() => setLocation("/#planos")}
              >
                Tentar Novamente
                <RefreshCw className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
