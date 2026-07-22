import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navLinks = [
    { label: "Início", href: "/" },
    { label: "Recursos", href: "/#recursos" },
    { label: "Planos", href: "/#planos" },
  ];

  const handleLogin = async () => {
    try {
      await login("/loading");
    } catch (err) {
      console.error("Erro no login:", err);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-lg border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center transition-transform group-hover:scale-105">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              ELITES<span className="text-gold-gradient">_FIGHT</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground"
                >
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin}>
                  Entrar
                </Button>
                <Button
                  size="sm"
                  onClick={handleLogin}
                  className="bg-gold-gradient text-black font-semibold hover:opacity-90"
                >
                  Criar gratuitamente
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                {user ? (
                  <>
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => { logout(); setMobileOpen(false); }}
                    >
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { handleLogin(); setMobileOpen(false); }}>
                      Entrar
                    </Button>
                    <Button
                      className="bg-gold-gradient text-black font-semibold"
                      onClick={() => { handleLogin(); setMobileOpen(false); }}
                    >
                      Criar gratuitamente
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
