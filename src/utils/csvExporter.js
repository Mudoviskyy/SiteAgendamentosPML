export const exportarAgendamentosCSV = (dados) => {
  if (!dados || dados.length === 0) {
    alert('Nenhum registro para exportar');
    return;
  }

  const headers = [
    "Data",
    "Hora",
    "Galeria",
    "Tipo",
    "Nome do Preso",
    "Matrícula",
    "Visitante 1",
    "Carteirinha 1",
    "Visitante 2",
    "Carteirinha 2",
    "Visitante 3",
    "Carteirinha 3",
    "WhatsApp",
    "Email"
  ];

  const rows = dados.map(item => [
    item.data_visita,
    item.horario,
    item.galeria,
    item.tipo_visita,
    item.nome_preso,
    item.matricula_preso,
    item.visitante1_nome,
    item.visitante1_carteirinha,
    item.visitante2_nome || '',
    item.visitante2_carteirinha || '',
    item.visitante3_nome || '',
    item.visitante3_carteirinha || '',
    item.whatsapp,
    item.email
  ]);

  const csvContent =
    [headers, ...rows]
      .map(row => row.map(value => `"${value ?? ''}"`).join(';'))
      .join('\n');

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = 'agendamentos.csv';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};