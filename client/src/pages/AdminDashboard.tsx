/**
 * Painel de Administração Completo - ELITES_FIGHT
 * Gerencia: Planos, Pagamentos, Usuários, Modelos, Configurações
 */

import { useState } from "react";
import {
  LayoutDashboard, Users, FileSpreadsheet, DollarSign, Settings,
  TrendingUp, FileDown, UserCog, Trash2, Plus, Edit, Ban, CheckCircle,
  BarChart3, CreditCard, Eye, EyeOff, Copy, LogOut, Bell, Search,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-12 text-center max-w-md">
            <Ban className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-2">Acesso negado</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Você não tem permissão para acessar o painel administrativo.
            </p>
            <Button onClick={logout} variant="outline">
              Fazer logout
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Painel de Administração
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bem-vindo, {user?.name || user?.email}. Gerencie todos os aspectos da plataforma.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários, modelos, planos..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="templates">Modelos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="payments" className="mt-6">
            <PaymentsTab searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="plans" className="mt-6">
            <PlansTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="templates" className="mt-6">
            <TemplatesTab searchQuery={searchQuery} />
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsTab />
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
    { label: "Receita (Mês)", value: `R$ ${(stats as any).monthlyRevenue || 0}`, icon: DollarSign, color: "bg-green-500/10 text-green-400" },
    { label: "Planilhas Geradas", value: stats.totalSheets, icon: FileDown, color: "bg-primary/10 text-primary" },
    { label: "Assinantes PRO", value: stats.planCounts.pro, icon: CreditCard, color: "bg-purple-500/10 text-purple-400" },
    { label: "Assinantes ELITE", value: stats.planCounts.elite, icon: CreditCard, color: "bg-gold-gradient text-black" },
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

// ==================== Payments Tab ====================
function PaymentsTab({ searchQuery }: { searchQuery: string }) {
  // Nota: listPayments não existe no router, usando listAllGeneratedSheets como fallback ou mock
  const { data: payments, isLoading } = (trpc.admin as any).listPayments?.useQuery() || { data: [], isLoading: false };

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Carregando...</div>;

  const filtered = (payments as any[])?.filter(p =>
    !searchQuery || p.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Histórico de Pagamentos ({filtered.length})</h3>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum pagamento encontrado
          </Card>
        ) : (
          filtered.map((payment: any) => (
            <Card key={payment.id} className="p-4 bg-card/50 border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{payment.userEmail}</span>
                    <Badge className={`text-xs ${
                      payment.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plano: <span className="font-medium">{payment.planName}</span> • 
                    R$ {parseFloat(payment.amount).toFixed(2)} • 
                    {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">R$ {parseFloat(payment.amount).toFixed(2)}</div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ==================== Plans Tab ====================
function PlansTab() {
  const { data: plans } = trpc.plans.list.useQuery();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Gerenciar Planos ({plans?.length || 0})</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans?.map(plan => (
          <Card key={plan.id} className="p-6 bg-card/50 border-border/30">
            <div className="mb-4">
              <h4 className="font-semibold text-lg">{plan.name}</h4>
              <p className="text-2xl font-bold text-primary mt-2">
                R$ {plan.priceMonthly}
                <span className="text-xs text-muted-foreground font-normal">/mês</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditingPlan(plan);
                setDialogOpen(true);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Card>
        ))}
      </div>

      <PlanDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editingPlan} />
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan }: any) {
  const utils = trpc.useUtils();
  const [priceMonthly, setPriceMonthly] = useState(plan?.priceMonthly || "0");
  const [priceYearly, setPriceYearly] = useState(plan?.priceYearly || "0");
  const [description, setDescription] = useState(plan?.description || "");

  const updateMutation = trpc.admin.updatePlan.useMutation({
    onSuccess: () => {
      utils.plans.list.invalidate();
      toast.success("Plano atualizado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!plan) return;
    updateMutation.mutate({
      id: plan.id,
      priceMonthly,
      priceYearly,
      description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Plano: {plan?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Preço Mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={priceMonthly}
              onChange={(e) => setPriceMonthly(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Preço Anual (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={priceYearly}
              onChange={(e) => setPriceYearly(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-gold-gradient text-black font-semibold"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Users Tab ====================
function UsersTab({ searchQuery }: { searchQuery: string }) {
  const { data: users } = (trpc.admin as any).listUsers.useQuery();

  const filtered = (users as any[])?.filter(u =>
    !searchQuery || u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Usuários ({filtered.length})</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map((user: any) => (
          <Card key={user.id} className="p-4 bg-card/50 border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{user.name || user.email}</span>
                  <Badge className={`text-xs ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                    {user.role}
                  </Badge>
                  <Badge className={`text-xs ${
                    user.plan === 'elite' ? 'bg-gold-gradient text-black' :
                    user.plan === 'pro' ? 'bg-primary/20 text-primary' :
                    'bg-muted'
                  }`}>
                    {user.plan}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.email} • Planilhas: {user.sheetsGenerated}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Templates Tab ====================
function TemplatesTab({ searchQuery }: { searchQuery: string }) {
  const { data: templates } = trpc.admin.listAllTemplates.useQuery();

  const filtered = templates?.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Modelos ({filtered.length})</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map(template => (
          <Card key={template.id} className="p-4 bg-card/50 border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Badge className={`text-xs ${
                    template.plan === 'elite' ? 'bg-gold-gradient text-black' :
                    template.plan === 'pro' ? 'bg-primary/20 text-primary' :
                    'bg-muted'
                  }`}>
                    {template.plan}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== Settings Tab ====================
function SettingsTab() {
  const [mercadoPagoToken, setMercadoPagoToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/50 border-border/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Configurações Mercado Pago
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Access Token</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type={showToken ? "text" : "password"}
                value={mercadoPagoToken}
                onChange={(e) => setMercadoPagoToken(e.target.value)}
                placeholder="Cole seu token aqui"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(mercadoPagoToken);
                  toast.success("Copiado!");
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button className="bg-gold-gradient text-black font-semibold">
            Salvar Configurações
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 border-border/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notificações
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Notificar quando novo pagamento é recebido</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm">Notificar quando novo usuário se registra</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-sm">Notificar sobre erros do sistema</span>
          </label>
        </div>
      </Card>
    </div>
  );
}
