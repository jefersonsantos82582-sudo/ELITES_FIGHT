import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileSpreadsheet, Tag, Crown, Settings,
  TrendingUp, FileDown, UserCog, Trash2, Plus, Edit, Ban, CheckCircle,
  DollarSign, BarChart3, AlertCircle,
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
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Verificar se já tem o cookie da chave admin ou e-mail autorizado
  useEffect(() => {
    console.log("[Admin] Verificando autorização. User:", user?.email, "Role:", user?.role);
    
    const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];
    const isEmailAuthorized = user && AUTHORIZED_ADMINS.includes(user.email || "");
    
    // Verificar cookie
    const cookies = document.cookie.split('; ');
    const adminCookie = cookies.find(row => row.startsWith('admin_key='));
    const hasKey = !!adminCookie;
    
    console.log("[Admin] Email autorizado:", isEmailAuthorized, "Cookie admin:", hasKey, "Role admin:", user?.role === "admin");
    
    if (hasKey || isEmailAuthorized || user?.role === "admin") {
      console.log("[Admin] Acesso concedido!");
      setIsAuthorized(true);
      setAuthError(null);
      setDebugInfo("Autorizado ✓");
    } else {
      console.log("[Admin] Acesso negado - requer chave ou email autorizado");
      setDebugInfo("Requer autenticação");
    }
  }, [user]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setDebugInfo("Validando chave...");
    
    if (!adminPass) {
      setAuthError("Digite a chave de acesso");
      setDebugInfo("Campo vazio");
      return;
    }
    
    if (adminPass.length < 8) {
      setAuthError("Chave de acesso deve ter no mínimo 8 caracteres");
      setDebugInfo("Chave muito curta");
      return;
    }
    
    console.log("[Admin] Tentando login com chave de tamanho:", adminPass.length);
    
    // Usar cookie com flags de segurança
    document.cookie = `admin_key=${adminPass}; path=/; max-age=86400; SameSite=Strict`;
    
    console.log("[Admin] Cookie definido, recarregando autorização...");
    setIsAuthorized(true);
    setDebugInfo("Chave aceita ✓");
    toast.success("Acesso administrativo liberado!");
  };

  if (!isAuthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-sm border-primary/20 bg-card/60">
            <Settings className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="font-bold text-xl mb-2">Acesso Restrito</h2>
            <p className="text-sm text-muted-foreground mb-6">Painel Administrativo</p>
            
            {/* Debug Info - Apenas em desenvolvimento */}
            {import.meta.env.DEV && debugInfo && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/30 mb-4">
                Debug: {debugInfo}
              </div>
            )}
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {authError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="admin-key">Chave de Acesso</Label>
                <Input 
                  id="admin-key"
                  type="password" 
                  placeholder="Digite a chave..." 
                  value={adminPass}
                  onChange={(e) => { 
                    setAdminPass(e.target.value); 
                    setAuthError(null);
                    setDebugInfo(`Digitando... (${e.target.value.length} chars)`);
                  }}
                  className="text-center"
                  autoFocus
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
              </div>
              <Button type="submit" className="w-full bg-gold-gradient text-black font-bold">
                Entrar no Painel
              </Button>
            </form>
            
            {user?.email && (
              <p className="text-xs text-muted-foreground mt-4">
                Logado como: {user.email}
              </p>
            )}
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
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cor do Cabeçalho</Label>
              <div className="flex gap-2 mt-1.5">
                <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="w-10 h-10 rounded" />
                <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2 mt-1.5">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} />
              </div>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full bg-gold-gradient text-black font-bold">
            {isEdit ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Categories Tab ====================
function CategoriesTab() {
  const { data: categories } = trpc.categories.list.useQuery();
  return (
    <div className="text-muted-foreground text-center py-8">
      Categorias ({categories?.length || 0}) - Em desenvolvimento
    </div>
  );
}

// ==================== Themes Tab ====================
function ThemesTab() {
  return (
    <div className="text-muted-foreground text-center py-8">
      Temas - Em desenvolvimento
    </div>
  );
}

// ==================== Users Tab ====================
function UsersTab() {
  const { data: users } = trpc.admin.listAllUsers.useQuery();
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Usuários ({users?.length || 0})</h3>
      <div className="space-y-2">
        {users?.map(u => (
          <Card key={u.id} className="p-4 bg-card/50 border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{u.name || u.email || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge>{u.plan}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Plans Tab ====================
function PlansTab() {
  const { data: plans } = trpc.payment.listPlans.useQuery();
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Planos ({plans?.length || 0})</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.map(p => (
          <Card key={p.code} className="p-6 bg-card/50 border-border/30">
            <h4 className="font-semibold mb-2">{p.name}</h4>
            <p className="text-2xl font-bold mb-4">R$ {p.price}/mês</p>
            <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
            <ul className="space-y-1 text-xs">
              {Array.isArray(p.features) && p.features.map((f: any, i: number) => (
                <li key={i} className="text-muted-foreground">• {f}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
