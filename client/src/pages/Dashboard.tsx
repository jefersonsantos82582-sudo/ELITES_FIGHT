import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileSpreadsheet, Library, Settings, Crown,
  Download, TrendingUp, Sparkles, Clock, FileDown, Plus, AlertCircle, RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ProfileCard from "@/components/ProfileCard";
import PlanBenefitsCard from "@/components/PlanBenefitsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const overviewQuery = trpc.dashboard.overview.useQuery(undefined, {
    enabled: !authLoading && Boolean(user),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { data: overview, isLoading, isError, error, refetch } = overviewQuery;
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

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando seu dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !overview) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-96 max-w-xl items-center justify-center">
          <Card className="w-full border-destructive/30 bg-card/60 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Não foi possível carregar o dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {error?.message || "A sessão ou os dados do dashboard não estão disponíveis neste momento."}
            </p>
            <Button className="mt-5" variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const planBadgeColor: Record<"free" | "pro" | "elite", string> = {
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
            <p className="font-semibold text-green-700 dark:text-green-400">Pagamento realizado com sucesso. Seu plano foi atualizado.</p>
          </div>
        )}
        {paymentStatus === 'failure' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="font-semibold text-red-700 dark:text-red-400">Falha no pagamento. Por favor, tente novamente.</p>
          </div>
        )}

        {/* Profile Card */}
        <ProfileCard
          userName={overview.userName}
          userEmail={overview.userEmail}
          userPhotoUrl={overview.userPhotoUrl}
          plan={overview.plan}
          planName={overview.planName}
          planExpiresAt={overview.planExpiresAt}
          planDescription={overview.planDescription}
        />

        {/* Plan Benefits Card */}
        <PlanBenefitsCard
          planName={overview.planName}
          templatesUnlocked={overview.templatesUnlocked}
          totalTemplates={overview.totalTemplates}
          themesUnlocked={overview.themesUnlocked}
          aiUsesLeft={overview.aiUsesLeft}
          maxAiUses={overview.maxAiUses}
          customLogo={overview.customLogo}
          hasWatermark={overview.hasWatermark}
          unlimitedSheets={overview.unlimitedSheets}
          sheetsGeneratedThisMonth={overview.sheetsGeneratedThisMonth}
          planFeatures={overview.planFeatures}
        />

        {/* Quick Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold">
              Ações rápidas
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Comece a criar suas planilhas
            </p>
          </div>
          <Link href="/dashboard/gerador">
            <Button className="bg-gold-gradient text-black font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Criar Planilha
            </Button>
          </Link>
        </div>

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

        {/* Plan Progress */}
        {!overview.unlimitedSheets && (
          <Card className="p-6 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Limite mensal</h3>
                <p className="text-sm text-muted-foreground">
                  {overview.sheetsGeneratedThisMonth} de 1 planilha usada este mês
                </p>
              </div>
              <Link href="/#planos">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Fazer upgrade
                </Button>
              </Link>
            </div>
            <Progress value={Math.min(overview.sheetsGeneratedThisMonth * 100, 100)} className="h-2" />
          </Card>
        )}

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
