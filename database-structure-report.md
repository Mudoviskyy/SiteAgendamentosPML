
# Relatório de Estrutura do Banco de Dados Supabase (Presídio Masculino de Lages)

Este documento detalha a estrutura do banco de dados relacional (PostgreSQL) utilizado no sistema PML, identificando tabelas, colunas, relacionamentos (Foreign Keys), políticas de segurança (RLS), funções e gatilhos (Triggers).

---

## 1. Tabelas com Dados de Apenados / Presos
As tabelas a seguir armazenam direta ou indiretamente informações relacionadas aos internos do presídio (ex: `nome_preso`, `matricula_preso`, `nome_apenado`).

### `agendamentos`
Tabela principal que registra as visitas agendadas.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `id_visitante` (uuid) NOT NULL - Ref: `perfis(id)`
  - `nome_preso` (text) NOT NULL
  - `matricula_preso` (text) NOT NULL
  - `visitante1_nome` (text) NOT NULL
  - `visitante1_carteirinha` (text) NOT NULL
  - `visitante2_nome` (text)
  - `visitante2_carteirinha` (text)
  - `visitante3_nome` (text)
  - `visitante3_carteirinha` (text)
  - `whatsapp` (text) NOT NULL
  - `email` (text) NOT NULL
  - `status` (text) NOT NULL
  - `created_at` (timestamp without time zone)
  - `updated_at` (timestamp without time zone)
  - `vaga_configuracao_id` (uuid) NOT NULL - Ref: `vagas_configuracao(id)`
  - `motivo_recusa` (text)

### `fila_espera`
Registra visitantes aguardando liberação de vagas para um determinado agendamento.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `vaga_configuracao_id` (uuid) NOT NULL - Ref: `vagas_configuracao(id)`
  - `id_visitante` (uuid) NOT NULL - Ref: `perfis(id)`
  - `nome_preso` (text) NOT NULL
  - `matricula_preso` (text) NOT NULL
  - `created_at` (timestamp without time zone)
  - `status` (text)

### `solicitacoes_estudo`
Solicitações de inclusão de internos em programas educacionais.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `user_id` (uuid)
  - `nome_preso` (text) NOT NULL
  - `matricula_preso` (text) NOT NULL
  - `arquivo_url` (text)
  - `created_at` (timestamp with time zone)

### `solicitacoes_carteirinha`
Registro temporário ou legado para solicitação de carteirinhas.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `user_id` (uuid)
  - `nome_visitante` (text) NOT NULL
  - `cpf_visitante` (text) NOT NULL
  - `nome_preso` (text) NOT NULL
  - `matricula_preso` (text) NOT NULL
  - `email` (text) NOT NULL
  - `created_at` (timestamp with time zone)

---

## 2. Tabelas de Visitantes e Usuários
Armazenam informações sobre as pessoas que acessam o sistema e realizam os agendamentos.

### `perfis`
Extensão da tabela de usuários do Supabase Auth.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `nome` (text)
  - `nome_completo` (text)
  - `cpf` (text)
  - `aprovado` (boolean)
  - `role` (text)
  - `telefone` (text)
  - `data_nascimento` (date)
  - `email` (text)
  - `created_at` (timestamp without time zone)

### `carteirinhas`
Registro oficial de aprovação e emissão de carteirinhas de visitante.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `usuario_id` (uuid) NOT NULL - Ref: `perfis(id)`
  - `nome` (text) NOT NULL
  - `cpf` (text) NOT NULL
  - `parentesco` (text) NOT NULL
  - `nome_apenado` (text) NOT NULL
  - `telefone` (text) NOT NULL
  - `protocolo` (text) NOT NULL
  - `status` (text)
  - `observacao_admin` (text)
  - `validade` (timestamp with time zone)
  - `motivo_cancelamento` (text)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)

### `carteirinha_documentos`
Armazena referências para os documentos enviados anexos à solicitação da carteirinha.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `carteirinha_id` (uuid) NOT NULL - Ref: `carteirinhas(id)`
  - `nome_arquivo` (text)
  - `url` (text) NOT NULL
  - `created_at` (timestamp with time zone)

---

## 3. Tabelas de Agendamento, Vagas e Configuração

### `vagas_configuracao`
Base de vagas geradas por data, galeria e horário.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `data_visita` (date) NOT NULL
  - `galeria` (text) NOT NULL
  - `tipo_visita` (text) NOT NULL
  - `horario` (time without time zone) NOT NULL
  - `vagas_totais` (integer) NOT NULL
  - `created_at` (timestamp without time zone)

### `horarios`
Definição dos blocos de horários.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `galeria_id` (uuid) - Ref: `galerias(id)`
  - `dia_semana` (text) NOT NULL
  - `horario` (time without time zone) NOT NULL
  - `limite_vagas` (integer) NOT NULL

### `agenda_mensal`
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `data_visita` (date) NOT NULL
  - `galeria` (text) NOT NULL
  - `observacao` (text)
  - `ativa` (boolean)
  - `created_at` (timestamp without time zone)

### `galerias`
- **Colunas:** `id` (uuid) NOT NULL, `nome` (text) NOT NULL

### `tipos_visita`
- **Colunas:** `id` (uuid) NOT NULL, `codigo` (text) NOT NULL, `nome` (text) NOT NULL, `limite_mensal` (integer) NOT NULL, `conta_para_social` (boolean), `created_at` (timestamp without time zone)

