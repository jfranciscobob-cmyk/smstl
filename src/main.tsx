import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado");
}

const root = createRoot(rootElement);

const renderBootstrapError = (error: unknown) => {
  console.error("[BootstrapError]", error);
  const message = error instanceof Error ? error.message : "Erro desconhecido na inicialização";

  root.render(
    <StrictMode>
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
          <h1 className="text-lg font-bold text-foreground">Falha ao carregar a aplicação publicada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Houve um erro antes da renderização inicial. Tente atualizar a página novamente.
          </p>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{message}</div>
        </div>
      </div>
    </StrictMode>
  );
};

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>
    );
  })
  .catch(renderBootstrapError);

