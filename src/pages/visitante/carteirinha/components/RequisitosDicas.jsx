import React from 'react';
import { CheckCircle, AlertCircle, Info, ExternalLink } from 'lucide-react';

// ===== CONSTANTES COMPARTILHADAS =====

export const PARENTESCOS_OPTIONS = [
  { value: "", label: "Selecione o parentesco" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "filho", label: "Filho(a)" },
  { value: "irmao", label: "Irmão(ã)" },
  { value: "enteado", label: "Enteado(a)" },
  { value: "avo", label: "Avô - Avó" },
  { value: "neto", label: "Neto(a)" },
  { value: "nora", label: "Nora" },
  { value: "representantelegal", label: "Representante Legal" },
  { value: "genro", label: "Genro" },
  { value: "esposoesposa", label: "Esposo - Esposa / Companheiro(a)" },
  { value: "cunhado", label: "Cunhado(a)" },
  { value: "primo", label: "Primo(a)" },
  { value: "sobrinho", label: "Sobrinho(a)" },
  { value: "tio", label: "Tio(a)" },
  { value: "sogro", label: "Sogro(a)" },
  { value: "padrasto", label: "Padrasto" },
  { value: "madrasta", label: "Madrasta" },
  { value: "amigo(a)", label: "Amigo(a)" },
];

export const PARENTESCOS_QUE_EXIGEM_COMPROVACAO = [
  "pai", "mae", "filho", "irmao", "enteado", "avo", "neto", "nora", "genro",
  "primo", "tio", "sogro", "cunhado", "sobrinho", "padrasto", "madrasta",
  "representantelegal"
];

export const LABEL_PARENTESCO = {
  pai: "Pai",
  mae: "Mãe",
  filho: "Filho(a)",
  irmao: "Irmão(ã)",
  enteado: "Enteado(a)",
  avo: "Avô / Avó",
  neto: "Neto(a)",
  nora: "Nora",
  representantelegal: "Representante legal",
  genro: "Genro",
  esposoesposa: "Esposo / Esposa",
  companheiro: "Companheiro(a) (união estável)",
  cunhado: "Cunhado(a)",
  primo: "Primo(a)",
  sobrinho: "Sobrinho(a)",
  tio: "Tio(a)",
  sogro: "Sogro(a)",
  padrasto: "Padrasto",
  madrasta: "Madrasta",
  "amigo(a)": "Amigo(a)",
};

export const MAP_VALUE_TO_RULE = {
  pai: "Pai",
  mae: "Mãe",
  filho: "Filho(a)",
  irmao: "Irmão(ã)",
  enteado: "Enteado(a)",
  avo: "Avô / Avó",
  neto: "Neto(a)",
  nora: "Nora",
  genro: "Genro",
  representantelegal: "Representante legal",
  esposoesposa: "Esposo / Esposa",
  companheiro: "Companheiro(a) (união estável)",
  cunhado: "Cunhado(a)",
  primo: "Primo(a)",
  sobrinho: "Sobrinho(a)",
  tio: "Tio(a)",
  sogro: "Sogro(a)",
  padrasto: "Padrasto",
  madrasta: "Madrasta",
  "amigo(a)": "Amigo(a)",
};

export const DOCUMENTOS_CONFIG = [
  { label: "Sua Foto (estilo 3x4)", name: "foto_3x4", multiple: false, optional: false },
  { label: "Seu RG (Frente)", name: "rg_frente", multiple: false, optional: false },
  { label: "Seu RG (Verso)", name: "rg_verso", multiple: false, optional: false },
  { label: "Certidão de Casamento ou União Estável", name: "certidao_casamento", multiple: true, optional: false },
  { label: "Comprovante de Residência Atual", name: "comprovante_residencia", multiple: false, optional: false },
  { label: "Declaração de Residência (caso o comprovante não esteja no seu nome)", name: "declaracao_residencia", multiple: false, optional: true },
  { label: "Declaração de Vacina", name: "declaracao_vacina", multiple: false, optional: false },
  { label: "Comprovante de parentesco", name: "comprovante_parentesco", multiple: true, optional: true },
];

export const MAX_SIZE = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// ===== COMPONENTE DE DICAS LATERAL =====

const RequisitosDicas = () => {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Importante:
      </h3>
      <ul className="list-disc list-inside space-y-1 opacity-90 mb-3">
        <li>Fotos devem estar nítidas</li>
        <li>Tamanho máximo: 5MB</li>
        <li>Formatos: PDF, JPG ou PNG</li>
      </ul>
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-[11px] font-bold text-blue-900 leading-tight flex flex-col gap-1.5">
          <span>Dica: Se o seu PDF for muito grande ou der erro ao enviar, converta para imagem:</span>
          <a 
            href="https://www.ilovepdf.com/pt/pdf_para_jpg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Converter PDF em Imagem (iLovePDF)
          </a>
        </p>
      </div>
    </div>
  );
};

export default RequisitosDicas;
