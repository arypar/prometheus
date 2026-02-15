export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-stone text-sm">
        <div className="w-4 h-4 border-2 border-torch-gold/30 border-t-torch-gold rounded-full animate-spin" />
        <span className="font-[var(--font-heading)]">{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message = "Failed to load data" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-prometheus-red text-sm">
        {message}
      </div>
    </div>
  );
}

export function EmptyState({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-stone text-sm">
        {message}
      </div>
    </div>
  );
}
