import React, { useState } from 'react';
import { useRemunerados } from '../hooks/useRemunerados';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const FormSolicitacaoHoras = ({ servidorId, onSolicitacaoCriada }) => {
  const { criarSolicitacao, criarUsoHoras, loading } = useRemunerados();
  const { toast } = useToast();

  const [aba, setAba] = useState('entrada');

  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
  const [tipo, setTipo] = useState('extra');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataUso, setDataUso] = useState('');

  const resetForm = () => {
    setHoras('');
    setMinutos('');
    setTipo('extra');
    setMotivo('');
    setObservacao('');
    setDataUso('');
  };

  const handleSubmitEntrada = async (e) => {
    e.preventDefault();

    const h = parseInt(horas || 0, 10);
    const m = parseInt(minutos || 0, 10);
    const totalHoras = parseFloat((h + m / 60).toFixed(2));

    if (totalHoras <= 0) {
      toast({ variant: "destructive", title: "Aviso", description: "As horas devem ser maiores que zero." });
      return;
    }

    if (!motivo.trim()) {
      toast({ variant: "destructive", title: "Aviso", description: "O motivo é obrigatório." });
      return;
    }

    const res = await criarSolicitacao(servidorId, totalHoras, tipo, motivo, observacao);

    if (res.success) {
      toast({ title: "Sucesso!", description: "Solicitação enviada com sucesso." });
      resetForm();
      onSolicitacaoCriada && onSolicitacaoCriada();
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error });
    }
  };

  const handleSubmitUso = async (e) => {
    e.preventDefault();

    const h = parseInt(horas || 0, 10);
    const m = parseInt(minutos || 0, 10);
    const totalHoras = parseFloat((h + m / 60).toFixed(2));

    if (totalHoras <= 0) {
      toast({ variant: "destructive", title: "Aviso", description: "Informe horas válidas." });
      return;
    }

    if (!dataUso) {
      toast({ variant: "destructive", title: "Aviso", description: "Selecione a data de uso." });
      return;
    }

    const res = await criarUsoHoras(servidorId, totalHoras, dataUso, observacao);

    if (res.success) {
      toast({ title: "Sucesso!", description: "Solicitação de uso enviada." });
      resetForm();
      onSolicitacaoCriada && onSolicitacaoCriada();
    } else {
      toast({ variant: "destructive", title: "Erro", description: res.error });
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Banco de Horas</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={aba} onValueChange={setAba} className="w-full">

          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="entrada">Solicitar Horas</TabsTrigger>
            <TabsTrigger value="uso">Usar Horas</TabsTrigger>
          </TabsList>

          {/* ================== ABA ENTRADA ================== */}
          <TabsContent value="entrada">
            <form onSubmit={handleSubmitEntrada} className="space-y-4 mt-4">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="space-y-2">
                  <Label>Horas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    placeholder="Ex: 1"
                    className="text-gray-900 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minutos</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutos}
                    onChange={(e) => setMinutos(e.target.value)}
                    placeholder="Ex: 45"
                    className="text-gray-900 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="bg-white text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="escolta">Escolta</SelectItem>
                      <SelectItem value="extra">Serviço Extra</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  required
                  className="bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="bg-white text-gray-900"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#2D5016] text-white">
                {loading ? "Enviando..." : "Solicitar Horas"}
              </Button>

            </form>
          </TabsContent>

          {/* ================== ABA USO ================== */}
          <TabsContent value="uso">
            <form onSubmit={handleSubmitUso} className="space-y-4 mt-4">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="space-y-2">
                  <Label>Horas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    placeholder="Ex: 1"
                    className="text-gray-900 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minutos</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutos}
                    onChange={(e) => setMinutos(e.target.value)}
                    placeholder="Ex: 45"
                    className="text-gray-900 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Uso</Label>
                  <Input
                    type="date"
                    value={dataUso}
                    onChange={(e) => setDataUso(e.target.value)}
                    required
                    className="text-gray-900 bg-white"
                  />
                </div>

              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="bg-white text-gray-900"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Enviando..." : "Solicitar Uso de Horas"}
              </Button>

            </form>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FormSolicitacaoHoras;