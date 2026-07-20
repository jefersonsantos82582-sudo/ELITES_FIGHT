import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-md">
          <Card className="p-8 text-center bg-card border-border/30">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground mb-8">
              Seu plano foi atualizado com sucesso. Você já pode aproveitar todos os recursos premium.
            </p>
            <Button 
              className="w-full bg-gold-gradient text-black font-semibold"
              onClick={() => setLocation("/dashboard")}
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
