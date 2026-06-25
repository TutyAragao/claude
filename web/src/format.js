export function money(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
