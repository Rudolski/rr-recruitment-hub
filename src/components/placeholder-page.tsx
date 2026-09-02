type PlaceholderPageProps = {
  title: string;
  description: string;
};

/**
 * Tijdelijke inhoud voor een module die nog gebouwd moet worden.
 * Toont de titel en de rol van de module uit het functioneel ontwerp.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">
          Nog geen functionaliteit. Deze module wordt in fase 1 uitgewerkt.
        </p>
      </div>
    </div>
  );
}
