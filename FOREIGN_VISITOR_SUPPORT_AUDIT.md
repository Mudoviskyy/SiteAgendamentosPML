
# Relatório de Auditoria e Implementação: Suporte a Visitantes Estrangeiros

## 1. Visão Geral
Este documento relata as modificações e a auditoria realizadas no sistema para garantir o suporte completo a visitantes estrangeiros, com documentos não padronizados (diferentes do CPF brasileiro) e números de telefones internacionais, de acordo com as regras de cadastro já existentes na base.

## 2. Auditoria do Suporte Existente
Foi realizada uma varredura nas implementações correntes da aplicação:

- **Utilitários Existentes (`src/utils/identificacao.js`)**: Já continha métodos de tratamento base, exportando os enums `TIPOS_IDENTIFICACAO` (`CPF` e `DOCUMENTO_ESTRANGEIRO`) e `TIPOS_TELEFONE` (`BR` e `INTERNACIONAL`), além de funções de formatação condicional como `normalizarDocumento` e `getTelefoneExibivel`.
- **Validação de Formulários (`src/utils/validators.js`)**: Já havia suporte para as validações condicionais: `validarDocumento(valor, tipo)` e `validarTelefone(valor, tipo)`.
- **Componentes que já lidam com estrangeiros**:
  - `src/pages/CadastroVisitantePage.jsx`: Permite perfeitamente a escolha do tipo de identificação e DDI.
  - `src/pages/VisitorCardPage.jsx`: Suporta estrangeiros para solicitação de carteirinhas.
- **Componentes que falhavam/hardcoded**:
  - `src/components/agendamentos/AgendamentoModal.jsx`: Impunha rigidamente a regra de `length !== 11` (assumindo CPF) para o campo de documento, e não oferecia feedback visual amigável para telefones internacionais, bloqueando visitantes internacionais de realizarem agendamentos.

## 3. Arquivos Modificados e Criados

### Novo Arquivo Criado: `src/utils/profileIdentity.js`
Criado para centralizar as diretrizes do perfil do usuário em contexto de agendamentos.
* **Exports:**
  - `isForeignProfile(profile)`: Retorna `true` se o `tipo_identificacao` for estrangeiro.
  - `getPrimaryDocumentLabel(profile)`: Define dinamicamente o texto das *Labels* (ex: "Seu Documento Estrangeiro").
  - `getPrimaryDocumentValue(profile)`: Extrai o valor correto do banco de dados (que legadamente armazena na coluna `cpf`).
  - `getPrimaryPhoneValue(profile)`: Extrai o telefone.
  - `shouldValidateAsCPF(profile)`: Retorna `true` apenas se for um cidadão brasileiro autenticado.
  - `isValidBrazilianCPF(value)`: Utilitário leve de contagem de 11 dígitos.

### Modificação: `src/components/agendamentos/AgendamentoModal.jsx`
* **Antes**:
  - `visitante1_carteirinha` recebia `profile?.cpf`.
  - A *Label* era travada em `"Seu CPF (Visitante Principal) *"`.
  - A validação de envio exigia rigidamente `cleanCpf1.length !== 11` retornando o Toast `"CPF Inválido"`.
* **Depois**:
  - Carregamento inicial via `getPrimaryDocumentValue(profile)` e `getPrimaryPhoneValue(profile)`.
  - A *Label* utiliza `getPrimaryDocumentLabel(profile)`.
  - Validação condicional inserida antes de disparar o agendamento:
    