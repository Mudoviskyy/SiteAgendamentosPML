import { useState } from 'react';

export const useCPFMask = (initialValue = '') => {
  const [value, setValue] = useState(initialValue);

  const formatCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setValue(formatted);
  };

  const getRawValue = () => {
    return value.replace(/\D/g, '');
  };

  const isValid = () => {
    const raw = getRawValue();
    return raw.length === 11;
  };

  return {
    value,
    setValue,
    handleChange,
    getRawValue,
    isValid,
    formatCPF
  };
};

export const validateCPF = (cpf) => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digit)
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  return true;
};