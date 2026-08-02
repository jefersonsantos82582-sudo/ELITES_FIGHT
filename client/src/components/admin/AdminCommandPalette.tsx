import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_SECTIONS } from "./AdminNav";

export interface CommandUser {
  id: number;
  name: string | null;
  email: string | null;
  plan: string;
}

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: CommandUser[];
  onSelectSection: (value: string) => void;
  onSelectUser: (userId: number) => void;
}

/**
 * Busca rápida do painel (Ctrl/Cmd + K), estilo Vercel/Linear:
 * pula direto para qualquer seção ou abre os detalhes de um usuário pelo
 * nome/e-mail, sem precisar navegar até a aba e rolar a lista.
 */
export default function AdminCommandPalette({
  open,
  onOpenChange,
  users,
  onSelectSection,
  onSelectUser,
}: AdminCommandPaletteProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Busca rápida" description="Navegue pelo painel">
      <CommandInput placeholder="Buscar seção ou usuário (nome / e-mail)..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Seções">
          {ADMIN_SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.value}
                value={`${item.label} ${item.description}`}
                onSelect={() => {
                  onSelectSection(item.value);
                  onOpenChange(false);
                }}
              >
                <Icon className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{item.label}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{item.description}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Usuários">
              {users.slice(0, 60).map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.name ?? ""} ${u.email ?? ""} ${u.plan}`}
                  onSelect={() => {
                    onSelectUser(u.id);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-medium">{u.name || "Sem nome"}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{u.email || "-"}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">{u.plan}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
