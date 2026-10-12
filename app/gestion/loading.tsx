import { Skeleton } from "@/components/ui/skeleton";

export default function GestionLoading() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-navy h-screen flex flex-col p-4 gap-4">
        <Skeleton className="size-10 rounded-full bg-navy-light/20" />
        <div className="flex flex-col gap-2 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl bg-navy-light/20" />
          ))}
        </div>
      </aside>
      <div className="flex-1">
        <header className="h-16 bg-card border-b border-border flex items-center px-4">
          <Skeleton className="h-8 w-48" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </header>
        <main className="p-4 md:p-6 w-full flex flex-col gap-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
