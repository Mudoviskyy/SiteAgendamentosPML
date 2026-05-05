
# Frontend Implementation Summary: Foreign Document & International Phone Support

## 1. New Utilities (`src/utils/identificacao.js`)
Centralized helpers and constants for managing document types and phone formats.
- **Constants:** `TIPOS_IDENTIFICACAO`, `TIPOS_TELEFONE`, `DDIS` (Array of 12 supported countries).
- **Formatters:** `getIdentificacaoLabel`, `getIdentificacaoPlaceholder`, `getTelefoneExibivel`, `normalizarDocumento`, `concatenarTelefoneInternacional`, `extrairDDIeNumero`.

## 2. Validators Updated (`src/utils/validators.js`)
- Added `validarDocumento(valor, tipo)`: Uses strict CPF verification if type is 'CPF', else checks for numeric presence.
- Added `validarTelefone(valor, tipo)`: Uses 11-digit Brazilian validation if 'BR', else numeric presence for international.
- Updated `validateAllFields` to dynamically accept document and phone types during final form submission checks.

## 3. Services Updated (`src/services/visitanteService.js`)
- `checkCPFExists`: Now filters by `tipo_identificacao` so an identical number can coexist if one is a CPF and the other a foreign document.
- `signUpVisitor`: Added `tipoIdentificacao`, `tipoTelefone`, and `ddi` parameters. It now normalizes foreign documents, concatenates international phones, and injects these new metadata fields into the Supabase auth payload and profile creation.

## 4. Auth Context Updated (`src/contexts/AuthContext.jsx`)
- Ensure backward compatibility: Old users without `tipo_identificacao` or `tipo_telefone` default automatically to `'CPF'` and `'BR'`.
- Pass these variables safely through profile updating operations.

## 5. User Interface Adaptations
- **`src/pages/CadastroVisitantePage.jsx`**:
  - Implemented dynamic toggle for "Brasileiro (CPF)" vs "Estrangeiro".
  - If "Estrangeiro", automatically shifts phone input to International mode.
  - Included a country code (DDI) dropdown list.
  - Labels and placeholders dynamically shift based on the selection.
- **`src/pages/VisitanteDashboard.jsx`** & **`src/components/visitante/CarteirinhaDisplay.jsx`**:
  - Profile headers and user card components dynamically format document labels (e.g., showing "Documento Estrangeiro" instead of "CPF") and properly format phone structures using the new helpers.

## 6. Backward Compatibility Confirmation
- No heuristics based on document size were used. The document type is strictly driven by the explicit user selection via UI toggle.
- All existing Brazilian visitor profiles remain fully functional. No breaking changes to `cpf` or `telefone` columns.
- The previous database migrations mapped all existing empty values to `'CPF'` and `'BR'`.
