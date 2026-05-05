import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Loader2, CheckCircle, AlertCircle, Info, ArrowLeft, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { verificarCarteirinhaStatus } from "@/services/agendamentosService";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import AvisosIniciais from "./components/AvisosIniciais";
import FormularioSolicitacao from "./components/FormularioSolicitacao";

const VisitorCardPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checkingCard, setCheckingCard] = useState(true);
  const [hasActiveCard, setHasActiveCard] = useState(false);
  const [podeRenovar, setPodeRenovar] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(null);

  const [success, setSuccess] = useState(false);
  const [protocol, setProtocol] = useState(null);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const [openExampleOficial, setOpenExampleOficial] = useState(false);
  const [openExampleVacina, setOpenExampleVacina] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.id) {
      setCheckingCard(false);
      return;
    }

    const carregarDados = async () => {
      try {
        const status = await verificarCarteirinhaStatus(user.id);
        setHasActiveCard(status.ativa);
        setPodeRenovar(status.podeRenovar);
        setDiasRestantes(status.diasRestantes);

        const { data: pendente } = await supabase
          .from("carteirinhas")
          .select("*")
          .eq("usuario_id", user.id)
          .eq("status", "pendente")
          .maybeSingle();

        if (pendente) setSolicitacaoPendente(pendente);
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingCard(false);
      }
    };

    carregarDados();
  }, [user]);

  const handleCancelar = async () => {
    if (!confirm("Tem certeza que deseja cancelar esta solicitação pendente?")) return;

    setLoadingCancel(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apagar_documentos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            carteirinha_id: solicitacaoPendente.id,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Falha ao apagar documentos");
      }

      const { error } = await supabase
        .from("carteirinhas")
        .update({
          status: "cancelado",
          cancelado_por: "usuario",
          cancelado_em: new Date().toISOString(),
        })
        .eq("id", solicitacaoPendente.id);

      if (error) throw error;

      setSolicitacaoPendente(null);

      toast({
        title: "Cancelada com sucesso",
        description: "Solicitação cancelada e documentos removidos.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível cancelar.",
        className: "bg-red-500 text-white border-none",
      });
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleSuccess = (newProtocol) => {
    setProtocol(newProtocol);
    setSuccess(true);
  };

  if (checkingCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2D5016] w-8 h-8" />
      </div>
    );
  }

  if (!checkingCard && user && !podeRenovar && hasActiveCard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center max-w-md">
          <Info className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">Renovação ainda não disponível</h2>
          <p className="text-gray-600 mb-4">Sua carteirinha ainda está válida por mais {diasRestantes} dias.</p>
          <p className="text-gray-500 text-sm mb-6">A renovação só pode ser solicitada nos últimos 30 dias antes do vencimento.</p>
          <Button onClick={() => navigate("/painel")} className="bg-[#2D5016] hover:bg-[#1f3810] text-white">
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Solicitação de Carteirinha - PML</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-[#2D5016] py-6 px-8 text-white text-center">
              <h1 className="text-3xl font-bold mb-2">Carteirinha de Visitante</h1>
              <p className="opacity-90">Siga os passos abaixo para enviar sua solicitação</p>
            </div>

            <div className="p-6 md:p-8">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-20 h-20 text-green-600 mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Solicitação Enviada!</h2>
                  <div className="bg-gray-100 px-8 py-4 rounded-lg border my-6">
                    <span className="text-sm text-gray-500 block">Seu Protocolo:</span>
                    <span className="text-3xl font-mono font-bold text-[#2D5016]">{protocol}</span>
                  </div>
                  <Button onClick={() => navigate("/painel")} className="bg-[#2D5016] hover:bg-[#1f3810] text-white">
                    Voltar ao Meu Painel
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 relative z-10">
                    <AvisosIniciais
                      openExampleOficial={openExampleOficial}
                      setOpenExampleOficial={setOpenExampleOficial}
                      openExampleVacina={openExampleVacina}
                      setOpenExampleVacina={setOpenExampleVacina}
                    />
                  </div>

                  <div className="lg:col-span-2 relative z-0">
                    {solicitacaoPendente ? (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-xl text-yellow-900 text-center">
                          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-yellow-700" />
                          <h2 className="text-xl font-bold mb-2">Solicitação em Análise</h2>
                          <p className="mb-4">
                            Você já possui uma solicitação aguardando análise administrativa.
                          </p>
                          <div className="bg-white p-4 rounded border text-sm mb-6">
                            <strong>Protocolo:</strong> {solicitacaoPendente.protocolo}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            type="button"
                            className="flex items-center gap-2 font-semibold"
                            onClick={() => navigate(-1)}
                          >
                            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
                          </Button>
                          <Button
                            variant="destructive"
                            type="button"
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"
                            onClick={handleCancelar}
                            disabled={loadingCancel}
                          >
                            {loadingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Cancelar Solicitação
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <FormularioSolicitacao
                        user={user}
                        profile={profile}
                        onSuccess={handleSuccess}
                        setOpenExampleVacina={setOpenExampleVacina}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VisitorCardPage;
