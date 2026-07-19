import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Library, FileSpreadsheet, Crown, Lock, Search, Filter,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Templates() {
  const { user } = useAuth();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const userPlan = user?.plan as "free" | "pro" | "elite" || "free";
  const planOrder = { free: 0, pro: 1, elite: 2 };

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || String(t.categoryId) === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, categoryFilter]);

  const categoryName = (id: number) => categories?.find(c => c.id === id)?.name || "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Library className="w-7 h-7 text-primary" />
            Biblioteca de Modelos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Explore todos os modelos disponíveis
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tpl => {
            const tplPlan = tpl.plan as "free" | "pro" | "elite";
            const hasAccess = planOrder[userPlan] >= planOrder[tplPlan];
            return (
              <Card
                key={tpl.id}
                className={`p-5 transition-all duration-300 ${
                  hasAccess
                    ? "bg-card/50 border-border/30 hover:border-primary/30 cursor-pointer"
                    : "bg-card/30 border-border/20 opacity-75"
                }`}
              >
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 mb-4 flex items-center justify-center">
                  <FileSpreadsheet className="w-10 h-10 text-primary/40" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">{categoryName(tpl.categoryId)}</Badge>
                  <Badge
                    className={`text-xs uppercase ${
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

                <h3 className="font-semibold text-sm mb-1 truncate">{tpl.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{tpl.description}</p>

                {hasAccess ? (
                  <Link href={`/dashboard/gerador?templateId=${tpl.id}`}>
                    <Button size="sm" className="w-full bg-gold-gradient text-black font-semibold hover:opacity-90">
                      Usar modelo
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/30 text-primary"
                    onClick={() => toast.info("Faça upgrade para acessar este modelo")}
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Plano {tpl.plan.toUpperCase()}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Library className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum modelo encontrado</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
