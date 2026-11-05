import { SPECIALTIES } from "@/lib/felenchoBrainSpecialties";

export default function BibliotecaEspecialidadesPage() {
  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-cyan-500/30 bg-[#101b2d] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            Felencho Mundial · Felencho Brain
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Biblioteca de Especialidades</h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            Directorio experimental de fuentes para que Bob y Lina investiguen
            preguntas del público. Las fichas no implican que ya se hayan leído
            o verificado las fuentes, ni que exista búsqueda en tiempo real.
          </p>
          <p className="mt-4 rounded-lg bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
            No desplegado a producción. No se muestran resultados de búsquedas
            ni se presentan afirmaciones extraordinarias como hechos comprobados.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {SPECIALTIES.map((specialty) => (
            <section key={specialty.key} className="rounded-2xl border border-white/10 bg-[#101827] p-5">
              <h2 className="text-xl font-semibold text-cyan-200">{specialty.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{specialty.editorialRule}</p>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Fuentes candidatas — no consultadas automáticamente
              </h3>
              <ul className="mt-3 space-y-3">
                {specialty.sources.map((source) => (
                  <li key={source.homepage} className="rounded-lg border border-white/10 p-3">
                    <a className="break-words text-sm font-semibold text-sky-300 underline underline-offset-4"
                       href={source.homepage} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>
                    <p className="mt-1 text-xs text-slate-300">{source.scope}</p>
                    <p className="mt-1 text-xs text-slate-400">{source.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="mt-8 text-sm leading-relaxed text-slate-400">
          El próximo paso es recuperar pasajes de fuentes con licencia y fecha,
          contrastar afirmaciones y entregar enlaces verificables al conductor.
          Este directorio no sustituye a profesionales acreditados.
        </footer>
      </div>
    </main>
  );
}
