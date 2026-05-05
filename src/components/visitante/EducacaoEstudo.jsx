import React from "react";
import { Button } from "@/components/ui/button";

const EducacaoEstudo = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="bg-white shadow-lg rounded-xl p-10">

          <h1 className="text-3xl md:text-4xl font-bold text-[#2D5016] mb-8">
            Educação
          </h1>

          <p className="text-gray-700 leading-relaxed mb-6">
            O sistema prisional catarinense incentiva a conclusão do estudo das pessoas privadas de liberdade.
          </p>

          <p className="text-gray-700 leading-relaxed mb-4 font-medium">
            Requisitos mínimos para participação:
          </p>

          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-8">
            <li>Estar condenado;</li>
            <li>Possuir bom comportamento.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[#2D5016] mb-4">
            Modalidades de Estudo
          </h2>

          <ul className="grid md:grid-cols-2 gap-3 text-gray-700 mb-10">
            <li>✔ Nivelamento (Alfabetização)</li>
            <li>✔ Ensino Fundamental</li>
            <li>✔ Ensino Médio</li>
            <li>✔ ENCCEJA</li>
            <li>✔ ENEM</li>
            <li>✔ Ensino Superior</li>
          </ul>

          <p className="text-gray-700 leading-relaxed mb-6">
            Para que o interno possa continuar seus estudos dentro da unidade,
            é necessário que o histórico escolar seja enviado ao setor competente.
          </p>

          <p className="text-gray-700 leading-relaxed mb-10">
            Caso haja interesse, o histórico poderá ser encaminhado por meio do formulário oficial disponível abaixo:
          </p>

          <div className="text-center">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdx-4Dm7z_gEf6tXnDpim_8_V9xZjHrNp95ZdeSkWh4AQd1UQ/viewform?pli=1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-[#2D5016] hover:bg-[#1f3810] text-white px-8 py-6 text-lg shadow-md">
                Enviar Histórico Escolar
              </Button>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EducacaoEstudo;