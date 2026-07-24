import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  FileSpreadsheet, Crown, Download, Loader2, Check, Palette,
  Sparkles, FileText, AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Generator() {
  const { user, loading: authLoading } = useAuth();
  const { data: overview } = trpc.dashboard.overview.useQuery(undefined, {
    enabled: !authLoading && Boolean(user),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const presetTemplateId = params.get("templateId");

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(presetTemplateId || "");
  const [customName, setCustomName] = useState("");
  const [headerColor, setHeaderColor] = useState("#D4AF37");
  const [accentColor, setAccentColor] = useState("#1A1A1A");
  const [extraInfo, setExtraInfo] = useState("");
  const [generated, setGenerated] = useState<{ fileUrl: string; fileName: string } | null>(null);

  const userPlan = (user?.plan as "free" | "pro" | "elite") || "free";
  const planOrder = { free: 0, pro: 1, elite: 2 } as const;

  const generateMutation = trpc.generator.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(data);
      toast.success("Planilha gerada com sucesso!");
    },
    onError: (err) => {
      // Tratamento de erros de autenticação e sessão
      const msg = err.message || "";
      if (msg.includes("login") || msg.includes("10001") || msg.includes("auth") || msg.includes("session") || msg.includes("unauthorized") || msg.includes("token") || msg.includes("FORBIDDEN")) {
        toast.error("Sua sessão expirou. Por favor, faça login novamente.");
      } else {
        toast.error(msg || "Erro ao gerar planilha");
      }
    },
  });

  const categoryTemplates = useMemo(() => {
    if (!templates) return [];
    if (!selectedCategory) return templates;
    return templates.filter(t => String(t.categoryId) === selectedCategory);
  }, [templates, selectedCategory]);

  const selectedTemplate = useMemo(() => {
    if (!templates || !selectedTemplateId) return null;
    return templates.find(t => t.id === parseInt(selectedTemplateId));
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    if (selectedTemplate && !customName) {
      setCustomName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const allowedTemplateIds = useMemo(() => {
    const candidates = (templates || [])
      .filter((template) => planOrder[userPlan] >= planOrder[template.plan as "free" | "pro" | "elite"])
      .slice(0, overview?.templatesUnlocked ?? Number.MAX_SAFE_INTEGER);
    return new Set(candidates.map((template) => template.id));
  }, [overview?.templatesUnlocked, templates, userPlan]);

  const hasAccess = selectedTemplate
    ? planOrder[userPlan] >= planOrder[selectedTemplate.plan as "free" | "pro" | "elite"] && allowedTemplateIds.has(selectedTemplate.id)
    : true;

  const handleGenerate = () => {
    if (!selectedTemplateId || !customName) {
      toast.error("Selecione um modelo e dê um nome à sua planilha");
      return;
    }
    if (!hasAccess) {
      toast.error("Seu plano não permite acesso a este modelo");
      return;
    }
    setGenerated(null);
    generateMutation.mutate({
      templateId: parseInt(selectedTemplateId),
      customName,
      headerColor,
      accentColor,
      extraInfo: extraInfo || undefined,
    });
  };

  // Configurações de cores e temas (rota pública)
  const { data: settings } = trpc.settings.getAll.useQuery();
  const colorPresets = (settings?.find(s => s.key === "themes")?.value as any[]) || [
    { name: "Ouro Premium", header: "#D4AF37", accent: "#1A1A1A", plan: "free" },
    { name: "Azul Executivo", header: "#1E40AF", accent: "#1E3A8A", plan: "free" },
    { name: "Verde Corporativo", header: "#059669", accent: "#064E3B", plan: "free" },
    { name: "Vermelho Elite", header: "#DC2626", accent: "#7F1D1D", plan: "free" },
    { name: "Roxo Moderno", header: "#7C3AED", accent: "#4C1D95", plan: "free" },
    { name: "Cinza Elegante", header: "#4B5563", accent: "#1F2937", plan: "free" },
    { name: "Laranja Vibrante", header: "#EA580C", accent: "#7C2D12", plan: "pro" },
    { name: "Teal Moderno", header: "#0F766E", accent: "#134E4A", plan: "pro" },
  ];

  const themeLimit = userPlan === "elite" ? 999 : userPlan === "pro" ? 15 : 8;

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedTemplateId("");
    setGenerated(null);
  };

  // Mostrar mensagem se não estiver autenticado
  if (!authLoading && !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-sm border-primary/20 bg-card/60">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="font-bold text-xl mb-2">Autenticação Necessária</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Você precisa estar logado para gerar planilhas.
            </p>
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
            <FileSpreadsheet className="w-7 h-7 text-primary" />
            Gerador de Planilhas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie sua planilha profissional em segundos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Category */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <h3 className="font-semibold">Escolha a categoria</h3>
              </div>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Step 2: Template */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <h3 className="font-semibold">Escolha o modelo</h3>
              </div>
              {categoryTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {selectedCategory ? "Nenhum modelo nesta categoria" : "Selecione uma categoria primeiro"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categoryTemplates.map(tpl => {
                      const tplPlan = tpl.plan as "free" | "pro" | "elite";
                      const canAccess = planOrder[userPlan] >= planOrder[tplPlan] && allowedTemplateIds.has(tpl.id);
                    const isSelected = String(tpl.id) === selectedTemplateId;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => canAccess && setSelectedTemplateId(String(tpl.id))}
                        className={`text-left p-4 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : canAccess
                            ? "border-border/30 hover:border-primary/30"
                            : "border-border/20 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate">{tpl.name}</span>
                          <Badge
                            className={`text-xs ml-2 shrink-0 ${
                              tpl.plan === "elite"
                                ? "bg-gold-gradient text-black"
                                : tpl.plan === "pro"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tpl.plan === "elite" && <Crown className="w-3 h-3 mr-1" />}
                            {tpl.plan}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                        {!canAccess && (
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Requer plano {tpl.plan.toUpperCase()}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Step 3: Personalize */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</div>
                <h3 className="font-semibold">Personalize</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="customName">Nome da planilha</Label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Ex: Controle Financeiro Janeiro 2024"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Tema de cores</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1.5">
                    {colorPresets.map((preset) => {
                      const presetPlan = (preset.plan as "free" | "pro" | "elite") || "free";
                      const isLocked = planOrder[userPlan] < planOrder[presetPlan];
                      return (
                        <button
                          type="button"
                          key={preset.name}
                          disabled={isLocked}
                          title={isLocked ? `Requer plano ${presetPlan.toUpperCase()}` : preset.name}
                          onClick={() => { setHeaderColor(preset.header); setAccentColor(preset.accent); }}
                          className={`p-3 rounded-lg border transition-all text-left ${
                            headerColor === preset.header
                              ? "border-primary bg-primary/5"
                              : isLocked
                              ? "border-border/20 opacity-50 cursor-not-allowed"
                              : "border-border/30 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded" style={{ backgroundColor: preset.header }} />
                            <div className="w-5 h-5 rounded" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">{preset.name}</span>
                          {isLocked && <span className="block mt-1 text-[10px] text-primary font-medium">{presetPlan.toUpperCase()}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="headerColor">Cor do cabeçalho</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={headerColor}
                        onChange={e => setHeaderColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                      />
                      <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Cor de destaque</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                      />
                      <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="extraInfo">Informações extras (opcional)</Label>
                  <Textarea
                    id="extraInfo"
                    value={extraInfo}
                    onChange={e => setExtraInfo(e.target.value)}
                    placeholder="Adicione notas, descrições ou instruções..."
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Preview / Generate */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 border-border/30 sticky top-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Preview
              </h3>

              {selectedTemplate ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="font-medium text-right">{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span className="font-medium text-right">{selectedTemplate.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium text-right truncate ml-2">{customName || "—"}</span>
                    </div>
                  </div>

                  {/* Color preview */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Cores:</div>
                    <div className="flex gap-2">
                      <div
                        className="flex-1 h-8 rounded border border-border/30"
                        style={{ backgroundColor: headerColor }}
                        title="Cabeçalho"
                      />
                      <div
                        className="flex-1 h-8 rounded border border-border/30"
                        style={{ backgroundColor: accentColor }}
                        title="Destaque"
                      />
                    </div>
                  </div>

                  {/* Generate button */}
                  {generated ? (
                    <div className="space-y-3">
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                        <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-semibold text-primary">Planilha gerada!</p>
                      </div>
                      <Button
                        asChild
                        className="w-full bg-gold-gradient text-black font-semibold"
                      >
                        <a href={generated.fileUrl} download={generated.fileName}>
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setGenerated(null)}
                      >
                        Gerar outra
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerate}
                      disabled={!selectedTemplateId || !customName || generateMutation.isPending}
                      className="w-full bg-gold-gradient text-black font-semibold"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Planilha
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">Selecione um modelo para ver o preview</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