### `bloqueios_agendamento`
Tabela que gerencia as restrições ou fechamentos de dias específicos para agendamentos. Impede que visitantes agendem visitas em datas marcadas como bloqueadas, independente da disponibilidade de vagas ou galerias.
- **Colunas:**
  - `id` (uuid) NOT NULL
  - `data_visita` (date) NOT NULL - A data específica que está sendo bloqueada.
  - `bloqueado` (boolean) - Status do bloqueio.
  - `bloqueado_por` (uuid) - ID do usuário admin que efetuou o bloqueio.
  - `bloqueado_em` (timestamp without time zone)
  - `motivo` (text) - Texto opcional descrevendo o motivo.
  - `status` (text) - Categoria/Tipo do bloqueio (ex: `fechado`, `manutencao`, `feriado`, `seguranca`).
- **Comportamento Adicional:** Operação de desbloqueio em massa remove todos os registros de bloqueio dentro de um intervalo de datas especificado, independente da categoria de bloqueio atual na data.
  *Exemplo SQL executado internamente pela aplicação via API:*
  `DELETE FROM bloqueios_agendamento WHERE data_visita BETWEEN '2025-03-01' AND '2025-03-31'`

### `auditoria_agendamentos`
Log de auditoria para rastrear alterações em agendamentos.
- **Colunas:** `id` (uuid) NOT NULL, `agendamento_id` (uuid), `acao` (text), `usuario_id` (uuid), `data_acao` (timestamp without time zone), `dados_anteriores` (jsonb), `dados_novos` (jsonb)

---

## 4. Views (Visualizações)
O banco de dados conta com diversas views utilizadas para exportação, painéis e contagem de vagas, abstraindo joins complexos:
1. `view_relatorio_mensal`
2. `view_vagas_disponiveis`
3. `view_exportacao_administrativa`
4. `view_posicao_fila`
5. `view_admin_vagas`
6. `view_dashboard_visitante`

Todas contêm dados sumarizados mesclando `agendamentos`, `vagas_configuracao` e ocasionalmente `perfis`.

---

## 5. Relações de Chave Estrangeira (Foreign Keys)
- `agendamentos.id_visitante` -> `perfis.id`
- `agendamentos.vaga_configuracao_id` -> `vagas_configuracao.id`
- `fila_espera.id_visitante` -> `perfis.id`
- `fila_espera.vaga_configuracao_id` -> `vagas_configuracao.id`
- `carteirinhas.usuario_id` -> `perfis.id`
- `carteirinha_documentos.carteirinha_id` -> `carteirinhas.id`
- `horarios.galeria_id` -> `galerias.id`

---

## 6. Políticas de Segurança em Nível de Linha (RLS - Row Level Security)
As políticas RLS protegem o banco garantindo que usuários regulares acessem apenas os próprios dados, e administradores tenham acesso amplo.

- **`perfis`:**
  - `SELECT`: "Usuários podem ver o próprio perfil" ou se role = 'admin'.
  - `UPDATE`: "usuario pode atualizar proprio perfil".
- **`carteirinhas`:**
  - `SELECT`: Admins veem todas; usuários veem `auth.uid() = usuario_id`.
  - `INSERT`: Visitantes inserem a própria carteirinha.
  - `UPDATE`: Admins podem atualizar status.
- **`carteirinha_documentos`:**
  - `SELECT`: Usuário logado pode ler se for dono da carteirinha; admins podem ler tudo.
  - `INSERT`: Visitantes podem inserir.
- **`agendamentos` & `fila_espera`:**
  - `SELECT`: Admins veem todos; visitante vê `auth.uid() = id_visitante`.
  - `INSERT`: Visitante insere os próprios.
  - `UPDATE`: Somente Admin pode atualizar o status do agendamento (via RLS).

---

## 7. Gatilhos (Triggers) e Funções
- **`handle_new_user()`**: Função ativada na criação de um usuário no auth do Supabase, espelhando os metadados (nome, CPF, etc.) para a tabela `perfis`.
- **`cancelar_agendamentos_futuros()`** (Trigger em `carteirinhas`): Quando uma carteirinha é cancelada ou recusada, cancela automaticamente os agendamentos pendentes do visitante.
- **Triggers de `agendamentos`:**
  - `set_agendamentos_updated_at`: Atualiza `updated_at`.
  - `trigger_auditoria_agendamento`: Salva logs em `auditoria_agendamentos`.
  - `trigger_impedir_alterar_vaga`: Impede mudança de vaga após criado.
  - `trigger_limite_mensal`: Impede agendamento (via `verificar_limite_mensal()`) se bater o teto (3 sociais ou 2 íntimas).
  - `trigger_promover_fila`: Se um agendamento for cancelado/revogado, tenta promover alguém de `fila_espera` para a vaga.
  - `trigger_validar_vaga_existente`: Trava INSERTS sem vaga configurada.
- **`criar_agendamento()`**: Função RPC de segurança definida para criar e lidar com a trava de concorrência (`FOR UPDATE`) nas vagas, jogando o visitante para a `fila_espera` se não houver mais vagas disponíveis.

---

## 8. Resumo e Padrões de Segurança
- **Segregação de Perfil:** Utiliza a tabela `perfis` estendendo os IDs do auth nativo (auth.users). O controle de acesso baseia-se na coluna `role` ('admin' ou 'visitante').
- **RLS Severo:** Leituras e gravações são estritamente delimitadas usando verificações do tipo `auth.uid() = id` ou via queries de existência validando o privilégio `admin`.
- **Prevenção de Overbooking:** Utiliza `SELECT ... FOR UPDATE` via RPC (`criar_agendamento()`) para garantir o controle seguro da concorrência no ato de ocupação da vaga.
- **Verificação Lógica Automatizada:** Funções de gatilho validam limites e aplicam políticas antes das operações (ex: contagem de limites de 3 e 2 para visitas mensais, conferência de carteirinha ativa, etc.).
- **Auditoria Transparente:** Trigger `trigger_auditoria_agendamento` assegura que um rastro completo (antes e depois do dado modificado) em `agendamentos` seja mantido para o compliance operacional da polícia penal.
