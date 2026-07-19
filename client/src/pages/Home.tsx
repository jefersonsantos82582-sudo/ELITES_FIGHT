import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Crown, FileSpreadsheet, Table, Sheet, Palette, RefreshCw, Zap,
  ArrowRight, Check, Play, Sparkles, TrendingUp, Shield, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

const benefitIcons: Record<string, typeof FileSpreadsheet> = {
  FileSpreadsheet, Table, Sheet, Palette, RefreshCw, Zap,
};

export default function Home() {
  const { user } = useAuth();
  const { data: plans } = trpc.plans.list.useQuery();
  const { data: featuredTemplates } = trpc.templates.featured.useQuery();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <Navbar />

      {/* ==================== HERO ==================== */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden">
        {/* Gradient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        </div>

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge
              variant="outline"
              className="mb-6 border-primary/30 text-primary bg-primary/5 px-4 py-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              1 planilha grátis por mês
            </Badge>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Planilhas profissionais
              <br />
              <span className="text-gold-gradient">em segundos</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Gere planilhas editáveis com aparência premium. Compatível com
              Excel e Google Planilhas. Escolha um modelo, personalize e baixe.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => user ? scrollTo("planos") : startLogin()}
                className="bg-gold-gradient text-black font-semibold text-base px-8 h-12 hover:opacity-90 transition-opacity"
              >
                <Crown className="w-5 h-5 mr-2" />
                Criar gratuitamente
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo("como-funciona")}
                className="text-base px-8 h-12 border-border/50"
              >
                <Play className="w-4 h-4 mr-2" />
                Ver demonstração
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gold-gradient">10+</div>
                <div className="text-sm text-muted-foreground mt-1">Modelos prontos</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gold-gradient">100%</div>
                <div className="text-sm text-muted-foreground mt-1">Editável</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-gold-gradient">3s</div>
                <div className="text-sm text-muted-foreground mt-1">Geração média</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section id="como-funciona" className="py-20 md:py-28 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Como <span className="text-gold-gradient">funciona</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Quatro passos simples para gerar sua planilha profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Escolha um modelo", desc: "Selecione entre dezenas de modelos profissionais prontos para uso.", icon: FileSpreadsheet },
              { step: "02", title: "Escolha um tema", desc: "Personalize as cores e o visual da sua planilha.", icon: Palette },
              { step: "03", title: "Personalize", desc: "Adicione seu nome, logo e informações extras.", icon: Sparkles },
              { step: "04", title: "Baixe sua planilha", desc: "Download instantâneo em formato .xlsx totalmente editável.", icon: Download },
            ].map((item, i) => (
              <Card
                key={i}
                className="relative p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all duration-300 hover:card-glow group"
              >
                <div className="absolute top-4 right-4 text-5xl font-bold text-primary/10 font-display group-hover:text-primary/20 transition-colors">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BENEFÍCIOS ==================== */}
      <section id="recursos" className="py-20 md:py-28 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Por que <span className="text-gold-gradient">ELITES_FIGHT</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tudo que você precisa para criar planilhas de nível profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "FileSpreadsheet", title: "Totalmente Editáveis", desc: "Todas as planilhas são 100% editáveis após o download. Modifique dados, fórmulas e formatação." },
              { icon: "Table", title: "Compatível com Excel", desc: "Funciona perfeitamente no Microsoft Excel em todas as versões suportadas." },
              { icon: "Sheet", title: "Google Planilhas", desc: "Importe diretamente no Google Planilhas sem perda de formatação." },
              { icon: "Palette", title: "Temas Profissionais", desc: "Cores e formatação de nível profissional com aparência premium." },
              { icon: "RefreshCw", title: "Atualizações Constantes", desc: "Novos modelos adicionados regularmente. Sempre algo novo para usar." },
              { icon: "Zap", title: "Sistema Rápido", desc: "Geração em segundos, sem esperas. Tudo acontece no servidor." },
            ].map((item, i) => {
              const Icon = benefitIcons[item.icon] || FileSpreadsheet;
              return (
                <Card
                  key={i}
                  className="p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== MODELOS EM DESTAQUE ==================== */}
      {featuredTemplates && featuredTemplates.length > 0 && (
        <section className="py-20 md:py-28 border-t border-border/30">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Modelos em <span className="text-gold-gradient">destaque</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Alguns dos nossos modelos mais populares
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTemplates.slice(0, 4).map((tpl) => (
                <Card
                  key={tpl.id}
                  className="p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                >
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 mb-4 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                    <FileSpreadsheet className="w-12 h-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <Badge variant="secondary" className="mb-2 text-xs uppercase">{tpl.plan}</Badge>
                  <h3 className="font-semibold text-sm mb-1 truncate">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                </Card>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/dashboard">
                <Button variant="outline" className="border-border/50">
                  Ver todos os modelos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ==================== PLANOS ==================== */}
      <section id="planos" className="py-20 md:py-28 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Escolha seu <span className="text-gold-gradient">plano</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Comece grátis. Faça upgrade quando precisar de mais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans?.map((plan, idx) => {
              const isPro = plan.code === "pro";
              const isElite = plan.code === "elite";
              const features = plan.features as string[];

              return (
                <Card
                  key={plan.id}
                  className={`relative p-8 transition-all duration-300 ${
                    isPro
                      ? "border-primary/50 card-glow scale-105 bg-card"
                      : "border-border/30 bg-card/50 hover:border-primary/30"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gold-gradient text-black font-semibold px-4 py-1">
                        MAIS POPULAR
                      </Badge>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${
                      isElite ? "bg-gold-gradient" : isPro ? "bg-primary/15" : "bg-muted"
                    }`}>
                      <Crown className={`w-6 h-6 ${isElite ? "text-black" : isPro ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="font-display text-4xl font-bold">{plan.priceMonthly}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features?.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      isPro || isElite
                        ? "bg-gold-gradient text-black font-semibold hover:opacity-90"
                        : "variant-outline border-border/50"
                    }`}
                    variant={plan.code === "free" ? "outline" : "default"}
                    onClick={() => user ? scrollTo("recursos") : startLogin()}
                  >
                    {plan.code === "free" ? "Começar grátis" : `Assinar ${plan.name}`}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container">
          <Card className="relative p-12 md:p-16 bg-card border-primary/20 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Pronto para <span className="text-gold-gradient">começar?</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Crie sua primeira planilha profissional gratuitamente. Sem cartão de crédito.
              </p>
              <Button
                size="lg"
                onClick={() => user ? scrollTo("planos") : startLogin()}
                className="bg-gold-gradient text-black font-semibold text-base px-8 h-12 hover:opacity-90"
              >
                <Crown className="w-5 h-5 mr-2" />
                Criar gratuitamente
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
