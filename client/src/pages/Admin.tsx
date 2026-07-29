import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, Users, FileSpreadsheet, Settings,
  ShieldAlert, Loader2, AlertCircle, RefreshCw, Key, Mail,
  Crown, Dice1, Trophy, UserCheck, UserX, Ban, Eye,
  ArrowUpRight, ArrowDownRight, Sparkles, Gift, Zap, DollarSign, Save
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UserInfo {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  loginMethod: string | null;
  role: string;
  plan: string;
  suspended: boolean;
  sheetsGenerated: number;
  aiUsesLeft: number;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
  planExpiresAt: Date | null;
}

const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingLogin, setCheckingLogin] = useState(false);

  // Edição de plano/preço
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{ priceMonthly: string; priceYearly: string; maxAiUses: number; maxTemplates: number; description: string }>({
    priceMonthly: "", priceYearly: "", maxAiUses: 0, maxTemplates: 0, description: "",
  });

  // Modal de upgrade manual
  const [upgradeUserId, setUpgradeUserId] = useState<number | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<"free" | "pro" | "elite">("pro");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Modal de sorteio
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [drawPlan, setDrawPlan] = useState<"pro" | "elite">("pro");
  const [drawResult, setDrawResult] = useState<UserInfo | null>(null);
  const [drawWinners, setDrawWinners] = useState<UserInfo[]>([]);

  // Modal de detalhes do usuário
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  // Verificar autorização inicial: login já feito via Google com e-mail de admin,
  // ou já tem cookie de chave+email válidos salvos de uma sessão anterior.
  useEffect(() => {
    const isEmailAuthorized = user && AUTHORIZED_ADMINS.includes((user.email || "").toLowerCase());

    const cookies = document.cookie.split('; ');
    const hasKey = cookies.some(row => row.startsWith('admin_key='));
    const hasEmailCookie = cookies.some(row => row.startsWith('admin_email='));

    if ((hasKey && hasEmailCookie) || isEmailAuthorized || user?.role === "admin") {
      setIsAuthorized(true);
    }
  }, [user]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const emailNormalized = adminEmail.trim().toLowerCase();
    if (!emailNormalized) {
      setAuthError("Digite o e-mail de administrador");
      return;
    }
    if (!AUTHORIZED_ADMINS.includes(emailNormalized)) {
      setAuthError("Este e-mail não está na lista de administradores");
      return;
    }
    if (!adminPass) {
      setAuthError("Digite a senha de acesso");
      return;
    }

    setCheckingLogin(true);
    try {
      // Testa as credenciais direto contra o servidor antes de liberar o painel
      const res = await fetch("/api/trpc/admin.stats", {
        headers: {
          "x-admin-key": adminPass,
          "x-admin-email": emailNormalized,
        },
      });
      const ok = res.status === 200;

      if (!ok) {
        setAuthError("Senha ou e-mail incorretos.");
        setCheckingLogin(false);
        return;
      }

      document.cookie = `admin_key=${adminPass}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `admin_email=${emailNormalized}; path=/; max-age=86400; SameSite=Lax`;
      window.location.reload();
    } catch {
      setAuthError("Não foi possível validar o acesso. Tente novamente.");
      setCheckingLogin(false);
    }
  };

  // Queries administrativas
  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  useEffect(() => {
    const err = statsQuery.error;
    if (err && (err.message.includes("FORBIDDEN") || err.message.includes("UNAUTHORIZED"))) {
      setIsAuthorized(false);
      setAuthError("Sessão de administrador inválida ou expirada. Faça login novamente.");
    }
  }, [statsQuery.error]);

  const plansQuery = trpc.plans.list.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  const updatePlanMutation = trpc.admin.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plano atualizado com sucesso!");
      plansQuery.refetch();
      setEditingPlanCode(null);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar plano: ${err.message}`);
    }
  });

  const usersQuery = trpc.admin.listAllUsers.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const templatesQuery = trpc.admin.listAllTemplates.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  // Mutations
  const updateUserPlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano do usuário atualizado com sucesso!");
      usersQuery.refetch();
      statsQuery.refetch();
      setShowUpgradeDialog(false);
      setUpgradeUserId(null);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar plano: ${err.message}`);
    }
  });

  const toggleSuspensionMutation = trpc.admin.toggleUserSuspension.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado!");
      usersQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido!");
      usersQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const createTemplateMutation = trpc.admin.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo criado com sucesso!");
      templatesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const deleteTemplateMutation = trpc.admin.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo removido!");
      templatesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const updateTemplateMutation = trpc.admin.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Modelo atualizado!");
      templatesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  // Sorteio
  const handleDraw = () => {
    const eligibleUsers = (usersQuery.data || []).filter(
      (u: UserInfo) => u.role !== "admin" && !u.suspended
    );
    if (eligibleUsers.length === 0) {
      toast.error("Nenhum usuário elegível para o sorteio");
      return;
    }
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    const winner = eligibleUsers[randomIndex];
    setDrawResult(winner);

    // Atualizar plano do vencedor automaticamente
    updateUserPlanMutation.mutate({
      userId: winner.id,
      plan: drawPlan,
    });
  };

  // Loading
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Tela de login admin
  if (!isAuthorized) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <Card className="w-full p-8 border-border/30 bg-card/50 backdrop-blur-sm shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Acesso restrito. Informe o e-mail autorizado e a senha de acesso.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail de administrador</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="seuemail@gmail.com"
                    className="pl-10"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-key">Senha de Acesso</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-key"
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-10"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {authError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {authError}
                </p>
              )}

              <Button type="submit" className="w-full bg-gold-gradient text-black font-bold" disabled={checkingLogin}>
                {checkingLogin ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
                ) : (
                  "Liberar Acesso"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
            <p className="text-muted-foreground">Gerencie usuários, modelos, pagamentos e mais.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { usersQuery.refetch(); statsQuery.refetch(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                document.cookie = "admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "admin_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                window.location.reload();
              }}
            >
              Sair do Painel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Modelos
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <DollarSign className="h-4 w-4" /> Planos e Preços
            </TabsTrigger>
            <TabsTrigger value="draw" className="gap-2">
              <Dice1 className="h-4 w-4" /> Sorteio
            </TabsTrigger>
          </TabsList>

          {/* ==================== VISÃO GERAL ==================== */}
          <TabsContent value="overview" className="space-y-6">
            {statsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="h-32 animate-pulse bg-muted/20" />
                ))}
              </div>
            ) : statsQuery.data ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Total de Usuários</p>
                    <p className="text-3xl font-bold">{statsQuery.data.totalUsers}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Planilhas Geradas</p>
                    <p className="text-3xl font-bold">{statsQuery.data.totalSheets}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Modelos Ativos</p>
                    <p className="text-3xl font-bold">{statsQuery.data.totalTemplates}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Receita Estimada</p>
                    <p className="text-3xl font-bold text-primary">R$ {statsQuery.data.monthlyRevenue.toFixed(2)}</p>
                  </Card>
                </div>

                {/* Resumo de planos */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Distribuição de Planos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Free</p>
                        <p className="text-xs text-muted-foreground">Gratuito</p>
                      </div>
                      <Badge variant="outline">{statsQuery.data.planCounts.free} usuários</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Pro</p>
                        <p className="text-xs text-muted-foreground">Assinante</p>
                      </div>
                      <Badge className="bg-primary/15 text-primary">{statsQuery.data.planCounts.pro} usuários</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-primary/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Elite</p>
                        <p className="text-xs text-muted-foreground">Premium</p>
                      </div>
                      <Badge className="bg-gold-gradient text-black">{statsQuery.data.planCounts.elite} usuários</Badge>
                    </div>
                  </div>
                </Card>

                {/* Ações rápidas */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setDrawPlan("pro"); setShowDrawDialog(true); }}
                      className="flex items-center gap-2"
                    >
                      <Dice1 className="w-4 h-4" />
                      Fazer Sorteio (Pro)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setDrawPlan("elite"); setShowDrawDialog(true); }}
                      className="flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      Fazer Sorteio (Elite)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setShowDrawDialog(true); setDrawPlan("pro"); }}
                      className="flex items-center gap-2"
                    >
                      <Gift className="w-4 h-4" />
                      Upgrade Manual
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p>Erro ao carregar estatísticas</p>
                <Button variant="link" onClick={() => statsQuery.refetch()}>Tentar novamente</Button>
              </div>
            )}
          </TabsContent>

          {/* ==================== USUÁRIOS ==================== */}
          <TabsContent value="users" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Usuários Cadastrados
                </h3>
                <Badge variant="outline">
                  {usersQuery.data?.length || 0} usuários
                </Badge>
              </div>

              {usersQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : usersQuery.data?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 font-medium">Usuário</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Plano</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Planilhas</th>
                        <th className="text-left p-3 font-medium">Criado em</th>
                        <th className="text-right p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersQuery.data?.map((u: UserInfo) => {
                        const planBadge = u.plan === "elite"
                          ? "bg-gold-gradient text-black"
                          : u.plan === "pro"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground";

                        return (
                          <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                    {(u.name || u.email || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium truncate max-w-[120px]">{u.name || "Sem nome"}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[150px]">{u.email || "-"}</td>
                            <td className="p-3">
                              <Badge className={planBadge}>{u.plan.toUpperCase()}</Badge>
                            </td>
                            <td className="p-3">
                              {u.suspended ? (
                                <Badge variant="destructive" className="text-xs">SUSPENSO</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">ATIVO</Badge>
                              )}
                            </td>
                            <td className="p-3">{u.sheetsGenerated}</td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedUser(u); setShowUserDialog(true); }}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setUpgradeUserId(u.id); setUpgradePlan(u.plan === "elite" ? "pro" : "elite"); setShowUpgradeDialog(true); }}
                                  title="Upgrade de plano"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja ${u.suspended ? "ativar" : "suspender"} ${u.name || u.email}?`)) {
                                      toggleSuspensionMutation.mutate({ userId: u.id, suspended: !u.suspended });
                                    }
                                  }}
                                  title={u.suspended ? "Ativar" : "Suspender"}
                                >
                                  {u.suspended ? <UserCheck className="w-3.5 h-3.5 text-green-600" /> : <UserX className="w-3.5 h-3.5 text-destructive" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Tem certeza que deseja DELETAR o usuário ${u.name || u.email}? Esta ação é irreversível.`)) {
                                      deleteUserMutation.mutate({ userId: u.id });
                                    }
                                  }}
                                  title="Deletar"
                                >
                                  <Ban className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==================== MODELOS ==================== */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Modelos de Planilhas
                </h3>
                <Badge variant="outline">
                  {templatesQuery.data?.length || 0} modelos
                </Badge>
              </div>

              {templatesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : templatesQuery.data?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum modelo cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 font-medium">Nome</th>
                        <th className="text-left p-3 font-medium">Plano</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Colunas</th>
                        <th className="text-right p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templatesQuery.data?.map((tpl: any) => (
                        <tr key={tpl.id} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="p-3 font-medium">{tpl.name}</td>
                          <td className="p-3">
                            <Badge className={
                              tpl.plan === "elite" ? "bg-gold-gradient text-black" :
                              tpl.plan === "pro" ? "bg-primary/15 text-primary" :
                              "bg-muted text-muted-foreground"
                            }>{tpl.plan}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant={tpl.isActive ? "outline" : "destructive"} className="text-xs">
                              {tpl.isActive ? "ATIVO" : "INATIVO"}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {Array.isArray(tpl.columns) ? tpl.columns.length : "?"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  updateTemplateMutation.mutate({
                                    id: tpl.id,
                                    isActive: !tpl.isActive,
                                  });
                                }}
                                title={tpl.isActive ? "Desativar" : "Ativar"}
                              >
                                {tpl.isActive ? <Ban className="w-3.5 h-3.5 text-destructive" /> : <UserCheck className="w-3.5 h-3.5 text-green-600" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Deletar modelo "${tpl.name}"?`)) {
                                    deleteTemplateMutation.mutate({ id: tpl.id });
                                  }
                                }}
                                title="Deletar"
                              >
                                <Ban className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==================== PLANOS E PREÇOS ==================== */}
          <TabsContent value="plans" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Planos e Preços
                </h3>
                <Badge variant="outline">{plansQuery.data?.length || 0} planos</Badge>
              </div>

              {plansQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plansQuery.data?.map((p: any) => {
                    const isEditing = editingPlanCode === p.code;
                    return (
                      <Card key={p.code} className="p-5 border-border/40">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={
                            p.code === "elite" ? "bg-gold-gradient text-black" :
                            p.code === "pro" ? "bg-primary/15 text-primary" :
                            "bg-muted text-muted-foreground"
                          }>{p.name || p.code.toUpperCase()}</Badge>
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPlanCode(p.code);
                                setPlanForm({
                                  priceMonthly: p.priceMonthly ?? "0",
                                  priceYearly: p.priceYearly ?? "0",
                                  maxAiUses: p.maxAiUses ?? 0,
                                  maxTemplates: p.maxTemplates ?? 0,
                                  description: p.description ?? "",
                                });
                              }}
                            >
                              Editar
                            </Button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Preço mensal (R$)</Label>
                              <Input
                                value={planForm.priceMonthly}
                                onChange={(e) => setPlanForm(f => ({ ...f, priceMonthly: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Preço anual (R$)</Label>
                              <Input
                                value={planForm.priceYearly}
                                onChange={(e) => setPlanForm(f => ({ ...f, priceYearly: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Usos de IA por mês</Label>
                              <Input
                                type="number"
                                value={planForm.maxAiUses}
                                onChange={(e) => setPlanForm(f => ({ ...f, maxAiUses: Number(e.target.value) }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Máx. de modelos</Label>
                              <Input
                                type="number"
                                value={planForm.maxTemplates}
                                onChange={(e) => setPlanForm(f => ({ ...f, maxTemplates: Number(e.target.value) }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Descrição</Label>
                              <Input
                                value={planForm.description}
                                onChange={(e) => setPlanForm(f => ({ ...f, description: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                className="bg-gold-gradient text-black font-bold flex-1"
                                disabled={updatePlanMutation.isPending}
                                onClick={() => {
                                  updatePlanMutation.mutate({
                                    id: p.id,
                                    code: p.code,
                                    priceMonthly: planForm.priceMonthly,
                                    priceYearly: planForm.priceYearly,
                                    maxAiUses: planForm.maxAiUses,
                                    maxTemplates: planForm.maxTemplates,
                                    description: planForm.description,
                                  });
                                }}
                              >
                                {updatePlanMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><Save className="w-4 h-4 mr-2" /> Salvar</>
                                )}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPlanCode(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <p className="text-2xl font-bold">
                              R$ {Number(p.priceMonthly ?? 0).toFixed(2)}<span className="text-sm text-muted-foreground">/mês</span>
                            </p>
                            <p className="text-muted-foreground text-xs">Anual: R$ {Number(p.priceYearly ?? 0).toFixed(2)}</p>
                            <p className="text-muted-foreground text-xs">{p.description || "Sem descrição"}</p>
                            <div className="flex items-center justify-between pt-2 text-xs">
                              <span className="text-muted-foreground">Usos de IA/mês</span>
                              <span className="font-medium">{p.maxAiUses}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Máx. modelos</span>
                              <span className="font-medium">{p.maxTemplates}</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==================== SORTEIO ==================== */}
          <TabsContent value="draw" className="space-y-4">
            <Card className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Dice1 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Sorteio de Upgrade</h3>
                <p className="text-muted-foreground">
                  Sorteie um usuário aleatório e dê a ele um upgrade de plano como prêmio.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label>Plano para o vencedor:</Label>
                  <Select value={drawPlan} onValueChange={(v) => setDrawPlan(v as "pro" | "elite")}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro (R$ 14,99/mês)</SelectItem>
                      <SelectItem value="elite">Elite (R$ 24,99/mês)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleDraw}
                  disabled={!usersQuery.data || usersQuery.data.length === 0 || updateUserPlanMutation.isPending}
                  className="w-full bg-gold-gradient text-black font-bold text-lg py-6"
                >
                  {updateUserPlanMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" /> Realizar Sorteio</>
                  )}
                </Button>

                {drawResult && (
                  <Card className="p-6 mt-4 bg-primary/5 border-primary/30">
                    <div className="text-center">
                      <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Vencedor do sorteio:</p>
                      <p className="text-xl font-bold">{drawResult.name || drawResult.email}</p>
                      <p className="text-sm text-muted-foreground">{drawResult.email}</p>
                      <Badge className={`mt-3 ${drawPlan === "elite" ? "bg-gold-gradient text-black" : "bg-primary/15 text-primary"}`}>
                        {drawPlan.toUpperCase()} - Novo Plano
                      </Badge>
                    </div>
                  </Card>
                )}

                {drawWinners.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Vencedores anteriores (nesta sessão)
                    </h4>
                    <div className="space-y-2">
                      {drawWinners.map((w, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                              {(w.name || w.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{w.name || w.email}</p>
                              <p className="text-xs text-muted-foreground">{w.email}</p>
                            </div>
                          </div>
                          <Badge className="bg-primary/15 text-primary">Upgraded</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== MODAL: Upgrade Manual ==================== */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Upgrade Manual de Plano
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usuário:</Label>
              <p className="text-sm font-medium mt-1">
                {usersQuery.data?.find((u: UserInfo) => u.id === upgradeUserId)?.name || usersQuery.data?.find((u: UserInfo) => u.id === upgradeUserId)?.email || "Selecione na lista"}
              </p>
            </div>
            <div>
              <Label>Novo Plano:</Label>
              <Select value={upgradePlan} onValueChange={(v) => setUpgradePlan(v as "free" | "pro" | "elite")}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="pro">Pro (R$ 14,99/mês)</SelectItem>
                  <SelectItem value="elite">Elite (R$ 24,99/mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>Cancelar</Button>
            <Button
              className="bg-gold-gradient text-black font-bold"
              onClick={() => {
                if (upgradeUserId) {
                  updateUserPlanMutation.mutate({ userId: upgradeUserId, plan: upgradePlan });
                }
              }}
              disabled={updateUserPlanMutation.isPending}
            >
              {updateUserPlanMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Atualizando...</>
              ) : (
                <><Crown className="w-4 h-4 mr-2" /> Confirmar Upgrade</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: Detalhes do Usuário ==================== */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Detalhes do Usuário
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedUser.photoUrl ? (
                  <img src={selectedUser.photoUrl} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                    {(selectedUser.name || selectedUser.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold">{selectedUser.name || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email || "Sem email"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Plano Atual</p>
                  <p className="font-semibold">{selectedUser.plan.toUpperCase()}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold">{selectedUser.suspended ? "SUSPENSO" : "ATIVO"}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Planilhas Geradas</p>
                  <p className="font-semibold">{selectedUser.sheetsGenerated}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Créditos IA</p>
                  <p className="font-semibold">{selectedUser.aiUsesLeft}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Último login</p>
                  <p className="font-semibold">{new Date(selectedUser.lastSignedIn).toLocaleDateString("pt-BR")}</p>
                </div>
                {selectedUser.planExpiresAt && (
                  <div className="p-3 bg-muted/30 rounded-lg col-span-2">
                    <p className="text-xs text-muted-foreground">Plano expira em</p>
                    <p className="font-semibold">{new Date(selectedUser.planExpiresAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowUserDialog(false);
                    setUpgradeUserId(selectedUser.id);
                    setUpgradePlan(selectedUser.plan === "elite" ? "pro" : "elite");
                    setShowUpgradeDialog(true);
                  }}
                  className="bg-gold-gradient text-black"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" /> Upgrade de Plano
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toggleSuspensionMutation.mutate({ userId: selectedUser.id, suspended: !selectedUser.suspended });
                    setShowUserDialog(false);
                  }}
                >
                  {selectedUser.suspended ? <><UserCheck className="w-4 h-4 mr-2" /> Ativar</> : <><UserX className="w-4 h-4 mr-2" /> Suspender</>}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Deletar usuário ${selectedUser.name || selectedUser.email}?`)) {
                      deleteUserMutation.mutate({ userId: selectedUser.id });
                      setShowUserDialog(false);
                    }
                  }}
                >
                  <Ban className="w-4 h-4 mr-2" /> Deletar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
