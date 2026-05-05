import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard, Users, CalendarDays, FileBarChart,
  CalendarRange, WalletCards, Bug
} from 'lucide-react'; // Adicionado Bug

import Dashboard from '@/components/admin/Dashboard';
import UserManagement from '@/components/admin/UserManagement';
import Agendamentos from '@/components/admin/Agendamentos';
import RelatoriosAdmin from '@/components/admin/RelatoriosAdmin';
import VagasManagement from '@/components/admin/VagasManagement';
import CarteirinhasAdmin from '@/components/admin/CarteirinhasAdmin';
import UserApproval from '@/components/admin/UserApproval'; // Importado aqui
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet><title>Administração - PML</title></Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, agendamentos, vagas e visualize relatórios.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            {/* Grid ajustada para 7 colunas no LG para caber o novo botão */}
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto bg-white border p-1 gap-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <Users className="w-4 h-4 mr-2" /> Usuários
              </TabsTrigger>
              <TabsTrigger value="carteirinhas" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <WalletCards className="w-4 h-4 mr-2" /> Carteirinhas
              </TabsTrigger>
              <TabsTrigger value="agendamentos" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <CalendarDays className="w-4 h-4 mr-2" /> Agendamentos
              </TabsTrigger>
              <TabsTrigger value="vagas" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <CalendarRange className="w-4 h-4 mr-2" /> Agenda / Vagas
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="data-[state=active]:bg-gray-100 data-[state=active]:text-[#2D5016]">
                <FileBarChart className="w-4 h-4 mr-2" /> Relatórios
              </TabsTrigger>
              {/* NOVO TRIGGER PARA BUGS */}
              <TabsTrigger value="bugs" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 font-bold border-2 border-transparent data-[state=active]:border-amber-200 text-[10px] uppercase">
                <Bug className="w-4 h-4 mr-2" /> Bugs Reportados
              </TabsTrigger>
            </TabsList>

            {/* ... Conteúdos anteriores omitidos por brevidade ... */}
            <TabsContent value="dashboard" className="space-y-4"><Dashboard onNavigateTab={setActiveTab} /></TabsContent>
            <TabsContent value="usuarios" className="space-y-4"><UserManagement /></TabsContent>
            <TabsContent value="carteirinhas" className="space-y-4"><CarteirinhasAdmin /></TabsContent>
            <TabsContent value="agendamentos" className="space-y-4"><Agendamentos /></TabsContent>
            <TabsContent value="vagas" className="space-y-4"><VagasManagement /></TabsContent>
            <TabsContent value="relatorios" className="space-y-4"><RelatoriosAdmin /></TabsContent>

            {/* NOVO CONTEÚDO (APONTANDO PARA USERAPPROVAL) */}
            <TabsContent value="bugs" className="space-y-4">
              <UserApproval />
            </TabsContent>

          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;