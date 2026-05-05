import React from 'react';
import { Card } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const CorrespondenciaTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden p-8 text-center">
        <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 uppercase">Correspondência Virtual</h3>
        <p className="text-slate-500 mt-2">Em breve estará disponível a funcionalidade de envio de correspondência.</p>
      </Card>
    </div>
  );
};

export default CorrespondenciaTab;
