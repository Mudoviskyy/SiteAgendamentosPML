# PML - Sistema de Agendamentos e Gestão de Visitas

![Sistema PML](public/assets/mockup.png)

## 🏛️ Sobre o Projeto

O **Sistema de Agendamentos PML** foi desenvolvido para modernizar e otimizar os processos do setor social do **Presídio Masculino de Lages (PML)**. 

Idealizado e desenvolvido por **Eberson Carneiro** (Policial Penal e estudante de Ciência da Computação na Unifacvest), o projeto nasceu da necessidade de substituir um fluxo de trabalho manual e ineficiente que utilizava ferramentas limitadas (Wix e formulários genéricos) por uma plataforma robusta, segura e automatizada.

### 🚀 O Impacto em Números
*   **Agendamentos Mensais**: ~1.500 agendamentos realizados de forma 100% automatizada.
*   **Redução de Tempo (Carteirinhas)**: O processo de solicitação/renovação, que levava de **15 a 20 dias** via e-mail, agora é concluído em cerca de **10 minutos** dentro do sistema.
*   **Eficiência Administrativa**: Eliminação total do retrabalho de transcrição manual de dados para planilhas Excel, através de um sistema de gestão de vagas totalmente programável.

---

## 🛠️ Tecnologias Utilizadas

Este projeto utiliza uma stack moderna para garantir performance, escalabilidade e segurança:

*   **Frontend**: [React.js](https://reactjs.org/) com [Vite](https://vitejs.dev/)
*   **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
*   **Componentes UI**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
*   **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL + RLS Security)
*   **Autenticação**: Supabase Auth (JWT)
*   **Animações**: [Framer Motion](https://www.framer.com/motion/)
*   **Geração de Relatórios**: ExcelJS e bibliotecas para XLSX/CSV.

---

## ✨ Principais Funcionalidades

### 👥 Módulo do Visitante
- **Agendamento Inteligente**: Sistema de reserva de vagas robusto que impede sobreposição de horários e respeita os limites configurados pela administração.
- **Gestão de Carteirinha**: Upload de documentos e acompanhamento de status de aprovação (Nova e Renovação).
- **Portal de Informações**: Canal de autoatendimento onde o visitante obtém informações cruciais sem necessidade de login.
- **Dashboard Pessoal**: Histórico de agendamentos e status de solicitações em tempo real.

### 🔐 Módulo Administrativo (Setor Social)
- **Gestão de Vagas Programável**: Controle total sobre a disponibilidade de vagas, permitindo edições e programações dinâmicas conforme a necessidade da unidade.
- **Aprovação de Agendamentos**: Fluxo de trabalho otimizado para gerenciar e validar as solicitações de visita.
- **Controle de Usuários**: Gestão detalhada de perfis e permissões de acesso ao sistema.
- **Relatórios One-Click**: Geração instantânea de arquivos XLSX com métricas e dados filtrados por período.
- **Complementação ao i-Pen**: O sistema atua de forma complementar e independente ao sistema estadual i-Pen, suprindo a demanda de gestão de agendamentos e métricas de visitação.

---

## ⚖️ Propriedade Intelectual e Direitos Autorais

**Todos os direitos reservados.**

Este software foi desenvolvido como uma solução proprietária e independente. É estritamente proibida a reprodução, replicação ou distribuição do código-fonte sem autorização expressa do autor. 

*O registro de propriedade intelectual junto ao **INPI** está em fase de tramitação.*

---

## ⚙️ Como Rodar o Projeto

1.  **Clonar o repositório**:
    ```bash
    git clone https://github.com/Mudoviskyy/SiteAgendamentosPML.git
    ```

2.  **Instalar dependências**:
    ```bash
    npm install
    ```

3.  **Configurar variáveis de ambiente**:
    - Renomeie o arquivo `.env.example` para `.env.local`.
    - Adicione suas credenciais do Supabase.

4.  **Iniciar o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```

---

## 👨‍💻 Autor

**Eberson Carneiro**
- Policial Penal - SC
- Acadêmico de Ciência da Computação - Unifacvest

---
*Este projeto é uma iniciativa independente para a melhoria do serviço público e gestão prisional.*
