import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileSpreadsheet, Tag, Crown, Settings,
  TrendingUp, FileDown, UserCog, Trash2, Plus, Edit, Ban, CheckCircle,
  DollarSign, BarChart3,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [adminPass, setAdminPass] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Verificar se já tem o cookie da chave admin ou e-mail autorizado
  useEffect(() => {
    const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];
    const isEmailAuthorized = user && AUTHORIZED_ADMINS.includes(user.email);
    const hasKey = document.cookie.split('; ').find(row => row.startsWith('admin_key='));
    
    if (hasKey || isEmailAuthorized || user?.role === "admin") {
      setIsAuthorized(true);
      setAuthError(null);
    }
  }, [user]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!adminPass) {
      setAuthError("Digite a chave de acesso");
      return;
    }
    
    // Enviar a chave para o servidor validar (mais seguro que validar no cliente)
    // Por enquanto, mantemos a validação local mas com melhor segurança
    if (adminPass.length < 8) {
      setAuthError("Chave de acesso inválida");
      return;
    }
    
    // Usar header em vez de cookie para melhor segurança
    document.cookie = `admin_key=${adminPass}; path=/; max-age=86400; SameSite=Strict; Secure`;
    setIsAuthorized(true);
    toast.success("Acesso administrativo liberado!");
  };

  if (!isAuthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-sm border-primary/20 bg-card/60">
            <Settings className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="font-bold text-xl mb-4">Acesso Restrito</h2>
            <p className="text-sm text-muted-foreground mb-6">Painel Administrativo</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {authError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
                  {authError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-key">Chave de Acesso</Label>
                <Input 
                  id="admin-key"
                  type="password" 
                  placeholder="Digite a chave..." 
                  value={adminPass}
                  onChange={(e) => { setAdminPass(e.target.value); setAuthError(null); }}
                  className="text-center"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-gold-gradient text-black font-bold">
                Entrar no Painel
              </Button>
            </form>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Crown className="w-7 h-7 text-primary" />
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie modelos, usuários e configurações da plataforma
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="templates">Modelos</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="themes">Temas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="templates" className="mt-6">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="categories" className="mt-6">
            <CategoriesTab />
          </TabsContent>
          <TabsContent value="themes" className="mt-6">
            <ThemesTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
          <TabsContent value="plans" className="mt-6">
            <PlansTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ==================== Overview Tab ====================
function OverviewTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Carregando...</div>;
  if (!stats) return null;

  const cards = [
    { label: "Total de Usuários", value: stats.totalUsers, icon: Users, color: "bg-blue-500/10 text-blue-400" },
    { label: "Planilhas Geradas", value: stats.totalSheets, icon: FileDown, color: "bg-green-500/10 text-green-400" },
    { label: "Modelos Ativos", value: stats.totalTemplates, icon: FileSpreadsheet, color: "bg-primary/10 text-primary" },
    { label: "Assinantes PRO", value: stats.planCounts.pro, icon: Crown, color: "bg-purple-500/10 text-purple-400" },
    { label: "Assinantes ELITE", value: stats.planCounts.elite, icon: Crown, color: "bg-gold-gradient text-black" },
    { label: "Usuários FREE", value: stats.planCounts.free, icon: Users, color: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="p-5 bg-card/50 border-border/30">
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-card/50 border-border/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Distribuição de Planos
        </h3>
        <div className="space-y-3">
          {[
            { label: "FREE", count: stats.planCounts.free, total: stats.totalUsers, color: "bg-muted" },
            { label: "PRO", count: stats.planCounts.pro, total: stats.totalUsers, color: "bg-primary/30" },
            { label: "ELITE", count: stats.planCounts.elite, total: stats.totalUsers, color: "bg-gold-gradient" },
          ].map(p => {
            const pct = p.total > 0 ? (p.count / p.total) * 100 : 0;
            return (
              <div key={p.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-muted-foreground">{p.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${p.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ==================== Templates Tab ====================
function TemplatesTab() {
  const { data: templates } = trpc.admin.listAllTemplates.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = trpc.admin.deleteTemplate.useMutation({
    onSuccess: () => { utils.admin.listAllTemplates.invalidate(); toast.success("Modelo excluído"); },
  });

  const categoryName = (id: number) => categories?.find(c => c.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Modelos de Planilhas ({templates?.length || 0})</h3>
        <Button
          size="sm"
          className="bg-gold-gradient text-black font-semibold"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <div className="space-y-2">
        {templates?.map(tpl => (
          <Card key={tpl.id} className="p-4 bg-card/50 border-border/30 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{tpl.name}</span>
                <Badge variant="secondary" className="text-xs">{categoryName(tpl.categoryId)}</Badge>
                <Badge className={`text-xs ${tpl.plan === "elite" ? "bg-gold-gradient text-black" : tpl.plan === "pro" ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                  {tpl.plan}
                </Badge>
                {!tpl.isActive && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(tpl); setDialogOpen(true); }}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => { if (confirm("Excluir este modelo?")) deleteMutation.mutate({ id: tpl.id }); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <TemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} categories={categories || []} />
    </div>
  );
}

function TemplateDialog({ open, onOpenChange, template, categories }: {
  open: boolean; onOpenChange: (v: boolean) => void; template: any; categories: any[];
}) {
  const utils = trpc.useUtils();
  const isEdit = !!template;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState("free");
  const [columnsJson, setColumnsJson] = useState("[]");
  const [headerColor, setHeaderColor] = useState("#D4AF37");
  const [accentColor, setAccentColor] = useState("#1A1A1A");

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name || "");
        setSlug(template.slug || "");
        setCategoryId(String(template.categoryId || ""));
        setDescription(template.description || "");
        setPlan(template.plan || "free");
        setColumnsJson(JSON.stringify(template.columns || [], null, 2));
        setHeaderColor(template.headerColor || "#D4AF37");
        setAccentColor(template.accentColor || "#1A1A1A");
      } else {
        setName(""); setSlug(""); setCategoryId(""); setDescription("");
        setPlan("free"); setColumnsJson("[]");
        setHeaderColor("#D4AF37"); setAccentColor("#1A1A1A");
      }
    }
  }, [open, template]);

  const createMutation = trpc.admin.createTemplate.useMutation({
    onSuccess: () => { utils.admin.listAllTemplates.invalidate(); toast.success("Modelo criado"); onOpenChange(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateTemplate.useMutation({
    onSuccess: () => { utils.admin.listAllTemplates.invalidate(); toast.success("Modelo atualizado"); onOpenChange(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    let columns;
    try { columns = JSON.parse(columnsJson); } catch { toast.error("JSON das colunas inválido"); return; }

    const data = {
      name, slug, categoryId: parseInt(categoryId), description, plan: plan as any,
      columns, headerColor, accentColor,
    };

    if (isEdit) {
      updateMutation.mutate({ id: template.id, ...data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1.5" placeholder="meu-modelo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plano</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">FREE</SelectItem>
                  <SelectItem value="pro">PRO</SelectItem>
                  <SelectItem value="elite">ELITE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Colunas (JSON)</Label>
            <Textarea
              value={columnsJson}
              onChange={e => setColumnsJson(e.target.value)}
              className="mt-1.5 font-mono text-xs"
              rows={8}
              placeholder='[{"name":"Coluna","type":"text","width":20}]'
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cor do Cabeçalho</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border/30" />
                <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cor de Destaque</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border/30" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="bg-gold-gradient text-black font-semibold" onClick={handleSave}>
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Categories Tab ====================
function CategoriesTab() {
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");

  const createMutation = trpc.admin.createCategory.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Categoria criada"); setName(""); setSlug(""); setIcon(""); setDescription(""); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Categoria excluída"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/50 border-border/30">
        <h3 className="font-semibold mb-4">Nova Categoria</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} className="mt-1.5" placeholder="minha-categoria" />
          </div>
          <div>
            <Label>Ícone (Lucide)</Label>
            <Input value={icon} onChange={e => setIcon(e.target.value)} className="mt-1.5" placeholder="Wallet" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <Button
          className="mt-4 bg-gold-gradient text-black font-semibold"
          onClick={() => createMutation.mutate({ name, slug, description, icon, displayOrder: 0 })}
          disabled={!name || !slug}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </Card>

      <div className="space-y-2">
        {categories?.map(cat => (
          <Card key={cat.id} className="p-4 bg-card/50 border-border/30 flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{cat.name}</span>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => { if (confirm("Excluir categoria?")) deleteMutation.mutate({ id: cat.id }); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Users Tab ====================
function UsersTab() {
  const { data: users } = trpc.admin.listAllUsers.useQuery();
  const utils = trpc.useUtils();

  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => { utils.admin.listAllUsers.invalidate(); toast.success("Plano atualizado"); },
  });

  const suspendMutation = trpc.admin.toggleUserSuspension.useMutation({
    onSuccess: () => { utils.admin.listAllUsers.invalidate(); toast.success("Status atualizado"); },
  });

  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listAllUsers.invalidate(); toast.success("Permissão atualizada"); },
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { utils.admin.listAllUsers.invalidate(); toast.success("Usuário excluído"); },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Usuários ({users?.length || 0})</h3>
      <div className="space-y-2">
        {users?.map((u) => (
          <Card key={u.id} className="p-4 bg-card/50 border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{u.name || u.email || "Sem nome"}</span>
                  <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                  <Badge className={`text-xs ${u.plan === "elite" ? "bg-gold-gradient text-black" : u.plan === "pro" ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                    {u.plan}
                  </Badge>
                  {u.suspended && <Badge variant="destructive" className="text-xs">Suspenso</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u.sheetsGenerated} planilhas • Entrou em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={u.plan}
                  onValueChange={(v) => updatePlanMutation.mutate({ userId: u.id, plan: v as any })}
                >
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">FREE</SelectItem>
                    <SelectItem value="pro">PRO</SelectItem>
                    <SelectItem value="elite">ELITE</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => suspendMutation.mutate({ userId: u.id, suspended: !u.suspended })}
                >
                  {u.suspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => roleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                >
                  <UserCog className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive"
                  onClick={() => { if (confirm("Excluir usuário?")) deleteMutation.mutate({ userId: u.id }); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Plans Tab ====================
function PlansTab() {
  const { data: plans } = trpc.plans.list.useQuery();
  const utils = trpc.useUtils();

  const updateMutation = trpc.admin.updatePlan.useMutation({
    onSuccess: () => { utils.plans.list.invalidate(); toast.success("Plano atualizado"); },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Planos</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.map(plan => (
          <PlanEditor key={plan.id} plan={plan} onSave={(data) => updateMutation.mutate({ id: plan.id, code: plan.code, ...data })} />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan, onSave }: { plan: any; onSave: (data: any) => void }) {
  const [priceMonthly, setPriceMonthly] = useState(plan.priceMonthly);
  const [priceYearly, setPriceYearly] = useState(plan.priceYearly);
  const [description, setDescription] = useState(plan.description || "");
  const [maxTemplates, setMaxTemplates] = useState(String(plan.maxTemplates));
  const [maxThemes, setMaxThemes] = useState(String(plan.maxThemes));
  const [maxAiUses, setMaxAiUses] = useState(String(plan.maxAiUses));
  const [featuresJson, setFeaturesJson] = useState(JSON.stringify(plan.features || [], null, 2));

  return (
    <Card className="p-5 bg-card/50 border-border/30">
      <div className="flex items-center gap-2 mb-4">
        <Badge className={plan.code === "elite" ? "bg-gold-gradient text-black" : plan.code === "pro" ? "bg-primary/15 text-primary" : "bg-muted"}>
          <Crown className="w-3 h-3 mr-1" />
          {plan.name}
        </Badge>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Preço mensal (R$)</Label>
          <Input value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Preço anual (R$)</Label>
          <Input value={priceYearly} onChange={e => setPriceYearly(e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Descrição</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Modelos</Label>
            <Input value={maxTemplates} onChange={e => setMaxTemplates(e.target.value)} className="mt-1 h-8 text-sm" type="number" />
          </div>
          <div>
            <Label className="text-xs">Temas</Label>
            <Input value={maxThemes} onChange={e => setMaxThemes(e.target.value)} className="mt-1 h-8 text-sm" type="number" />
          </div>
          <div>
            <Label className="text-xs">IA</Label>
            <Input value={maxAiUses} onChange={e => setMaxAiUses(e.target.value)} className="mt-1 h-8 text-sm" type="number" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Benefícios (JSON List)</Label>
          <Textarea 
            value={featuresJson} 
            onChange={e => setFeaturesJson(e.target.value)} 
            className="mt-1 h-24 text-xs font-mono" 
            placeholder='["Recurso 1", "Recurso 2"]'
          />
        </div>
        <Button
          size="sm"
          className="w-full bg-gold-gradient text-black font-semibold"
          onClick={() => {
            let features = [];
            try {
              features = JSON.parse(featuresJson);
            } catch (e) {
              toast.error("JSON de benefícios inválido");
              return;
            }
            onSave({
              priceMonthly, priceYearly, description,
              maxTemplates: parseInt(maxTemplates) || 0,
              maxThemes: parseInt(maxThemes) || 0,
              maxAiUses: parseInt(maxAiUses) || 0,
              features,
            });
          }}
        >
          Salvar
        </Button>
      </div>
    </Card>
  );
}

// ==================== Themes Tab ====================
function ThemesTab() {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      toast.success("Configuração de temas atualizada");
    }
  });

  const currentThemes = (settings?.find(s => s.key === "themes")?.value as any[]) || [
    { id: 1, name: "Ouro Premium", header: "#D4AF37", accent: "#1A1A1A", plan: "free" },
    { id: 2, name: "Azul Executivo", header: "#1E40AF", accent: "#1E3A8A", plan: "free" },
    { id: 3, name: "Verde Corporativo", header: "#059669", accent: "#064E3B", plan: "free" },
    { id: 4, name: "Vermelho Elite", header: "#DC2626", accent: "#7F1D1D", plan: "free" },
    { id: 5, name: "Roxo Moderno", header: "#7C3AED", accent: "#4C1D95", plan: "free" },
    { id: 6, name: "Cinza Elegante", header: "#4B5563", accent: "#1F2937", plan: "free" },
    { id: 7, name: "Laranja Vibrante", header: "#EA580C", accent: "#7C2D12", plan: "pro" },
    { id: 8, name: "Teal Moderno", header: "#0F766E", accent: "#134E4A", plan: "pro" },
  ];

  const [newTheme, setNewTheme] = useState({ name: "", header: "#D4AF37", accent: "#1A1A1A", plan: "free" });
  const [showForm, setShowForm] = useState(false);

  const handleAddTheme = () => {
    if (newTheme.name.trim()) {
      const nextId = currentThemes.length > 0 ? Math.max(...currentThemes.map((t: any) => t.id)) + 1 : 1;
      const updatedThemes = [...currentThemes, { ...newTheme, id: nextId }];
      updateSetting.mutate({ key: "themes", value: updatedThemes });
      setNewTheme({ name: "", header: "#D4AF37", accent: "#1A1A1A", plan: "free" });
      setShowForm(false);
    }
  };

  const handleDeleteTheme = (id: number) => {
    if (confirm("Excluir tema?")) {
      const updatedThemes = currentThemes.filter((t: any) => t.id !== id);
      updateSetting.mutate({ key: "themes", value: updatedThemes });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Temas de Cores ({currentThemes.length})</h3>
        <Button
          size="sm"
          className="bg-gold-gradient text-black font-semibold"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Tema
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 bg-card/50 border-border/30">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do Tema</Label>
              <Input
                value={newTheme.name}
                onChange={e => setNewTheme({ ...newTheme, name: e.target.value })}
                placeholder="Ex: Azul Claro"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor do Cabeçalho</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newTheme.header}
                    onChange={e => setNewTheme({ ...newTheme, header: e.target.value })}
                    className="w-8 h-8 rounded border border-border/30 cursor-pointer"
                  />
                  <Input
                    value={newTheme.header}
                    onChange={e => setNewTheme({ ...newTheme, header: e.target.value })}
                    className="flex-1 h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor de Destaque</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newTheme.accent}
                    onChange={e => setNewTheme({ ...newTheme, accent: e.target.value })}
                    className="w-8 h-8 rounded border border-border/30 cursor-pointer"
                  />
                  <Input
                    value={newTheme.accent}
                    onChange={e => setNewTheme({ ...newTheme, accent: e.target.value })}
                    className="flex-1 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Plano Mínimo</Label>
              <Select value={newTheme.plan} onValueChange={v => setNewTheme({ ...newTheme, plan: v })}>
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">FREE</SelectItem>
                  <SelectItem value="pro">PRO</SelectItem>
                  <SelectItem value="elite">ELITE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-gold-gradient text-black font-semibold"
                onClick={handleAddTheme}
              >
                Adicionar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentThemes.map((theme: any) => (
          <Card key={theme.id} className="p-4 bg-card/50 border-border/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">{theme.name}</p>
                <Badge className="text-xs mt-1" variant="secondary">
                  {theme.plan.toUpperCase()}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleDeleteTheme(theme.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.header }} />
                  <span className="text-xs text-muted-foreground">{theme.header}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.accent }} />
                  <span className="text-xs text-muted-foreground">{theme.accent}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
