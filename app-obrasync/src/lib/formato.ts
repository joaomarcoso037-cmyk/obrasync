const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function novoId(): string {
  return crypto.randomUUID();
}

export const dinheiro = (centavos: number): string => MOEDA.format(centavos / 100);

/** Valor para campo de edição: 125050 vira "1.250,50". */
export function dinheiroEditavel(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Entende o jeito brasileiro de digitar valor: "1.250,50", "1250,5", "R$ 800", "1.250".
 * Ponto sozinho seguido de três dígitos é milhar; caso contrário é decimal ("12.5").
 * Devolve null quando o texto não é um valor.
 */
export function lerDinheiro(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/gi, '');
  if (!limpo) return 0;
  let normal: string;
  if (limpo.includes(',')) normal = limpo.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normal = limpo.replace(/\./g, '');
  else normal = limpo;
  if (!/^\d+(\.\d+)?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}

/** Data de hoje no fuso do aparelho. `toISOString` daria o dia seguinte à noite no Brasil. */
export function hoje(agora: Date = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${m}-${d}`;
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  return hoje(new Date(a, m - 1, d + dias));
}

export function dataCurta(data: string): string {
  if (!data) return '—';
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

export function dataAmigavel(data: string, referencia: string = hoje()): string {
  if (data === referencia) return 'Hoje';
  if (data === somarDias(referencia, 1)) return 'Amanhã';
  if (data === somarDias(referencia, -1)) return 'Ontem';
  const [a, m, d] = data.split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]}, ${d} de ${MESES[m - 1]}`;
}

export function nomeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const nome = MESES[m - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${a}`;
}

export function somarMeses(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number);
  return hoje(new Date(a, m - 1 + delta, 1)).slice(0, 7);
}

/** Link do WhatsApp; assume Brasil quando o número não traz o 55. */
export function linkWhatsApp(telefone: string, texto = ''): string | null {
  const numero = telefone.replace(/\D/g, '');
  if (numero.length < 10) return null;
  const completo = numero.length >= 12 && numero.startsWith('55') ? numero : `55${numero}`;
  return `https://wa.me/${completo}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
