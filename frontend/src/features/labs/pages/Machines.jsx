import { useLabs } from "../hooks/useLabs";

export default function Machines() {
  const { activeLab, handleCreateLab, isLoading } = useLabs();

  const machines = [
    {
      name: "Linux Fundamentals",
      difficulty: "Easy",
      scenario: "98b7d92f-7fbb-446c-90e5-df05aea4d27f",
    },
    {
      name: "Bash Scripting",
      difficulty: "Easy",
      scenario: "98b7d92f-7fbb-446c-90e5-df05aea4d27f",
    },
    {
      name: "Privilege Escalation",
      difficulty: "Medium",
      scenario: "98b7d92f-7fbb-446c-90e5-df05aea4d27f",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Machines</h1>
        <p className="text-zinc-400 mt-2">
          Select a machine and start your lab environment
        </p>
      </div>

      {/* ACTIVE LAB WARNING */}
      {activeLab && (
        <div className="mb-6 p-4 rounded-lg border border-green-900 bg-green-950/30 text-green-400">
          ⚡ You already have an active lab (envId: {activeLab.envId})
        </div>
      )}

      {/* MACHINES GRID */}
      <div className="grid md:grid-cols-3 gap-6">
        {machines.map((m, i) => (
          <div
            key={i}
            className="border border-zinc-800 bg-zinc-900 rounded-xl p-5 hover:border-zinc-700 transition"
          >
            <h2 className="text-lg font-semibold">{m.name}</h2>

            <p className="text-sm text-zinc-400 mt-2">
              Difficulty: {m.difficulty}
            </p>

            <button
              disabled={isLoading || !!activeLab}
              onClick={() => {
                // IMPORTANT: כאן אנחנו משתמשים באותו flow שלך
                handleCreateLab(m.scenario);
              }}
              className="mt-5 w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 rounded"
            >
              {isLoading ? "Starting..." : "Start Machine"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
