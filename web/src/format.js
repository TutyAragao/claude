export function money(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function chips(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function percent(value) {
  if (value == null) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

export function roiText(roi) {
  if (roi == null) return '—';
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${(roi * 100).toFixed(0)}%`;
}

export function dateText(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function relativeTime(value) {
  if (!value) return '';
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} dia${d === 1 ? '' : 's'}`;
  const months = Math.round(d / 30);
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTimeText(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
