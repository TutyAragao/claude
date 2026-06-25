// Cabeçalho de página padronizado: título com barra de acento + subtítulo,
// e área opcional de ações à direita.
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="relative pl-3">
        <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-purple-light to-purple" />
        <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
