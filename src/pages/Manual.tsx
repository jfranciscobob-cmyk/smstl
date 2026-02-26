import { Link } from "react-router-dom";
import { ArrowLeft, Printer, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="text-xl font-bold text-primary border-b-2 border-primary/20 pb-2 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{n}</span>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 my-3 text-sm text-foreground">
      💡 <strong>Dica:</strong> {children}
    </div>
  );
}

export default function Manual() {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden on print */}
      <header className="gradient-hero sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
              <h1 className="text-lg font-bold text-primary-foreground">Manual do Sistema</h1>
            </div>
          </div>
          <Button onClick={handlePrint} variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0 print:max-w-none">
        {/* Cover */}
        <div className="text-center mb-12 pb-8 border-b-2 border-border print:mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Manual de Alimentação do Sistema</h1>
          <p className="text-lg text-muted-foreground">Secretaria Municipal de Saúde — Três Lagoas</p>
          <p className="text-sm text-muted-foreground mt-2">Guia para Diretores e Coordenadores</p>
        </div>

        {/* ── DIRETORES ── */}
        <div className="mb-12">
          <div className="rounded-xl bg-primary/10 px-5 py-3 mb-6 print:bg-transparent print:border print:border-primary/30">
            <h2 className="text-2xl font-extrabold text-primary">📁 Parte 1 — Manual do Diretor</h2>
          </div>

          <Section title="1. Acesso ao Sistema">
            <Step n={1} text="Acesse o endereço do sistema pelo navegador e faça login com e-mail e senha." />
            <Step n={2} text="Após o login, você será direcionado ao Painel Executivo (Dashboard)." />
            <Step n={3} text="O Dashboard mostra indicadores em tempo real: total de servidores, presentes, afastados, férias e cobertura." />
          </Section>

          <Section title="2. Navegação Principal">
            <p className="text-sm text-muted-foreground mb-3">O menu superior contém os seguintes botões:</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground ml-2">
              <li><strong>Monitor</strong> — Visualização detalhada dos servidores por diretoria/unidade</li>
              <li><strong>Estrutura</strong> — Organograma com diretorias, agrupamentos, unidades e coordenações</li>
              <li><strong>Transferências</strong> — Solicitações de transferência entre diretorias</li>
              <li><strong>Novo Servidor</strong> — Cadastro manual de servidor</li>
              <li><strong>Usuários</strong> — Gerenciamento de usuários do sistema (apenas admin)</li>
            </ul>
          </Section>

          <Section title="3. Monitor de Unidade — Visão Geral">
            <Step n={1} text='Na tela principal, clique em "Monitor" ou em qualquer indicador numérico para acessar o Monitor de Unidade.' />
            <Step n={2} text="Use os filtros superiores para selecionar Diretoria e/ou Unidade específica." />
            <Step n={3} text='Use os filtros rápidos: "Presentes", "Férias", "Afastados", "Concursados", "Contratados", "Duplo Vínculo".' />
            <Tip>Você pode combinar filtro de diretoria com filtro de status para uma análise mais precisa.</Tip>
          </Section>

          <Section title="4. Registro de Atestados">
            <Step n={1} text='No Monitor, clique no botão "📋 Registrar Atestado".' />
            <Step n={2} text="Pesquise e selecione o servidor pelo nome." />
            <Step n={3} text="Preencha o tipo (médico, odontológico, etc.), data de início, data de fim e número de dias." />
            <Step n={4} text="Opcionalmente, adicione uma observação e clique em Salvar." />
            <Tip>O sistema exibe automaticamente atestados ativos e os que vencem em até 7 dias no painel de alertas.</Tip>
          </Section>

          <Section title="5. Registro de Faltas Abonadas">
            <Step n={1} text='No Monitor, clique em "📝 Falta Abonada".' />
            <Step n={2} text="Selecione o servidor e informe a data da falta." />
            <Step n={3} text="O sistema verifica automaticamente o limite de 5 faltas abonadas por ano de admissão." />
            <Step n={4} text="Se o limite foi atingido, o sistema bloqueará o registro e exibirá uma mensagem." />
            <Tip>O ano é calculado com base na data de admissão do servidor, não no ano civil.</Tip>
          </Section>

          <Section title="6. Registro de Afastamentos">
            <Step n={1} text='No Monitor, clique em "🚫 Registrar Afastamento".' />
            <Step n={2} text="Selecione o servidor, o motivo do afastamento (ex: Licença Maternidade, Cessão, etc.)." />
            <Step n={3} text="Informe a data de início e, se souber, a data prevista de fim." />
            <Step n={4} text='Ao salvar, o sistema automaticamente altera o status do servidor para "Afastado".' />
            <Step n={5} text='Para encerrar um afastamento, clique em "Finalizar" no card de afastamentos ativos. O servidor volta ao status "Presente".' />
          </Section>

          <Section title="7. Gerenciamento de Escalas">
            <Step n={1} text='No Monitor, clique em "⏰ Editar Escalas" para abrir o editor em lote.' />
            <Step n={2} text="Para cada servidor, informe Entrada 1, Saída 1 (turno da manhã) e Entrada 2, Saída 2 (turno da tarde)." />
            <Step n={3} text="Informe o total de horas semanais." />
            <Step n={4} text='Clique em "Salvar Escalas" para gravar todas as alterações de uma vez.' />
            <Tip>Para escalas semanais detalhadas (dia a dia), clique no ícone de calendário ao lado do servidor.</Tip>
          </Section>

          <Section title="8. Gerenciamento de Férias">
            <Step n={1} text='No Monitor, clique em "🏖️ Editar Férias" para abrir o editor em lote.' />
            <Step n={2} text="Para cada servidor, informe: status gerencial, Período 1 (início/fim), Período 2 (início/fim), total de dias e dias vencidos." />
            <Step n={3} text='Clique em "Salvar Férias" para gravar.' />
            <Tip>O dashboard principal exibirá automaticamente alertas de férias próximas (30 dias).</Tip>
          </Section>

          <Section title="9. Alocação de Servidores em Unidades">
            <Step n={1} text='No Monitor, selecione uma diretoria e clique em "📍 Alocar em Unidades".' />
            <Step n={2} text="Pesquise e selecione os servidores que deseja alocar." />
            <Step n={3} text="Escolha a unidade de destino no dropdown." />
            <Step n={4} text='Clique em "Alocar Selecionados" para confirmar.' />
          </Section>

          <Section title="10. Transferência de Servidores entre Diretorias">
            <Step n={1} text="No Monitor, ao visualizar os servidores da sua diretoria, clique no ícone ⇄ (setas) ao lado do servidor." />
            <Step n={2} text="No modal de transferência, selecione a diretoria de destino." />
            <Step n={3} text="Adicione uma justificativa/observação." />
            <Step n={4} text='Clique em "Solicitar Transferência".' />
            <Step n={5} text="A transferência ficará com status PENDENTE até que um administrador ou o diretor da diretoria de destino aprove." />
            <Tip>Você pode acompanhar todas as transferências pelo botão "Transferências" no menu superior. Um badge vermelho indica solicitações pendentes.</Tip>
          </Section>

          <Section title="11. Aprovação/Rejeição de Transferências">
            <Step n={1} text='Clique no botão "Transferências" no menu superior (exibe badge com o número de pendências).' />
            <Step n={2} text="Na aba 'Pendentes', visualize as solicitações endereçadas à sua diretoria." />
            <Step n={3} text="Clique em ✅ para aprovar ou ❌ para rejeitar." />
            <Step n={4} text="Ao aprovar, o servidor será automaticamente movido para a sua diretoria e desvinculado da unidade/coordenação anterior." />
          </Section>

          <Section title="12. Edição Individual de Servidor">
            <Step n={1} text="No Dashboard, clique no nome de qualquer servidor para abrir o modal de edição." />
            <Step n={2} text="Edite os campos desejados: cargo, vínculo, escala, observações, etc." />
            <Step n={3} text='Clique em "Salvar" para confirmar as alterações.' />
          </Section>
        </div>

        {/* ── COORDENADORES ── */}
        <div className="mb-12">
          <div className="rounded-xl bg-accent/50 px-5 py-3 mb-6 print:bg-transparent print:border print:border-accent/30">
            <h2 className="text-2xl font-extrabold text-accent-foreground">📋 Parte 2 — Manual do Coordenador</h2>
          </div>

          <Section title="1. Acesso e Visão do Coordenador">
            <Step n={1} text="Faça login com suas credenciais. Você será direcionado ao Painel." />
            <Step n={2} text="Como coordenador, seu acesso é focado no Monitor de Unidade e na consulta de dados." />
            <Tip>Coordenadores podem visualizar dados, registrar atestados, faltas e afastamentos dos servidores da sua unidade.</Tip>
          </Section>

          <Section title="2. Monitoramento da Unidade">
            <Step n={1} text='Acesse o "Monitor" pelo menu ou pelos indicadores do Dashboard.' />
            <Step n={2} text="Selecione sua diretoria e depois sua unidade para filtrar apenas seus servidores." />
            <Step n={3} text="Visualize os indicadores: presentes agora (no turno), fora do turno, em férias, afastados." />
          </Section>

          <Section title="3. Registrar Atestados (Coordenador)">
            <Step n={1} text='No Monitor, com sua unidade selecionada, clique em "📋 Registrar Atestado".' />
            <Step n={2} text="Busque o servidor, preencha tipo, datas e dias." />
            <Step n={3} text="Salve. O atestado ficará visível no painel de alertas." />
          </Section>

          <Section title="4. Registrar Faltas Abonadas (Coordenador)">
            <Step n={1} text='Clique em "📝 Falta Abonada" no Monitor.' />
            <Step n={2} text="Selecione o servidor e a data. O limite de 5 por período é verificado automaticamente." />
          </Section>

          <Section title="5. Registrar Afastamentos (Coordenador)">
            <Step n={1} text='Clique em "🚫 Registrar Afastamento" no Monitor.' />
            <Step n={2} text="Selecione o servidor, motivo e datas." />
            <Step n={3} text='O status do servidor será atualizado automaticamente para "Afastado".' />
          </Section>

          <Section title="6. Consultar Escalas e Férias">
            <Step n={1} text="No Monitor, visualize as escalas e férias na listagem de servidores." />
            <Step n={2} text="Clique no ícone de calendário para ver a escala semanal detalhada de cada servidor." />
            <Tip>Coordenadores podem visualizar as informações, mas a edição em lote de escalas e férias é restrita a diretores e administradores.</Tip>
          </Section>

          <Section title="7. Acesso Rápido">
            <Step n={1} text='Use a rota "/acesso" para uma visão simplificada das informações do seu perfil e da sua unidade.' />
          </Section>
        </div>

        {/* ── GLOSSÁRIO ── */}
        <div className="mb-12">
          <div className="rounded-xl bg-muted px-5 py-3 mb-6">
            <h2 className="text-2xl font-extrabold text-foreground">📖 Glossário</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Status Presente", "Servidor em atividade normal."],
              ["Status Férias", "Servidor em gozo de férias."],
              ["Status Afastado", "Servidor afastado por licença, cessão ou outro motivo."],
              ["Status Ausente", "Servidor marcado como ausente pelo sistema ou pela importação de CSV."],
              ["Função Crítica", "Função essencial que não pode ficar descoberta."],
              ["Duplo Vínculo", "Servidor com dois vínculos empregatícios."],
              ["Escala Fixa", "Horário fixo de trabalho semanal."],
              ["Cobertura", "Percentual de servidores presentes em relação ao total."],
              ["Falta Abonada", "Falta justificada, limitada a 5 por ano de admissão."],
              ["Transferência", "Movimentação de servidor de uma diretoria para outra, sujeita a aprovação."],
            ].map(([term, def]) => (
              <div key={term} className="rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground">{term}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{def}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-6 print:mt-8">
          <p>Sistema de Gestão de Servidores — Secretaria Municipal de Saúde de Três Lagoas</p>
          <p className="mt-1">Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:border { border: 1px solid !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:mt-8 { margin-top: 2rem !important; }
          .print\\:mb-8 { margin-bottom: 2rem !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
