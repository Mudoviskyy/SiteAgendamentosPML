ALTER POLICY "Servidores podem ver sua própria agenda" ON public.agenda_servidor USING ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Servidores podem inserir na sua própria agenda" ON public.agenda_servidor WITH CHECK ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Servidores podem deletar da sua própria agenda" ON public.agenda_servidor USING ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Users can insert their own card requests" ON public.solicitacoes_carteirinha WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can view their own card requests" ON public.solicitacoes_carteirinha USING (((select auth.uid()) = user_id));
ALTER POLICY admin_atualiza_status ON public.carteirinhas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY agendamento_somente_com_carteirinha ON public.agendamentos WITH CHECK ((EXISTS ( SELECT 1
   FROM carteirinhas
  WHERE ((carteirinhas.usuario_id = (select auth.uid())) AND (carteirinhas.status = 'aprovado'::text)))));
ALTER POLICY "Usuários podem ver suas próprias carteirinhas" ON public.carteirinhas USING (((select auth.uid()) = usuario_id));
ALTER POLICY "Usuários podem inserir suas próprias carteirinhas" ON public.carteirinhas WITH CHECK (((select auth.uid()) = usuario_id));
ALTER POLICY "Admins podem ver todas as carteirinhas" ON public.carteirinhas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Admins podem atualizar carteirinhas" ON public.carteirinhas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Usuários podem ver seus documentos" ON public.carteirinha_documentos USING ((EXISTS ( SELECT 1
   FROM carteirinhas c
  WHERE ((c.id = carteirinha_documentos.carteirinha_id) AND (c.usuario_id = (select auth.uid()))))));
ALTER POLICY "Usuários podem inserir documentos" ON public.carteirinha_documentos WITH CHECK ((EXISTS ( SELECT 1
   FROM carteirinhas c
  WHERE ((c.id = carteirinha_documentos.carteirinha_id) AND (c.usuario_id = (select auth.uid()))))));
ALTER POLICY "Admins podem ver todos os documentos" ON public.carteirinha_documentos USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Visitante pode ver seus agendamentos" ON public.agendamentos USING (((select auth.uid()) = id_visitante));
ALTER POLICY "Visitante pode inserir seus agendamentos" ON public.agendamentos WITH CHECK (((select auth.uid()) = id_visitante));
ALTER POLICY "Admin pode ver tudo" ON public.agendamentos USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "update reports admin" ON public.reports_bugs USING (((select auth.role()) = 'authenticated'::text));
ALTER POLICY "Admin pode atualizar agendamentos" ON public.agendamentos USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Visitante ve sua fila" ON public.fila_espera USING (((select auth.uid()) = id_visitante));
ALTER POLICY "Admin ve fila" ON public.fila_espera USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY admin_update_all_carteirinhas ON public.carteirinhas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY admin_delete_carteirinhas ON public.carteirinhas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY admin_all_vagas_configuracao ON public.vagas_configuracao USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY admin_all_tipos_visita ON public.tipos_visita USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY user_select_own_profile ON public.perfis USING (((select auth.uid()) = id));
ALTER POLICY config_limites_admin_all ON public.config_limites_remunerados USING (((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM servidores
  WHERE ((servidores.user_id = (select auth.uid())) AND (servidores.role = 'admin'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM servidores
  WHERE ((servidores.user_id = (select auth.uid())) AND (servidores.role = 'admin'::text))))));
ALTER POLICY "Visitantes podem inserir reports" ON public.reports_bugs WITH CHECK (((select auth.role()) = 'authenticated'::text));
ALTER POLICY "Usuários autenticados podem ler reports" ON public.reports_bugs USING (((select auth.role()) = 'authenticated'::text));
ALTER POLICY "Usuários autenticados podem deletar reports" ON public.reports_bugs USING (((select auth.role()) = 'authenticated'::text));
ALTER POLICY "Servidor pode ver próprias solicitações" ON public.solicitacoes_banco_horas USING ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Servidor pode inserir próprias solicitações" ON public.solicitacoes_banco_horas WITH CHECK ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Admin pode ver todas solicitações" ON public.solicitacoes_banco_horas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Admin pode atualizar solicitações" ON public.solicitacoes_banco_horas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Admin ve todas solicitacoes" ON public.solicitacoes_banco_horas USING (((select auth.role()) = 'authenticated'::text));
ALTER POLICY users_can_update_own_profile ON public.perfis USING (((select auth.uid()) = id)) WITH CHECK ((((select auth.uid()) = id) AND (role = ( SELECT perfis_1.role
   FROM perfis perfis_1
  WHERE (perfis_1.id = (select auth.uid())))) AND (aprovado = ( SELECT perfis_1.aprovado
   FROM perfis perfis_1
  WHERE (perfis_1.id = (select auth.uid()))))));
ALTER POLICY visitante_pode_cancelar_proprio_agendamento ON public.agendamentos USING (((select auth.uid()) = id_visitante)) WITH CHECK (((select auth.uid()) = id_visitante));
ALTER POLICY "Servidor admin pode atualizar solicitações" ON public.solicitacoes_banco_horas USING ((EXISTS ( SELECT 1
   FROM servidores
  WHERE ((servidores.user_id = (select auth.uid())) AND (servidores.role = 'admin'::text)))));
ALTER POLICY "Servidor pode inserir proprio uso" ON public.uso_horas WITH CHECK ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Servidor pode ver proprio uso" ON public.uso_horas USING ((servidor_id IN ( SELECT servidores.id
   FROM servidores
  WHERE (servidores.user_id = (select auth.uid())))));
ALTER POLICY "Servidor admin pode ver todos uso" ON public.uso_horas USING ((EXISTS ( SELECT 1
   FROM servidores
  WHERE ((servidores.user_id = (select auth.uid())) AND (servidores.role = 'admin'::text)))));
ALTER POLICY "Servidor admin pode atualizar uso" ON public.uso_horas USING ((EXISTS ( SELECT 1
   FROM servidores
  WHERE ((servidores.user_id = (select auth.uid())) AND (servidores.role = 'admin'::text)))));
ALTER POLICY "Visitante cancela sua fila" ON public.fila_espera USING (((select auth.uid()) = id_visitante)) WITH CHECK (((select auth.uid()) = id_visitante));
ALTER POLICY "Admins can do everything on base_pdf" ON public.base_pdf USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Admins can select base_pdf" ON public.base_pdf USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY "Admin full access visitas_realizadas" ON public.visitas_realizadas USING ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = (select auth.uid())) AND (perfis.role = 'admin'::text)))));
ALTER POLICY visitantes_podem_atualizar_proprias_carteirinhas ON public.carteirinhas USING (((select auth.uid()) = usuario_id)) WITH CHECK (((select auth.uid()) = usuario_id));
ALTER POLICY servidores_update_own_policy ON public.servidores USING (((select auth.uid()) = user_id)) WITH CHECK ((((select auth.uid()) = user_id) AND (role = 'servidor'::text)));
