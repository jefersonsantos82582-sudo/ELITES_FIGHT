import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, Users, FileSpreadsheet, Settings, 
  ShieldAlert, Loader2, AlertCircle, RefreshCw, Key
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [adminPass, setAdminPass] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Verificar autorização inicial
  useEffect(() => {
    const AUTHORIZED_ADMINS = ["jefersonsantos82582@gmail.com"];
    const isEmailAuthorized = user && AUTHORIZED_ADMINS.includes(user.email || "");
    
    // Verificar cookie
    const cookies = document.cookie.split('; ');
    const adminCookie = cookies.find(row => row.startsWith('admin_key='));
    const hasKey = !!adminCookie;
    
    if (hasKey || isEmailAuthorized || user?.role === "admin") {
      setIsAuthorized(true);
    }
  }, [user]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass) {
      setAuthError("Digite a chave de acesso");
      return;
    }
    
    // Usar cookie com SameSite=Lax para garantir envio em requisições cross-site se necessário
    document.cookie = `admin_key=${adminPass}; path=/; max-age=86400; SameSite=Lax`;
    
    // Forçar recarregamento da página para garantir que o tRPC pegue o novo cookie
    window.location.reload();
  };

  // Queries administrativas (só rodam se autorizado)
  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthorized,
    retry: false,
    onError: (err) => {
      if (err.message.includes("FORBIDDEN") || err.message.includes("UNAUTHORIZED")) {
        setIsAuthorized(false);
        setAuthError("Chave de acesso inválida ou expirada.");
      }
    }
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
                Acesso restrito. Insira sua chave de segurança.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-6">
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
                  />
                </div>
                {authError && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {authError}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full bg-gold-gradient text-black font-bold">
                Liberar Acesso
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
            <p className="text-muted-foreground">Gerencie usuários, modelos e pagamentos.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              document.cookie = "admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.reload();
            }}
          >
            Sair do Painel
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Modelos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {statsQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="h-32 animate-pulse bg-muted/20" />
                ))}
              </div>
            ) : statsQuery.data ? (
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
            ) : (
              <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p>Erro ao carregar estatísticas</p>
                <Button variant="link" onClick={() => statsQuery.refetch()}>Tentar novamente</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-8">Lista de usuários em desenvolvimento...</p>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="p-6">
              <p className="text-muted-foreground text-center py-8">Gerenciamento de modelos em desenvolvimento...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
