import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export const formatarHorasMinutos = (valorDecimal) => {
  if (!valorDecimal || isNaN(valorDecimal)) return '0h';
  const horas = Math.floor(valorDecimal);
  const minutos = Math.round((valorDecimal - horas) * 60);
  
  if (minutos === 0) return `${horas}h`;
  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
};