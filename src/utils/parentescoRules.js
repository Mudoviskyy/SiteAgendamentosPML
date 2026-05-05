
export const PARENTESCO_RULES = {
  "Pai": {
    instructions: "Certidão de nascimento do detento (constando o nome do pai) e Documento oficial com CPF do pai (Frente e Verso).",
    docs: ["Certidão de Nascimento do Detento", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Mãe": {
    instructions: "Certidão de nascimento do detento (constando o nome da mãe) e Documento oficial com CPF da mãe (Frente e Verso).",
    docs: ["Certidão de Nascimento do Detento", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Filho(a)": {
    instructions: "Certidão de nascimento do visitante (constando o detento como pai/mãe) e Documento oficial com CPF (Frente e Verso) (apenas para maiores de idade).",
    docs: ["Certidão de Nascimento do Visitante", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Enteado(a)": {
    instructions: "Certidão de nascimento do enteado, Certidão de casamento ou declaração de união estável entre o genitor e o detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento do Enteado", "Certidão de Casamento/União Estável", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Irmão(ã)": {
    instructions: "Certidões de nascimento (do detento e do visitante) com pelo menos um genitor em comum, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento (Detento)", "Certidão de Nascimento (Visitante)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Avô / Avó": {
    instructions: "Certidão de nascimento do detento, Certidão de nascimento do pai/mãe do detento (ligando ao avô/avó), e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento (Detento)", "Certidão de Nascimento (Pai/Mãe do detento)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Neto(a)": {
    instructions: "Certidão de nascimento do visitante, Certidão de nascimento do pai/mãe do visitante (que seja filho do detento), e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento (Visitante)", "Certidão de Nascimento (Pai/Mãe do visitante)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Nora": {
    instructions: "Certidão de casamento ou união estável com o filho do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Casamento/União Estável", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Genro": {
    instructions: "Certidão de casamento ou união estável with a filha do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Casamento/União Estável", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Representante legal": {
    instructions: "Termo de curatela OU tutela judicial, Procuração pública (se for o caso), e Documento oficial com CPF (Frente e Verso).",
    docs: ["Termo de Curatela/Tutela", "Procuração Pública (se houver)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Esposo / Esposa": {
    instructions: "Certidão de casamento.",
    docs: ["Certidão de Casamento"]
  },
  "Companheiro(a) (união estável)": {
    instructions: "Declaração de união estável registrada em cartório OU Sentença judicial reconhecendo união estável. Não aceita declaração simples.",
    docs: ["Escritura de União Estável ou Sentença Judicial"]
  },
  "Cunhado(a)": {
    instructions: "Certidão de casamento do irmão/irmã com o visitante, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Casamento (Irmão/Irmã)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Primo(a)": {
    instructions: "Certidões que comprovem parentesco comum (avós em comum), e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidões Comprobatórias", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Sobrinho(a)": {
    instructions: "Certidão de nascimento do visitante, Certidão que comprove que o pai/mãe do visitante é irmão do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento (Visitante)", "Comprovante de Vínculo (Pai/Mãe irmão do detento)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Tio(a)": {
    instructions: "Certidão de nascimento do detento, Certidão que comprove que o visitante é irmão do pai/mãe do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Nascimento (Detento)", "Comprovante de Vínculo (Visitante irmão do Pai/Mãe)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Sogro(a)": {
    instructions: "Certidão de casamento ou união estável do detento, e Documento oficial do sogro(a) (Frente e Verso).",
    docs: ["Certidão de Casamento/União Estável (Detento)", "Documento Oficial do Sogro(a) (Frente e Verso)"]
  },
  "Padrasto": {
    instructions: "Certidão de casamento ou união estável com a mãe do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Casamento/União Estável (com mãe do detento)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Madrasta": {
    instructions: "Certidão de casamento ou união estável com o pai do detento, e Documento oficial com CPF (Frente e Verso).",
    docs: ["Certidão de Casamento/União Estável (com pai do detento)", "Documento Oficial com CPF (Frente e Verso)"]
  },
  "Amigo(a)": {
    instructions: "Para Amigo(a) é necessário o Memorando do Interno autorizando a visitação. Entre em contato com o Setor Social para confirmar.",
    docs: ["Memorando de Autorização (Setor Social)"]
  }
};
