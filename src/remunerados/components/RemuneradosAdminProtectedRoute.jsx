import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const RemuneradosAdminProtectedRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: servidor } = await supabase
          .from("servidores")
          .select("role, ativo")
          .eq("user_id", user.id)
          .maybeSingle();

        const role = servidor?.role?.trim().toLowerCase();

        console.log("PROTECTED ROLE:", role);

        if (servidor && servidor.ativo && role === "admin") {
          setIsAdmin(true);
        }

      } catch (err) {
        console.error("Erro ao validar admin:", err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  if (loading) {
    return <div className="text-white p-10">Carregando...</div>;
  }

  // ❌ NÃO ADMIN → manda pro servidor
  if (!isAdmin) {
    return <Navigate to="/remunerados/servidor/dashboard" replace />;
  }

  return <Outlet />;
};

export default RemuneradosAdminProtectedRoute;