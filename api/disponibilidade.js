// API pública somente-leitura do Quadro de Disponibilidade — situações minerárias
// e o regime jurídico (Livre / Disponibilidade) vigente em cada período.
// Fonte: "Legislação Disponibilidade" (compilação interna do escritório).
//
// GET /api/disponibilidade                     → dataset completo
// GET /api/disponibilidade?categoria=pesquisa   → filtra por categoria
// GET /api/disponibilidade?status=livre         → filtra pelo regime atual
// GET /api/disponibilidade?data=2015-06-01      → adiciona o período vigente em cada situação nessa data
// GET /api/disponibilidade?format=csv           → exporta como CSV

const CAT_LABELS = {
  pesquisa: 'Pesquisa Mineral', lavra: 'Lavra', licenciamento: 'Licenciamento',
  garimpeira: 'Lavra Garimpeira', extracao: 'Registro de Extração',
  procedimento: 'Procedimento de Disponibilidade', geral: 'Títulos Minerários (Geral)',
};

// período: [status, intervalo (texto), referência normativa, de (ISO|null), ate (ISO|null)]
const DISP_DATA = [
  { id: '1.1', cat: 'pesquisa', situacao: 'Aprovação de relatório final de pesquisa', periodos: [
    ['livre', 'Até 01/06/2006', 'Instrução Normativa nº 01/1983 (item 16.3)', null, '2006-06-01'],
    ['disponibilidade', 'A partir de 02/06/2006', 'Portaria nº 152/2006 (Art. 2º)', '2006-06-02', null]] },
  { id: '1.2', cat: 'licenciamento', situacao: 'Redução de requerimento e registro de licença', periodos: [
    ['livre', 'Até 10/08/2008', 'Instrução Normativa nº 01/2001 (Art. 16)', null, '2008-08-10'],
    ['disponibilidade', 'A partir de 11/08/2008', 'Portaria nº 266/2008 (§ 1º Art. 14)', '2008-08-11', null]] },
  { id: '1.3', cat: 'geral', situacao: 'Renúncia parcial de títulos', periodos: [
    ['disponibilidade', 'A partir de 05/12/2018', 'Decreto nº 9.406/2018 (inciso VII-a do Art. 22 e § 5º do art. 51)', '2018-12-05', null]] },
  { id: '1.4', cat: 'geral', situacao: 'Desistência parcial de requerimento', periodos: [
    ['disponibilidade', 'A partir de 05/12/2018', 'Decreto nº 9.406/2018 (§ 1º do Art. 16)', '2018-12-05', null]] },
  { id: '2', cat: 'pesquisa', situacao: 'Desistência total do requerimento de pesquisa', periodos: [
    ['livre', 'Até 13/01/1997', 'Lei nº 7.886/1989 (§ 7º do art. 26)', null, '1997-01-13'],
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (Art. 26)', '1997-01-14', null]] },
  { id: '3', cat: 'pesquisa', situacao: 'Indeferimento do requerimento de pesquisa (descumprimento de exigência)', periodos: [
    ['livre', 'Até 13/01/1997', 'Lei nº 7.886/1989 (§ 7º do art. 26)', null, '1997-01-13'],
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (Art. 26)', '1997-01-14', null]] },
  { id: '4', cat: 'pesquisa', situacao: 'Caducidade da autorização de pesquisa, incluindo nulidade "ex officio" por não pagamento da taxa anual por hectare', periodos: [
    ['livre', 'Até 13/01/1997', 'Lei nº 7.886/1989 (§ 7º do art. 26)', null, '1997-01-13'],
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (Art. 26)', '1997-01-14', null]] },
  { id: '5', cat: 'pesquisa', situacao: 'Renúncia total à autorização de pesquisa', periodos: [
    ['livre', 'Até 13/01/1997', 'Lei nº 7.886/1989 (§ 7º do art. 26)', null, '1997-01-13'],
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (Art. 26)', '1997-01-14', null]] },
  { id: '6', cat: 'pesquisa', situacao: 'Vencimento do alvará sem apresentação tempestiva de relatório final de pesquisa ou de pedido de prorrogação do prazo de pesquisa', periodos: [
    ['livre', 'Até 25/07/2017', 'Decreto nº 62.934/1968 (parágrafo único do art. 25)', null, '2017-07-25'],
    ['disponibilidade', 'Entre 26/07/2017 e 28/11/2017', 'Medida Provisória nº 790/2017', '2017-07-26', '2017-11-28'],
    ['livre', 'Entre 29/11/2017 e 04/12/2018', 'Decreto nº 62.934/1968 (parágrafo único do art. 25) — regra restaurada após a MP 790/2017 perder eficácia', '2017-11-29', '2018-12-04'],
    ['disponibilidade', 'A partir de 05/12/2018', 'Decreto nº 9.406/2018 (inciso VII-a do Art. 8º)', '2018-12-05', null]] },
  { id: '7', cat: 'pesquisa', situacao: 'Indeferimento do pedido de prorrogação do prazo de alvará de pesquisa', periodos: [
    ['livre', 'Até 13/01/1997', 'Lei nº 7.886/1989 (§ 7º do art. 26)', null, '1997-01-13'],
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (Art. 26)', '1997-01-14', null]] },
  { id: '8', cat: 'lavra', situacao: 'Perda do prazo para requerer a lavra', periodos: [
    ['disponibilidade', 'A partir de 15/12/1976', 'Lei nº 6.403/1976, Art. 1º (nova redação do art. 31 do Decreto-Lei nº 227/1967)', '1976-12-15', null]] },
  { id: '9', cat: 'lavra', situacao: 'Desistência do direito de requerer a lavra', periodos: [
    ['disponibilidade', 'A partir de 13/01/1997', 'Lei nº 9.314/1996; Portaria nº 15/1997 (art. 6º)', '1997-01-13', null]] },
  { id: '10', cat: 'lavra', situacao: 'Desistência total do requerimento de lavra', periodos: [
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996; Portaria nº 15/1997 (art. 6º)', '1997-01-14', null]] },
  { id: '11', cat: 'lavra', situacao: 'Indeferimento do requerimento de lavra', periodos: [
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (§ 4º do art. 41)', '1997-01-14', null]] },
  { id: '12', cat: 'lavra', situacao: 'Caducidade da concessão de lavra', periodos: [
    ['disponibilidade', 'A partir de 15/12/1976', 'Lei nº 6.403/1976, Art. 1º (nova redação do § 1º do art. 65 do Decreto-Lei nº 227/1967)', '1976-12-15', null]] },
  { id: '13', cat: 'lavra', situacao: 'Renúncia total à concessão de lavra', periodos: [
    ['disponibilidade', 'A partir de 14/01/1997', 'Lei nº 9.314/1996 (§ 4º do art. 41)', '1997-01-14', null]] },
  { id: '14', cat: 'licenciamento', situacao: 'Desistência total do requerimento de registro de licença', periodos: [
    ['disponibilidade', 'Vigente desde a edição da norma (sem marco temporal expresso no quadro-fonte)', 'Portaria nº 266/2008 (§ 1º do art. 9º)', null, null]] },
  { id: '15', cat: 'licenciamento', situacao: 'Indeferimento do requerimento de registro de licença com oneração', periodos: [
    ['disponibilidade', 'A partir de 22/02/2001', 'Instrução Normativa nº 01/2001 (art. 7º); Portaria nº 266/2008 (inciso II do art. 7º)', '2001-02-22', null]] },
  { id: '16', cat: 'licenciamento', situacao: 'Renúncia total ao título de licenciamento', periodos: [
    ['disponibilidade', 'A partir de 11/08/2008', 'Portaria nº 266/2008 (§ 1º do art. 37)', '2008-08-11', null]] },
  { id: '17', cat: 'licenciamento', situacao: 'Cancelamento do título de licenciamento', periodos: [
    ['livre', 'Até 21/02/2001', 'Portaria nº 148/1980 (item V)', null, '2001-02-21'],
    ['disponibilidade', 'A partir de 22/02/2001', 'Instrução Normativa nº 01/2001 (art. 23); Portaria nº 70.590/2017 (art. 37); Portaria nº 155/2016 (Art. 195)', '2001-02-22', null]] },
  { id: '18', cat: 'licenciamento', situacao: 'Cassação do título de licenciamento', periodos: [
    ['disponibilidade', 'A partir de 11/08/2008', 'Portaria nº 266/2008 (§ 1º do art. 37)', '2008-08-11', null]] },
  { id: '19', cat: 'licenciamento', situacao: 'Vencimento do prazo do título de licenciamento sem apresentação tempestiva de pedido de prorrogação', periodos: [
    ['livre', 'Até 25/07/2017', 'Portaria nº 148/1980 (item XIV); Instrução Normativa nº 01/2001 (Art. 21 e 22)', null, '2017-07-25'],
    ['disponibilidade', 'A partir de 26/07/2017', 'Portaria nº 70.590/2017 (Art. 1º); Portaria nº 70.948/2017 (Art. 2º)', '2017-07-26', null]] },
  { id: '20', cat: 'licenciamento', situacao: 'Indeferimento do pedido de prorrogação do título de licenciamento', periodos: [
    ['disponibilidade', 'Vigente desde a edição da norma (sem marco temporal expresso no quadro-fonte)', 'Portaria nº 266/2008 (Art. 27)', null, null]] },
  { id: '21', cat: 'garimpeira', situacao: 'Desistência total do requerimento de permissão de lavra garimpeira', periodos: [
    ['disponibilidade', 'A partir de 20/01/1997', 'Portaria nº 284/2000; Portaria nº 178/2004 (Art. 29)', '1997-01-20', null]] },
  { id: '22', cat: 'garimpeira', situacao: 'Indeferimento do requerimento de permissão de lavra garimpeira', periodos: [
    ['disponibilidade', 'A partir de 20/01/1997', 'Portaria nº 284/2000; Portaria nº 178/2004 (Art. 29)', '1997-01-20', null]] },
  { id: '23', cat: 'garimpeira', situacao: 'Renúncia total à permissão de lavra garimpeira', periodos: [
    ['disponibilidade', 'A partir de 20/01/1997', 'Portaria nº 284/2000; Portaria nº 178/2004 (Art. 29)', '1997-01-20', null]] },
  { id: '24', cat: 'garimpeira', situacao: 'Vencimento do prazo da permissão de lavra garimpeira sem apresentação tempestiva de pedido de renovação', periodos: [
    ['livre', 'Até 25/07/2017', 'Portaria nº 178/2004 (Art. 17)', null, '2017-07-25'],
    ['disponibilidade', 'A partir de 26/07/2017', 'Portaria nº 70.590/2017', '2017-07-26', null]] },
  { id: '25', cat: 'garimpeira', situacao: 'Indeferimento do pedido de renovação da permissão de lavra garimpeira', periodos: [
    ['disponibilidade', 'A partir de 13/04/2004', 'Portaria nº 178/2004 (Art. 29)', '2004-04-13', null]] },
  { id: '26', cat: 'extracao', situacao: 'Desistência total do requerimento de registro de extração', periodos: [
    ['disponibilidade', 'A partir de 12/12/2018', 'Resolução ANM nº 01/2018 (Art. 14)', '2018-12-12', null]] },
  { id: '27', cat: 'extracao', situacao: 'Indeferimento do requerimento de registro de extração (descumprimento de exigência)', periodos: [
    ['disponibilidade', 'De 03/02/2000 a 12/12/2018', 'Decreto nº 3.358/2010 (Art. 4º, § 3º)', '2000-02-03', '2018-12-12'],
    ['disponibilidade', 'A partir de 12/12/2018', 'Resolução ANM nº 01/2018 (Art. 4º, § 3º)', '2018-12-12', null]] },
  { id: '28', cat: 'extracao', situacao: 'Renúncia total ao registro de extração', periodos: [
    ['disponibilidade', 'A partir de 12/12/2018', 'Resolução ANM nº 01/2018 (Art. 14)', '2018-12-12', null]] },
  { id: '29', cat: 'extracao', situacao: 'Cassação do registro de extração', periodos: [
    ['disponibilidade', 'De 03/02/2000 a 12/12/2018', 'Decreto nº 3.358/2000 (Art. 10 e 11)', '2000-02-03', '2018-12-12'],
    ['disponibilidade', 'A partir de 12/12/2018', 'Resolução ANM nº 01/2018 (Art. 10)', '2018-12-12', null]] },
  { id: '30', cat: 'extracao', situacao: 'Vencimento do prazo do registro de extração sem apresentação tempestiva de pedido de prorrogação', periodos: [
    ['disponibilidade', 'De 03/02/2000 a 12/12/2018', 'Decreto nº 3.358/2000 (Art. 10, inciso VII)', '2000-02-03', '2018-12-12'],
    ['disponibilidade', 'A partir de 12/12/2018', 'Resolução ANM nº 01/2018 (Art. 13, § 1º)', '2018-12-12', null]] },
  { id: '31', cat: 'extracao', situacao: 'Indeferimento do pedido de prorrogação do registro de extração', periodos: [
    ['disponibilidade', 'A partir de 03/02/2000', 'Decreto nº 3.358/2000 (Art. 10 e 11)', '2000-02-03', null]] },
  { id: '32', cat: 'procedimento', situacao: 'Desistência de todas as propostas habilitadas em procedimento anterior de disponibilidade após o prazo do edital', periodos: [
    ['disponibilidade', 'Vigente desde a edição da norma (sem marco temporal expresso no quadro-fonte)', 'Portaria nº 268/2008 (Art. 42)', null, null]] },
  { id: '33', cat: 'procedimento', situacao: 'Indeferimento de todas as propostas de habilitação em procedimento anterior de disponibilidade', periodos: [
    ['livre', 'Até 10/08/2008', 'Portaria nº 71/1997 (item 4.5); Portaria nº 72/1997 (item 4.5); Portaria nº 419/1999 (§ único do art. 20)', null, '2008-08-10'],
    ['disponibilidade', 'A partir de 11/08/2008', 'Portaria nº 268/2008 (Art. 42)', '2008-08-11', null]] },
  { id: '34', cat: 'procedimento', situacao: 'Indeferimento por não cumprimento de intimação em procedimento anterior de disponibilidade', periodos: [
    ['disponibilidade', 'A partir de 11/08/2008', 'Portaria nº 268/2008 (Art. 44)', '2008-08-11', null]] },
];

function toRecord(item) {
  return {
    id: item.id,
    categoria: item.cat,
    categoriaLabel: CAT_LABELS[item.cat],
    situacao: item.situacao,
    periodos: item.periodos.map(p => ({
      status: p[0], intervalo: p[1], referencia: p[2], de: p[3], ate: p[4],
    })),
  };
}

function statusAtual(item) {
  return item.periodos[item.periodos.length - 1][0];
}

function periodoNaData(item, iso) {
  let match = null;
  item.periodos.forEach(p => {
    const de = p[3], ate = p[4];
    if ((de === null || iso >= de) && (ate === null || iso <= ate)) match = p;
  });
  return match;
}

function toCsv(records) {
  const header = ['id', 'categoria', 'situacao', 'status', 'intervalo', 'referencia', 'de', 'ate'];
  const rows = [header.join(';')];
  records.forEach(r => {
    r.periodos.forEach(p => {
      rows.push([
        r.id, r.categoriaLabel, r.situacao, p.status, p.intervalo, p.referencia, p.de || '', p.ate || '',
      ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'));
    });
  });
  return rows.join('\r\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const query = req.query || {};
  const categoria = query.categoria;
  const status = query.status;
  const data = query.data; // YYYY-MM-DD
  const format = query.format;

  let items = DISP_DATA;
  if (categoria && categoria !== 'todos') items = items.filter(i => i.cat === categoria);
  if (status && status !== 'todos') items = items.filter(i => statusAtual(i) === status);

  let records = items.map(toRecord);

  if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    records = records.map(r => {
      const item = items.find(i => i.id === r.id);
      const m = periodoNaData(item, data);
      return { ...r, consulta: { data, vigente: m ? { status: m[0], intervalo: m[1], referencia: m[2] } : null } };
    });
  }

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="disponibilidade.csv"');
    return res.status(200).send(toCsv(records));
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).json({
    fonte: 'Legislação Disponibilidade (compilação interna)',
    total: records.length,
    categorias: CAT_LABELS,
    aviso: 'Compilação de referência. Confirme sempre o texto oficial da norma antes de decisões críticas.',
    dados: records,
  });
};
