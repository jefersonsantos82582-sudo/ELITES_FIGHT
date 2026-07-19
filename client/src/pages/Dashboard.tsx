import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileSpreadsheet, Library, Settings, Crown,
  Download, TrendingUp, Sparkles, Clock, FileDown, Plus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Library, label: "Modelos", path: "/dashboard/modelos" },
  { icon: FileSpreadsheet, label: "Gerador", path: "/dashboard/gerador" },
  { icon: Settings, label: "Configurações", path: "/dashboard/config" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: overview, isLoading } = trpc.dashboard.overview.useQuery();
  const [location] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'failure') {
      setPaymentStatus(payment as 'success' | 'failure');
      // Limpar o parâmetro da URL
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!overview) return null;

  const planBadgeColor = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/15 text-primary",
    elite: "bg-gold-gradient text-black",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Payment Status Alert */}
        {paymentStatus === 'success' && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-700 dark:text-green-400 font-semibold">✓ Pagamento realizado com sucesso! Seu plano foi atualizado.</p>
          </div>
        )}
        {paymentStatus === 'failure' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-semibold">✗ Falha no pagamento. Por favor, tente novamente.</p>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Olá, {overview.userName.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bem-vindo de volta ao seu painel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${planBadgeColor[overview.plan]} font-semibold`}>
              <Crown className="w-3 h-3 mr-1" />
              {overview.planName}
            </Badge>
            <Link href="/dashboard/gerador">
              <Button className="bg-gold-gradient text-black font-semibold hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Criar Planilha
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Library className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{overview.templatesUnlocked}</div>
            <div className="text-xs text-muted-foreground mt-1">Modelos liberados</div>
          </Card>

          <Card className="p-5 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{overview.themesUnlocked}</div>
            <div className="text-xs text-muted-foreground mt-1">Temas liberados</div>
          </Card>

          <Card className="p-5 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{overview.aiUsesLeft}</div>
            <div className="text-xs text-muted-foreground mt-1">Usos de IA restantes</div>
          </Card>

          <Card className="p-5 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{overview.sheetsGenerated}</div>
            <div className="text-xs text-muted-foreground mt-1">Planilhas geradas</div>
          </Card>
        </div>

        {/* Plan Progress */}
        {!overview.unlimitedSheets && (
          <Card className="p-6 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Limite mensal</h3>
                <p className="text-sm text-muted-foreground">
                  {overview.sheetsGenerated} de 1 planilha usada este mês
                </p>
              </div>
              <Link href="/#planos">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Fazer upgrade
                </Button>
              </Link>
            </div>
            <Progress value={overview.sheetsGenerated * 100} className="h-2" />
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/gerador">
            <Card className="p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Gerar Planilha</h3>
              <p className="text-sm text-muted-foreground">Crie uma nova planilha a partir de um modelo</p>
            </Card>
          </Link>
          <Link href="/dashboard/modelos">
            <Card className="p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Library className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Biblioteca de Modelos</h3>
              <p className="text-sm text-muted-foreground">Explore todos os modelos disponíveis</p>
            </Card>
          </Link>
          <Link href="/dashboard/config">
            <Card className="p-6 bg-card/50 border-border/30 hover:border-primary/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Configurações</h3>
              <p className="text-sm text-muted-foreground">Gerencie seu perfil e preferências</p>
            </Card>
          </Link>
        </div>

        {/* Recent History */}
        <Card className="p-6 bg-card/50 border-border/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Histórico recente
            </h3>
            <span className="text-xs text-muted-foreground">{overview.totalSheets} total</span>
          </div>

          {overview.recentSheets.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Você ainda não gerou nenhuma planilha
              </p>
              <Link href="/dashboard/gerador">
                <Button className="bg-gold-gradient text-black font-semibold hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira planilha
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {overview.recentSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sheet.customName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.templateName} • {new Date(sheet.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  {sheet.fileUrl && (
                    <a href={sheet.fileUrl} download>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
