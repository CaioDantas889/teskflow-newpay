import { useState } from "react";

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-full flex items-center justify-center bg-background p-6 overflow-hidden">
      {/* Brilhos de fundo */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[26rem] h-[26rem] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
      {/* Grade sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative w-full max-w-sm animate-slide-in">
        {/* Marca */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <span className="text-white font-bold text-lg font-mono">T</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">TaskFlow</h1>
          <p className="text-[11px] text-muted-foreground font-mono mt-1 uppercase tracking-[0.2em]">
            gestão de atividades
          </p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-2xl shadow-black/40 space-y-4"
        >
          <div>
            <label htmlFor="usuario" className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Usuário
            </label>
            <input
              id="usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="nome.sobrenome"
              className="w-full bg-secondary/70 border border-border rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-blue-500/60 focus:bg-secondary placeholder:text-muted-foreground/70"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-secondary/70 border border-border rounded-lg px-3 py-2.5 pr-16 text-sm transition-colors focus:outline-none focus:border-blue-500/60 focus:bg-secondary placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? "ocultar" : "ver"}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2">
              <span className="text-red-400 text-xs leading-none mt-0.5">!</span>
              <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 timer-running" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p className="mt-5 text-center text-[11px] text-muted-foreground leading-relaxed">
          Use o usuário e a senha fornecidos pelo administrador.
          <br />
          Por segurança, as contas cadastradas não são exibidas aqui.
        </p>
      </div>
    </div>
  );
}
