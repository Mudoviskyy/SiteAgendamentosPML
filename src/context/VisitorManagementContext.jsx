import React, { createContext, useContext, useState, useEffect } from 'react';

const VisitorManagementContext = createContext();

export const useVisitorManagement = () => {
  const context = useContext(VisitorManagementContext);
  if (!context) {
    throw new Error('useVisitorManagement must be used within a VisitorManagementProvider');
  }
  return context;
};

export const VisitorManagementProvider = ({ children }) => {
  const [visitors, setVisitors] = useState(() => {
    const savedVisitors = localStorage.getItem('pml_visitors');
    return savedVisitors ? JSON.parse(savedVisitors) : [];
  });

  useEffect(() => {
    localStorage.setItem('pml_visitors', JSON.stringify(visitors));
  }, [visitors]);

  const addVisitor = (visitorData) => {
    const newVisitor = {
      id: Date.now().toString(),
      dataCadastro: new Date().toISOString(),
      status: visitorData.status || 'PENDENTE', // Default to PENDENTE if not specified
      ...visitorData,
    };
    setVisitors((prev) => [...prev, newVisitor]);
    return newVisitor;
  };

  const updateVisitorStatus = (id, newStatus) => {
    setVisitors((prev) =>
      prev.map((visitor) =>
        visitor.id === id
          ? {
              ...visitor,
              status: newStatus,
              dataAprovacao: newStatus === 'ATIVO' ? new Date().toISOString() : visitor.dataAprovacao,
            }
          : visitor
      )
    );
  };

  const deleteVisitor = (id) => {
    setVisitors((prev) => prev.filter((visitor) => visitor.id !== id));
  };

  const getVisitorByCPF = (cpf) => {
    // Normalize CPF by removing non-digits for comparison
    const normalizedSearchCPF = cpf.replace(/\D/g, '');
    return visitors.find((v) => v.cpf.replace(/\D/g, '') === normalizedSearchCPF);
  };

  const getAllVisitors = () => visitors;

  const filterVisitors = (status, searchTerm) => {
    return visitors.filter((visitor) => {
      const matchesStatus = status ? visitor.status === status : true;
      const matchesSearch = searchTerm
        ? visitor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.cpf.includes(searchTerm)
        : true;
      return matchesStatus && matchesSearch;
    });
  };

  return (
    <VisitorManagementContext.Provider
      value={{
        visitors,
        addVisitor,
        updateVisitorStatus,
        deleteVisitor,
        getVisitorByCPF,
        getAllVisitors,
        filterVisitors,
      }}
    >
      {children}
    </VisitorManagementContext.Provider>
  );
};