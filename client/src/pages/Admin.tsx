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
  ArrowUpRight, ArrowDownRight, Sparkles, Gift, Zap, DollarSign, Save,
  FolderKanban, Palette, Plus, Pencil, Trash2, X
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PlanVerifiedBadge from "@/components/PlanVerifiedBadge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ColumnDefUI {
  key: string;
  label: string;
  type: string;
}

interface ThemeUI {
  name: string;
  header: string;
  accent: string;
  plan: string;
}

const emptyTemplateForm = {
  id: null as number | null,
  name: "",
  slug: "",
  categoryId: "",
  plan: "free" as string,
  description: "",
  headerColor: "#D4AF37",
  accentColor: "#1A1A1A",
  isFeatured: false,
  columns: [{ key: "item", label: "Item", type: "text" }] as ColumnDefUI[],
};

const emptyCategoryForm = {
  id: null as number | null,
  name: "",
  slug: "",
  description: "",
  icon: "",
  displayOrder: 0,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Edição de plano/preço
  const [editingPlanCode, setEditingPlanCode] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{ priceMonthly: string; priceYearly: string; maxAiUses: number; maxTemplates: number; description: string }>({
    priceMonthly: "", priceYearly: "", maxAiUses: 0, maxTemplates: 0, description: "",
  });

  // Gestão de administradores
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Criar plano
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [createPlanForm, setCreatePlanForm] = useState({
    code: "", name: "", priceMonthly: "0", priceYearly: "0",
    description: "", maxTemplates: 5, maxThemes: 5, maxAiUses: 0,
    unlimitedSheets: false, hasWatermark: true, customLogo: false, displayOrder: 0,
  });

  // Modal de upgrade manual
  const [upgradeUserId, setUpgradeUserId] = useState<number | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<string>("pro");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Categorias
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Modelos (form)
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Cores (temas)
  const defaultThemes: ThemeUI[] = [
    { name: "Ouro Premium", header: "#D4AF37", accent: "#1A1A1A", plan: "free" },
    { name: "Azul Executivo", header: "#1E40AF", accent: "#1E3A8A", plan: "free" },
    { name: "Verde Corporativo", header: "#059669", accent: "#064E3B", plan: "free" },
    { name: "Vermelho Elite", header: "#DC2626", accent: "#7F1D1D", plan: "free" },
    { name: "Roxo Moderno", header: "#7C3AED", accent: "#4C1D95", plan: "free" },
    { name: "Cinza Elegante", header: "#4B5563", accent: "#1F2937", plan: "free" },
    { name: "Laranja Vibrante", header: "#EA580C", accent: "#7C2D12", plan: "pro" },
    { name: "Teal Moderno", header: "#0F766E", accent: "#134E4A", plan: "pro" },
  ];
  const [themes, setThemes] = useState<ThemeUI[]>(defaultThemes);
  const [themesLoaded, setThemesLoaded] = useState(false);

  // Modal de sorteio
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [drawPlan, setDrawPlan] = useState<string>("pro");
  const [drawResult, setDrawResult] = useState<UserInfo | null>(null);
  const [drawWinners, setDrawWinners] = useState<UserInfo[]>([]);

  // Modal de detalhes do usuário
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  // Verificar autorização inicial (sessão normal com role/email admin).
  // O cookie admin_key é httpOnly por segurança, então não dá pra checar via
  // document.cookie no navegador — em vez disso, perguntamos ao servidor.
  useEffect(() => {
    if (user?.role === "admin") {
      setIsAuthorized(true);
    }
  }, [user]);

  const sessionCheckQuery = trpc.admin.checkSession.useQuery(undefined, {
    enabled: !isAuthorized,
    retry: false,
  });

  useEffect(() => {
    if (sessionCheckQuery.data?.authorized) {
      setIsAuthorized(true);
    }
  }, [sessionCheckQuery.data]);

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: () => {
      setIsAuthorized(true);
      setLoggingIn(false);
    },
    onError: (err) => {
      setAuthError(err.message || "E-mail ou senha de acesso inválidos.");
      setLoggingIn(false);
    },
  });

  const logoutMutation = trpc.admin.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!adminEmail) {
      setAuthError("Digite o e-mail de acesso");
      return;
    }
    if (!adminPass) {
      setAuthError("Digite a senha de acesso");
      return;
    }

    setLoggingIn(true);
    loginMutation.mutate({ email: adminEmail, password: adminPass });
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
      statsQuery.refetch();
      setEditingPlanCode(null);
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar plano: ${err.message}`);
    }
  });
  const createPlanMutation = trpc.admin.createPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano criado com sucesso!");
      plansQuery.refetch();
      statsQuery.refetch();
      setShowCreatePlanDialog(false);
      setCreatePlanForm({
        code: "", name: "", priceMonthly: "0", priceYearly: "0",
        description: "", maxTemplates: 5, maxThemes: 5, maxAiUses: 0,
        unlimitedSheets: false, hasWatermark: true, customLogo: false, displayOrder: 0,
      });
    },
    onError: (err) => {
      toast.error(`Erro ao criar plano: ${err.message}`);
    }
  });
  const deletePlanMutation = trpc.admin.deletePlan.useMutation({
    onSuccess: () => {
      toast.success("Plano removido!");
      plansQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao remover plano: ${err.message}`);
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

  const adminsQuery = trpc.admin.listAdmins.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  const categoriesQuery = trpc.admin.listAllCategories.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  const settingsQuery = trpc.admin.getSettings.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
  });

  useEffect(() => {
    if (!themesLoaded && settingsQuery.data) {
      const themesSetting = settingsQuery.data.find((s: any) => s.key === "themes");
      if (themesSetting?.value && Array.isArray(themesSetting.value) && themesSetting.value.length > 0) {
        setThemes(themesSetting.value as ThemeUI[]);
      }
      setThemesLoaded(true);
    }
  }, [settingsQuery.data, themesLoaded]);

  const addAdminMutation = trpc.admin.addAdmin.useMutation({
    onSuccess: () => {
      toast.success("Administrador adicionado com sucesso!");
      adminsQuery.refetch();
      setNewAdminEmail("");
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar administrador: ${err.message}`);
    },
  });

  const removeAdminMutation = trpc.admin.removeAdmin.useMutation({
    onSuccess: () => {
      toast.success("Administrador removido!");
      adminsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
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
      setShowTemplateDialog(false);
      setTemplateForm(emptyTemplateForm);
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
      setShowTemplateDialog(false);
      setTemplateForm(emptyTemplateForm);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const createCategoryMutation = trpc.admin.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada com sucesso!");
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      setCategoryForm(emptyCategoryForm);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const updateCategoryMutation = trpc.admin.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada!");
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      setCategoryForm(emptyCategoryForm);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const deleteCategoryMutation = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Categoria removida!");
      categoriesQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao remover categoria: ${err.message}`);
    }
  });

  const updateSettingMutation = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Cores salvas com sucesso!");
      settingsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    }
  });

  const openNewCategory = () => {
    setCategoryForm(emptyCategoryForm);
    setShowCategoryDialog(true);
  };

  const openEditCategory = (cat: any) => {
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "",
      displayOrder: cat.displayOrder ?? 0,
    });
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description || undefined,
      icon: categoryForm.icon || undefined,
      displayOrder: categoryForm.displayOrder,
    };
    if (categoryForm.id) {
      updateCategoryMutation.mutate({ id: categoryForm.id, ...payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const openNewTemplate = () => {
    setTemplateForm(emptyTemplateForm);
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (tpl: any) => {
    setTemplateForm({
      id: tpl.id,
      name: tpl.name,
      slug: tpl.slug,
      categoryId: String(tpl.categoryId),
      plan: tpl.plan,
      description: tpl.description || "",
      headerColor: tpl.headerColor || "#D4AF37",
      accentColor: tpl.accentColor || "#1A1A1A",
      isFeatured: !!tpl.isFeatured,
      columns: Array.isArray(tpl.columns) && tpl.columns.length > 0 ? tpl.columns : emptyTemplateForm.columns,
    });
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.slug.trim() || !templateForm.categoryId) {
      toast.error("Nome, slug e categoria são obrigatórios");
      return;
    }
    const columns = templateForm.columns.filter(c => c.key.trim() && c.label.trim());
    if (columns.length === 0) {
      toast.error("Adicione ao menos uma coluna");
      return;
    }
    const basePayload = {
      name: templateForm.name,
      slug: templateForm.slug,
      description: templateForm.description || undefined,
      plan: templateForm.plan,
      columns,
      headerColor: templateForm.headerColor,
      accentColor: templateForm.accentColor,
    };
    if (templateForm.id) {
      updateTemplateMutation.mutate({
        id: templateForm.id,
        ...basePayload,
        categoryId: parseInt(templateForm.categoryId),
        isFeatured: templateForm.isFeatured,
      });
    } else {
      createTemplateMutation.mutate({
        ...basePayload,
        categoryId: parseInt(templateForm.categoryId),
      });
    }
  };

  const addColumnRow = () => {
    setTemplateForm(f => ({ ...f, columns: [...f.columns, { key: "", label: "", type: "text" }] }));
  };

  const removeColumnRow = (idx: number) => {
    setTemplateForm(f => ({ ...f, columns: f.columns.filter((_, i) => i !== idx) }));
  };

  const updateColumnRow = (idx: number, field: keyof ColumnDefUI, value: string) => {
    setTemplateForm(f => ({
      ...f,
      columns: f.columns.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  };

  const addTheme = () => {
    setThemes(t => [...t, { name: "Novo Tema", header: "#D4AF37", accent: "#1A1A1A", plan: "free" }]);
  };

  const removeTheme = (idx: number) => {
    setThemes(t => t.filter((_, i) => i !== idx));
  };

  const updateThemeField = (idx: number, field: keyof ThemeUI, value: string) => {
    setThemes(t => t.map((theme, i) => (i === idx ? { ...theme, [field]: value } : theme)));
  };

  const saveThemes = () => {
    updateSettingMutation.mutate({ key: "themes", value: themes });
  };

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
                Acesso restrito. Insira seu e-mail e a chave de segurança.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail de Acesso</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-key">Chave de Acesso</Label>
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

              <Button type="submit" className="w-full bg-gold-gradient text-black font-bold" disabled={loggingIn}>
                {loggingIn ? (
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
              onClick={() => logoutMutation.mutate()}
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
            <TabsTrigger value="categories" className="gap-2">
              <FolderKanban className="h-4 w-4" /> Categorias
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="h-4 w-4" /> Cores
            </TabsTrigger>
            <TabsTrigger value="draw" className="gap-2">
              <Dice1 className="h-4 w-4" /> Sorteio
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <ShieldAlert className="h-4 w-4" /> Administradores
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
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Acessos ao Site</p>
                    <p className="text-3xl font-bold">{statsQuery.data.totalPageViews || 0}</p>
                  </Card>
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Vendas Concluídas</p>
                    <p className="text-3xl font-bold text-green-600">{statsQuery.data.completedSales || 0}</p>
                  </Card>
                </div>

                {/* Resumo de planos */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Distribuição de Planos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsQuery.data.allPlans?.map((p: any) => {
                      const count = statsQuery.data.planCounts[p.code] ?? 0;
                      const isFree = parseFloat(p.priceMonthly || "0") <= 0;
                      const isElite = p.code === "elite";
                      return (
                        <div key={p.code} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: isFree ? "#f5f5f5" : isElite ? "linear-gradient(135deg, #D4AF37, #F9E79F)" : "rgba(0,118,186,0.08)" }}>
                          <div>
                            <p className="text-sm font-medium">{p.name || p.code}</p>
                            <p className="text-xs text-muted-foreground">{isFree ? "Gratuito" : `R$ ${p.priceMonthly}/mês`}</p>
                          </div>
                          <Badge variant={isFree ? "outline" : undefined} className={isElite ? "text-black" : !isFree ? "bg-primary/15 text-primary" : ""}>{count} usuários</Badge>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Ações rápidas */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(statsQuery.data.allPlans || []).filter((p: any) => parseFloat(p.priceMonthly || "0") > 0).map((p: any) => (
                      <Button
                        key={p.code}
                        variant="outline"
                        onClick={() => { setDrawPlan(p.code); setShowDrawDialog(true); }}
                        className="flex items-center gap-2"
                      >
                        <Dice1 className="w-4 h-4" />
                        Fazer Sorteio ({p.name || p.code})
                      </Button>
                    ))}
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
                        const planInfo = statsQuery.data?.allPlans?.find((p: any) => p.code === u.plan);
                        const planBadge = u.plan === "elite"
                          ? "bg-gold-gradient text-black"
                          : planInfo && parseFloat(planInfo.priceMonthly || "0") > 0
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
                                <span className="font-medium truncate max-w-[120px] flex items-center gap-1">
                                  {u.name || "Sem nome"}
                                  <PlanVerifiedBadge plan={u.plan} size={13} />
                                </span>
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
                                  onClick={() => { setUpgradeUserId(u.id); const currentPlanInfo = statsQuery.data?.allPlans?.find((p: any) => p.code === u.plan); const nextPlan = (statsQuery.data?.allPlans || []).filter((p: any) => parseFloat(p.priceMonthly || "0") > 0 && p.code !== u.plan); setUpgradePlan(nextPlan[0]?.code || "pro"); setShowUpgradeDialog(true); }}
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {templatesQuery.data?.length || 0} modelos
                  </Badge>
                  <Button size="sm" className="bg-gold-gradient text-black font-semibold" onClick={openNewTemplate}>
                    <Plus className="w-4 h-4 mr-1" /> Novo Modelo
                  </Button>
                </div>
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
                              (statsQuery.data?.allPlans || []).find((pp: any) => pp.code === tpl.plan)?.displayOrder === 2 ? "bg-primary/15 text-primary" :
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
                              <div className="flex items-center gap-1 mr-2">
                                <div className="w-4 h-4 rounded border border-border/30" style={{ backgroundColor: tpl.headerColor || "#D4AF37" }} title="Cor do cabeçalho" />
                                <div className="w-4 h-4 rounded border border-border/30" style={{ backgroundColor: tpl.accentColor || "#1A1A1A" }} title="Cor de destaque" />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditTemplate(tpl)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
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
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{plansQuery.data?.length || 0} planos</Badge>
                  <Button size="sm" className="bg-gold-gradient text-black font-semibold" onClick={() => setShowCreatePlanDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Novo Plano
                  </Button>
                </div>
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
                            parseFloat(p.priceMonthly || "0") > 0 ? "bg-primary/15 text-primary" :
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
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja remover o plano ${p.name || p.code}?`)) {
                                    deletePlanMutation.mutate({ id: p.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* ==================== CATEGORIAS ==================== */}
          <TabsContent value="categories" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  Categorias
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{categoriesQuery.data?.length || 0} categorias</Badge>
                  <Button size="sm" className="bg-gold-gradient text-black font-semibold" onClick={openNewCategory}>
                    <Plus className="w-4 h-4 mr-1" /> Nova Categoria
                  </Button>
                </div>
              </div>

              {categoriesQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />)}
                </div>
              ) : categoriesQuery.data?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 font-medium">Nome</th>
                        <th className="text-left p-3 font-medium">Slug</th>
                        <th className="text-left p-3 font-medium">Ordem</th>
                        <th className="text-right p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriesQuery.data?.map((cat: any) => (
                        <tr key={cat.id} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="p-3 font-medium">{cat.name}</td>
                          <td className="p-3 text-muted-foreground">{cat.slug}</td>
                          <td className="p-3 text-muted-foreground">{cat.displayOrder}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditCategory(cat)} title="Editar">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Deletar categoria "${cat.name}"? Modelos vinculados podem ficar órfãos.`)) {
                                    deleteCategoryMutation.mutate({ id: cat.id });
                                  }
                                }}
                                title="Deletar"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
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

          {/* ==================== CORES ==================== */}
          <TabsContent value="colors" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Temas de Cores
                </h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addTheme}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Tema
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold-gradient text-black font-semibold"
                    onClick={saveThemes}
                    disabled={updateSettingMutation.isPending}
                  >
                    {updateSettingMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                    Salvar Cores
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Estes temas aparecem para os usuários na etapa de personalização da planilha.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map((theme, idx) => (
                  <Card key={idx} className="p-4 space-y-3 border-border/30">
                    <div className="flex items-center justify-between">
                      <Input
                        value={theme.name}
                        onChange={e => updateThemeField(idx, "name", e.target.value)}
                        className="text-sm font-medium"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeTheme(idx)} title="Remover tema">
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Cabeçalho</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="color"
                            value={theme.header}
                            onChange={e => updateThemeField(idx, "header", e.target.value)}
                            className="w-8 h-8 rounded border border-border/30 cursor-pointer"
                          />
                          <Input value={theme.header} onChange={e => updateThemeField(idx, "header", e.target.value)} className="text-xs" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Destaque</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="color"
                            value={theme.accent}
                            onChange={e => updateThemeField(idx, "accent", e.target.value)}
                            className="w-8 h-8 rounded border border-border/30 cursor-pointer"
                          />
                          <Input value={theme.accent} onChange={e => updateThemeField(idx, "accent", e.target.value)} className="text-xs" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Plano mínimo</Label>
                      <Select value={theme.plan} onValueChange={(v) => updateThemeField(idx, "plan", v)}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(plansQuery.data || []).map((p: any) => (
                            <SelectItem key={p.code} value={p.code}>{p.name || p.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
              </div>
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
                  <Select value={drawPlan} onValueChange={(v) => setDrawPlan(v)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(statsQuery.data?.allPlans || []).filter((p: any) => parseFloat(p.priceMonthly || "0") > 0).map((p: any) => (
                        <SelectItem key={p.code} value={p.code}>{p.name} (R$ {p.priceMonthly}/mês)</SelectItem>
                      ))}
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
                      <p className="text-xl font-bold flex items-center justify-center gap-1.5">
                        {drawResult.name || drawResult.email}
                        <PlanVerifiedBadge plan={drawResult.plan} size={18} />
                      </p>
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
                              <p className="text-sm font-medium flex items-center gap-1">
                                {w.name || w.email}
                                <PlanVerifiedBadge plan={w.plan} size={13} />
                              </p>
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

          {/* ==================== ADMINISTRADORES ==================== */}
          <TabsContent value="admins" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  Administradores do Painel
                </h3>
                <Badge variant="outline">
                  {adminsQuery.data?.length || 0} administradores
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Qualquer e-mail nesta lista consegue acessar o painel em <code>/admin</code> usando a mesma chave de acesso.
                Adicione o e-mail de quem deve ter controle total do site.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAdminEmail) return;
                  addAdminMutation.mutate({ email: newAdminEmail });
                }}
                className="flex flex-col sm:flex-row gap-2 mb-6"
              >
                <Input
                  type="email"
                  placeholder="novoadmin@email.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={addAdminMutation.isPending} className="bg-gold-gradient text-black font-bold">
                  {addAdminMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adicionando...</>
                  ) : (
                    <>Adicionar Administrador</>
                  )}
                </Button>
              </form>

              {adminsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {adminsQuery.data?.map((email) => (
                    <div key={email} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {email[0].toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover acesso de administrador de ${email}?`)) {
                            removeAdminMutation.mutate({ email });
                          }
                        }}
                        disabled={removeAdminMutation.isPending}
                        title="Remover acesso"
                      >
                        <Ban className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              <Select value={upgradePlan} onValueChange={(v) => setUpgradePlan(v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(statsQuery.data?.allPlans || []).map((p: any) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name} ({parseFloat(p.priceMonthly || "0") > 0 ? `R$ ${p.priceMonthly}/mês` : "Gratuito"})
                    </SelectItem>
                  ))}
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
                  <p className="text-lg font-bold flex items-center gap-1.5">
                    {selectedUser.name || "Sem nome"}
                    <PlanVerifiedBadge plan={selectedUser.plan} size={16} />
                  </p>
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

      {/* ==================== DIALOG: CATEGORIA ==================== */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{categoryForm.id ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                className="mt-1.5"
                value={categoryForm.name}
                onChange={e => {
                  const name = e.target.value;
                  setCategoryForm(f => ({ ...f, name, slug: f.id ? f.slug : slugify(name) }));
                }}
                placeholder="Ex: Finanças Pessoais"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                className="mt-1.5"
                value={categoryForm.slug}
                onChange={e => setCategoryForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="ex-financas-pessoais"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                className="mt-1.5"
                value={categoryForm.description}
                onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição curta da categoria"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ícone (lucide-react)</Label>
                <Input
                  className="mt-1.5"
                  value={categoryForm.icon}
                  onChange={e => setCategoryForm(f => ({ ...f, icon: e.target.value }))}
                  placeholder="Ex: Wallet"
                />
              </div>
              <div>
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={categoryForm.displayOrder}
                  onChange={e => setCategoryForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancelar</Button>
            <Button
              className="bg-gold-gradient text-black font-semibold"
              onClick={handleSaveCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: MODELO ==================== */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateForm.id ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input
                  className="mt-1.5"
                  value={templateForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    setTemplateForm(f => ({ ...f, name, slug: f.id ? f.slug : slugify(name) }));
                  }}
                  placeholder="Ex: Controle Financeiro Mensal"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  className="mt-1.5"
                  value={templateForm.slug}
                  onChange={e => setTemplateForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={templateForm.categoryId} onValueChange={(v) => setTemplateForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((cat: any) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plano necessário</Label>
                <Select value={templateForm.plan} onValueChange={(v) => setTemplateForm(f => ({ ...f, plan: v as any }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(plansQuery.data || []).map((p: any) => (
                      <SelectItem key={p.code} value={p.code}>{p.name || p.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                className="mt-1.5"
                value={templateForm.description}
                onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição curta do modelo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor do cabeçalho</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={templateForm.headerColor}
                    onChange={e => setTemplateForm(f => ({ ...f, headerColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                  />
                  <Input value={templateForm.headerColor} onChange={e => setTemplateForm(f => ({ ...f, headerColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor de destaque</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={templateForm.accentColor}
                    onChange={e => setTemplateForm(f => ({ ...f, accentColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                  />
                  <Input value={templateForm.accentColor} onChange={e => setTemplateForm(f => ({ ...f, accentColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={templateForm.isFeatured}
                onChange={e => setTemplateForm(f => ({ ...f, isFeatured: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="isFeatured">Destacar na página inicial</Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Colunas da planilha</Label>
                <Button variant="outline" size="sm" onClick={addColumnRow}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Coluna
                </Button>
              </div>
              <div className="space-y-2">
                {templateForm.columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="chave (ex: item)"
                      value={col.key}
                      onChange={e => updateColumnRow(idx, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="rótulo (ex: Item)"
                      value={col.label}
                      onChange={e => updateColumnRow(idx, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Select value={col.type} onValueChange={(v) => updateColumnRow(idx, "type", v)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="currency">Moeda</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="percent">Porcentagem</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeColumnRow(idx)} disabled={templateForm.columns.length <= 1}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancelar</Button>
            <Button
              className="bg-gold-gradient text-black font-semibold"
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: Novo Plano ==================== */}
      <Dialog open={showCreatePlanDialog} onOpenChange={setShowCreatePlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Criar Novo Plano
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código (identificador único)</Label>
              <Input
                className="mt-1.5"
                value={createPlanForm.code}
                onChange={(e) => setCreatePlanForm(f => ({ ...f, code: e.target.value }))}
                placeholder="Ex: premium"
              />
            </div>
            <div>
              <Label>Nome do Plano</Label>
              <Input
                className="mt-1.5"
                value={createPlanForm.name}
                onChange={(e) => setCreatePlanForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço Mensal (R$)</Label>
                <Input
                  className="mt-1.5"
                  value={createPlanForm.priceMonthly}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, priceMonthly: e.target.value }))}
                />
              </div>
              <div>
                <Label>Preço Anual (R$)</Label>
                <Input
                  className="mt-1.5"
                  value={createPlanForm.priceYearly}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, priceYearly: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                className="mt-1.5"
                value={createPlanForm.description}
                onChange={(e) => setCreatePlanForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Usos IA</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={createPlanForm.maxAiUses}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, maxAiUses: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">Máx. Modelos</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={createPlanForm.maxTemplates}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, maxTemplates: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label className="text-xs">Máx. Temas</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={createPlanForm.maxThemes}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, maxThemes: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createPlanForm.unlimitedSheets}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, unlimitedSheets: e.target.checked }))}
                />
                Planilhas ilimitadas
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createPlanForm.hasWatermark}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, hasWatermark: e.target.checked }))}
                />
                Marca d'água
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createPlanForm.customLogo}
                  onChange={(e) => setCreatePlanForm(f => ({ ...f, customLogo: e.target.checked }))}
                />
                Logo customizado
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlanDialog(false)}>Cancelar</Button>
            <Button
              className="bg-gold-gradient text-black font-bold"
              disabled={createPlanMutation.isPending || !createPlanForm.code || !createPlanForm.name}
              onClick={() => {
                createPlanMutation.mutate({
                  ...createPlanForm,
                  features: [],
                });
              }}
            >
              {createPlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
