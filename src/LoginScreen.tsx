import { useState } from "react";
interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const message = await onLogin(username.trim(), password);
    setLoading(false);
    if (message) setError(message);
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-slide-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
            <span className="text-white font-bold font-mono">T</span>
          </div>
          <div>
            <p className="text-base font-semibold tracking-wide">TaskFlow</p>
            <p className="text-xs text-muted-foreground font-mono">sistema de gestão de tarefas</p>
          </div>
        </div>

        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
          Entrar no sistema
        </p>

        <form onSubmit={handleSubmit} className="border border-border bg-card rounded-sm p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Usuário</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Digite seu usuário"
              className="mt-1 w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="mt-1 w-full bg-secondary border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-sm text-sm font-medium"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 border border-border bg-card rounded-sm p-4">
          <p className="text-xs font-semibold">Informações de acesso</p>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Cada funcionário deve usar o usuário e a senha fornecidos pelo administrador.
            Por segurança, os usuários cadastrados não são exibidos nesta tela.
          </p>
          <div className="mt-3 text-[11px] font-mono text-muted-foreground space-y-1">
            <p>• Usuário: fornecido pelo administrador</p>
            <p>• Senha: fornecida pelo administrador</p>
            <p>• Administrador: também acessa por usuário e senha</p>
          </div>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          O administrador também entra por usuário e senha. A criação de novas contas fica disponível no painel administrativo.
        </p>
      </div>
    </div>
  );
}
