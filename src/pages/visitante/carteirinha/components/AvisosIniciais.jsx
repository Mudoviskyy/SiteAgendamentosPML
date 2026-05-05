import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import RequisitosDicas from './RequisitosDicas';

const AvisosIniciais = ({ openExampleOficial, setOpenExampleOficial, openExampleVacina, setOpenExampleVacina }) => {
  return (
    <div className="sticky top-6 space-y-4">
      <img
        src="https://i.postimg.cc/Yq3nWpPJ/Captura-de-tela-2026-03-25-164044.png"
        alt="Preview"
        className="w-full rounded-lg shadow border"
      />

      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Exemplo da Carteirinha Oficial
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Se você já tem a física, localize a data de emissão conforme o exemplo.
        </p>
        <button
          type="button"
          onClick={() => setOpenExampleOficial(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition relative z-20"
        >
          Ver exemplo do documento
        </button>
      </div>

      {openExampleOficial && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[150] p-4"
          onClick={() => setOpenExampleOficial(false)}
        >
          <div
            className="bg-white rounded-xl p-5 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenExampleOficial(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-500 hover:text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-gray-200 z-10"
            >
              ✕
            </button>
            <h2 className="text-base font-bold text-gray-800 mb-4 pr-6">
              Localização da Data de Emissão
            </h2>
            <div className="overflow-hidden rounded-lg border border-gray-100 flex justify-center bg-gray-50">
              <img
                src="https://i.postimg.cc/PxSsymVx/Captura-de-tela-2026-03-25-164026.png"
                alt="Exemplo Carteirinha"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {openExampleVacina && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[150] p-4"
          onClick={() => setOpenExampleVacina(false)}
        >
          <div
            className="bg-white rounded-xl p-5 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenExampleVacina(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-500 hover:text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-gray-200 z-10"
            >
              ✕
            </button>
            <h2 className="text-base font-bold text-gray-800 mb-4 pr-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Exemplo de Declaração de Vacina
            </h2>
            <div className="overflow-hidden rounded-lg border border-gray-100 flex justify-center bg-gray-50 p-2">
              <img
                src="https://i.postimg.cc/k4FrksWM/Chat-GPT-Image-12-de-mar-de-2026-14-57-30.png"
                alt="Exemplo Vacina"
                className="max-w-full max-h-[60vh] object-contain rounded border"
              />
            </div>
            <p className="text-xs text-gray-600 mt-4 text-center">
              A declaração pode ser obtida no posto de saúde.
            </p>
          </div>
        </div>
      )}

      <RequisitosDicas />
    </div>
  );
};

export default AvisosIniciais;
