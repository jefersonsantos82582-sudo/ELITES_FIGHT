import { useState, useEffect } from "react";
import { 
  CheckCircle2, Crown, FileSpreadsheet, Zap, 
  Layout, Palette, Download, ArrowRight, ShieldCheck,
  Star, Users, TrendingUp, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Home() {
  const { user, login, loading: authLoading } = useAuth();
  const { data: plans } = trpc.plans.list.useQuery();
  const [, setLocation] = useLocation();

  // Redirecionamento automático removido para evitar loops durante o login.
  // O fluxo de login agora é controlado pela página /loading.

  const handlePlanAction = async (planCode: string) => {
    try {
      if (!user) {
        if (planCode === "free") {
          // Para plano free, logar e ir ao loading -> dashboard
          await login("/loading");
        } else {
          // Para planos pagos, salvar o plano e redirecionar para checkout após login
          await login(`/loading`);
        }
        return;
      }

      if (planCode === "free") {
        window.location.href = "/dashboard";
      } else {
        window.location.href = `/checkout?plan=${planCode}`;
      }
    } catch (error) {
      console.error("[Home] Não foi possível iniciar o fluxo do plano:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="container relative z-10 text-center">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3 h-3 mr-2" />
            Geração de Planilhas com IA
          </Badge>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Crie Planilhas <span className="text-gold-gradient">Profissionais</span> <br className="hidden md:block" />
            em Segundos
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            A plataforma definitiva para gerar planilhas personalizadas, 
            compatíveis com Excel e Google Sheets, usando o poder da inteligência artificial.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-gold-gradient text-black font-semibold text-base h-12 px-8"
              onClick={() => setLocation(user ? "/dashboard" : "/loading")}
            >
              Começar Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto border-border/50 text-base h-12 px-8"
              onClick={() => {
                const el = document.getElementById("planos");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver Planos
            </Button>
          </div>

          <div className="mt-20 relative max-w-5xl mx-auto animate-in fade-in zoom-in duration-1000 delay-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl -z-10" />
            <div className="bg-card border border-border/50 rounded-2xl p-2 shadow-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1543286386-713bdd548da4?q=80&w=2070&auto=format&fit=crop" 
                alt="Dashboard Preview" 
                className="w-full h-auto rounded-xl opacity-80 grayscale-[0.2]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Recursos Poderosos</h2>
            <p className="text-muted-foreground">
              Tudo o que você precisa para gerenciar seus dados com eficiência e estilo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Layout,
                title: "Modelos Inteligentes",
                description: "Centenas de modelos pré-configurados para diversos nichos de mercado."
              },
              {
                icon: Palette,
                title: "Customização Total",
                description: "Altere cores, fontes e estilos para deixar a planilha com a cara da sua marca."
              },
              {
                icon: Download,
                title: "Exportação Rápida",
                description: "Baixe instantaneamente em formatos compatíveis com os principais softwares."
              },
              {
                icon: ShieldCheck,
                title: "Segurança de Dados",
                description: "Seus dados são processados de forma segura e privada."
              },
              {
                icon: Zap,
                title: "IA Generativa",
                description: "Deixe nossa IA criar a estrutura perfeita para suas necessidades específicas."
              },
              {
                icon: TrendingUp,
                title: "Escalabilidade",
                description: "Desde uso pessoal até grandes empresas, temos o plano ideal."
              }
            ].map((feature, i) => (
              <Card key={i} className="p-8 bg-card/50 border-border/30 hover:border-primary/30 transition-all hover:shadow-lg group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Planos e Preços</h2>
            <p className="text-muted-foreground">
              Escolha o plano que melhor se adapta às suas necessidades.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans?.map((plan) => {
              const isPro = plan.code === "pro";
              const isElite = plan.code === "elite";
              
              return (
                <Card 
                  key={plan.code} 
                  className={`p-8 flex flex-col relative overflow-hidden transition-all hover:shadow-xl ${
                    isElite ? "border-primary shadow-primary/10 scale-105 z-10 bg-card" : "bg-card/50 border-border/30"
                  }`}
                >
                  {isElite && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gold-gradient text-black text-[10px] font-bold py-1 px-8 rotate-45 translate-x-[25px] translate-y-[10px]">
                        RECOMENDADO
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                      {isElite ? <Crown className="w-5 h-5 text-primary" /> : <Star className="w-5 h-5 text-primary" />}
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">R$ {plan.priceMonthly ?? "0"}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {(plan.features as string[]).map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-border/10 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Disponível no Dashboard
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
