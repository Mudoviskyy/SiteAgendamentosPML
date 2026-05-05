
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, FileSpreadsheet } from 'lucide-react';
import { useRemuneradosAdmin } from '../hooks/useRemuneradosAdmin';

const TURNOS_RD = ['08:00 às 16:00', '10:00 às 18:00', '12:00 às 20:00', '16:00 às 00:00'];
const TURNOS_RN = ['22:00 às 06:00', '00:00 às 08:00'];

export default function AddServerModal({ isOpen, onClose, date, tipo, onConfirm, currentServers = [], title = "Adicionar Servidor", isSubstitution = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [servidorId, setServidorId] = useState('');
  const [turno, setTurno] = useState('');
  const [isDuplo, setIsDuplo] = useState(false);
  const [servidores, setServidores] = useState([]);
  const { fetchServidoresAtivos, loading } = useRemuneradosAdmin();

  useEffect(() => {
    if (isOpen) {
      setServidorId('');
      setSearchTerm('');
      setTurno('');
      setIsDuplo(false);
      loadServidores();
    }
  }, [isOpen]);

  const loadServidores = async () => {
    const res = await fetchServidoresAtivos();
    if (res && res.success) {
      setServidores(res.data);
    }
  };

  const filteredServidores = servidores.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.matricula.includes(searchTerm)
  );

  const handleConfirm = () => {
    if (!servidorId) return;
    
    if (isSubstitution) {
      onConfirm(servidorId);
      return;
    }

    if (isDuplo && tipo === 'RD') {
      onConfirm([
        { servidor_id: servidorId, data: date, tipo: 'RD', turno: TURNOS_RD[0] },
        { servidor_id: servidorId, data: date, tipo: 'RD', turno: TURNOS_RD[3] }
      ]);
    } else {
      if (!turno) return;
      onConfirm([
        { servidor_id: servidorId, data: date, tipo, turno }
      ]);
    }
  };

  const turnosOptions = tipo === 'RD' ? TURNOS_RD : TURNOS_RN;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!loading && !open) onClose();
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#2D5016]">{title} - {tipo}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 py-4 custom-scrollbar">
          <div className="space-y-3">
            <Label className="font-bold text-zinc-700">Selecione o Servidor</Label>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Buscar por nome ou matrícula..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-50 border-zinc-200 pl-9 h-11 focus-visible:ring-[#2D5016]"
              />
            </div>

            <div className="border border-zinc-100 rounded-xl overflow-hidden bg-zinc-50/30">
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></div>
                ) : filteredServidores.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">Nenhum servidor encontrado.</div>
                ) : (
                  filteredServidores.map((s, idx) => {
                    const isSelected = servidorId === s.id;
                    const isEven = idx % 2 === 0;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setServidorId(s.id)}
                        className={`
                          cursor-pointer p-3 transition-all flex items-center justify-between border-b border-zinc-100 last:border-b-0
                          ${isSelected 
                            ? 'bg-[#2D5016]/10 text-[#2D5016]' 
                            : isEven ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/50 hover:bg-zinc-100'
                          }
                        `}
                      >
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#2D5016]' : 'text-zinc-800'}`}>
                            {s.nome}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{s.matricula}</span>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[#2D5016]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {!isSubstitution && (
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              {tipo === 'RD' && (
                <div 
                  className={`
                    flex flex-row items-center gap-3 rounded-xl border p-4 transition-all cursor-pointer
                    ${isDuplo ? 'border-[#2D5016] bg-[#2D5016]/5 shadow-sm' : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'}
                  `}
                  onClick={() => {
                    const nextVal = !isDuplo;
                    setIsDuplo(nextVal);
                    if (nextVal) setTurno('');
                  }}
                >
                  <Checkbox 
                    id="admin-rd-duplo"
                    checked={isDuplo} 
                    onCheckedChange={(val) => {
                       // O clique na div já trata, mas deixamos aqui para acessibilidade
                       setIsDuplo(!!val);
                       if (val) setTurno('');
                    }}
                    onClick={(e) => e.stopPropagation()} // Evita duplo disparo com a div
                    className="w-5 h-5"
                  />
                  <div className="space-y-0.5 flex-1">
                    <Label 
                      htmlFor="admin-rd-duplo" 
                      className="text-sm font-bold cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Definir como RD Duplo
                    </Label>
                    <p className="text-[11px] text-zinc-500">Adiciona o servidor nos dois turnos do dia (Início e Fim).</p>
                  </div>
                </div>
              )}

              {!isDuplo && (
                <div className="space-y-2">
                  <Label className="font-bold text-zinc-700">Turno Específico</Label>
                  <Select value={turno} onValueChange={setTurno} disabled={loading}>
                    <SelectTrigger className="bg-white border-zinc-200">
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                    <SelectContent>
                      {turnosOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
             <p className="text-[10px] leading-tight">
               O Administrador tem liberdade para adicionar servidores mesmo que fujam de restrições de limite. 
               O sistema validará choques de horário exatos.
             </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || !servidorId || (!isSubstitution && !isDuplo && !turno)} className="bg-[#2D5016] text-white hover:bg-[#1a330e]">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSubstitution ? 'Confirmar Substituição' : 'Confirmar e Escalar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
