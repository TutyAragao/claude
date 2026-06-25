// Bloco de carregamento (shimmer). Use `className` para definir tamanho.
export default function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} />;
}

// Conjunto de cartões-esqueleto para listas.
export function SkeletonCards({ count = 6, className = 'h-24' }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}
