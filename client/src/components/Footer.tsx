import { Crown } from "lucide-react";

export default function Footer() {
  const links = [
    { label: "Início", href: "/" },
    { label: "Recursos", href: "/#recursos" },
    { label: "Planos", href: "/#planos" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
                <Crown className="w-4 h-4 text-black" />
              </div>
              <span className="font-display font-bold text-lg">
                ELITES<span className="text-gold-gradient">_FIGHT</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Plataforma premium para geração de planilhas profissionais.
              Crie, personalize e baixe planilhas editáveis compatíveis com
              Excel e Google Planilhas em segundos.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Navegação</h4>
            <ul className="space-y-2">
              {links.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Planos */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Planos</h4>
            <ul className="space-y-2">
              <li><a href="/#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FREE</a></li>
              <li><a href="/#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">PRO</a></li>
              <li><a href="/#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">ELITE</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 ELITES_FIGHT. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
