import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import RegisterForm from '@/components/auth/RegisterForm';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const RegisterPage = () => {
  return (
    <>
      <Helmet>
        <title>Cadastro - Presídio Masculino de Lages</title>
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
           <Link to="/" className="flex items-center justify-center text-[#2D5016] hover:underline mb-6">
             <ArrowLeft className="w-4 h-4 mr-2" />
             Voltar para Início
           </Link>
           <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
             Crie sua conta
           </h2>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="pt-8 px-8 pb-8">
              <RegisterForm />
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Já possui cadastro?{' '}
                  <Link to="/login" className="text-[#2D5016] font-semibold hover:underline">
                    Faça login
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;