export default function StudioHomePage() {
  const modules = [
    {
      title: "Producer",
      description: "Podcast, guiones y producción.",
      color: "from-cyan-500 to-blue-600",
    },
    {
      title: "Virtual Humans",
      description: "Bob, Lina y Felencho Virtual.",
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Music",
      description: "Canciones, álbumes y distribución.",
      color: "from-pink-500 to-rose-600",
    },
    {
      title: "Live",
      description: "Streaming y control del estudio.",
      color: "from-yellow-500 to-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}

      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0a0f1d] to-[#081018] p-8">

        <h1 className="text-5xl font-bold text-cyan-300">
          Bienvenido al Studio
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Centro de operaciones de Felencho Studio OS.
          Desde aquí administraremos producción,
          inteligencia artificial, música,
          podcast y transmisiones en vivo.
        </p>

      </div>

      {/* Estado */}

      <div className="grid gap-6 md:grid-cols-3">

        <StatusCard
          title="Bob"
          value="Online"
          color="bg-green-500"
        />

        <StatusCard
          title="Lina"
          value="Preparando conexión"
          color="bg-yellow-500"
        />

        <StatusCard
          title="Felencho Virtual"
          value="Gateway activo"
          color="bg-cyan-500"
        />

      </div>

      {/* Módulos */}

      <div>

        <h2 className="mb-5 text-2xl font-semibold">
          Workspace
        </h2>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          {modules.map((module) => (

            <div
              key={module.title}
              className="rounded-2xl border border-white/10 bg-[#151618] p-6 transition hover:-translate-y-1 hover:border-cyan-400"
            >

              <div
                className={`mb-6 h-3 w-20 rounded-full bg-gradient-to-r ${module.color}`}
              />

              <h3 className="text-xl font-bold">
                {module.title}
              </h3>

              <p className="mt-3 text-sm text-zinc-500">
                {module.description}
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

function StatusCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141517] p-6">

      <div className="flex items-center justify-between">

        <h3 className="font-semibold">
          {title}
        </h3>

        <div className={`h-3 w-3 rounded-full ${color}`} />

      </div>

      <p className="mt-6 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}