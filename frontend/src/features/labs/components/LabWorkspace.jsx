import TerminalWrapper from "./TerminalWrapper";
import { useCTF } from "../hooks/useCTF";

const LabWorkspace = ({ activeLab, onDeleteLab }) => {
  const { flagInput, setFlagInput, feedback, isSubmitting, handleSubmit } =
    useCTF(activeLab.envId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* LEFT PANEL */}
      <div className="w-1/2 border-r border-zinc-800 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold">{activeLab?.name || "Lab"}</h2>

            <span className="text-xs text-green-500">Difficulty: Easy</span>
          </div>

          <button
            onClick={onDeleteLab}
            className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700"
          >
            Terminate
          </button>
        </div>

        {/* DESCRIPTION */}
        <div className="p-6 text-zinc-400 text-sm leading-6 border-b border-zinc-800">
          Welcome to the training zone. Learn Linux, exploitation and system
          enumeration in a safe environment.
        </div>

        {/* TASK */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          <h3 className="text-green-500 font-semibold">
            🚩 Objective: Capture The Flag
          </h3>

          <p className="text-sm text-zinc-400">
            Navigate to <code>/tmp</code>, locate <code>flag.txt</code>, and
            extract its content using <code>cat</code>.
          </p>

          {/* INPUT */}
          <input
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white"
            placeholder="CTF{...}"
            value={flagInput}
            onChange={(e) => setFlagInput(e.target.value)}
          />

          {/* BUTTON */}
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded"
          >
            {isSubmitting ? "Checking..." : "Submit Flag"}
          </button>

          {/* FEEDBACK (LOGIC נשאר זהה) */}
          {feedback && (
            <div
              className={`text-center text-sm p-3 rounded border ${
                feedback.includes("✅")
                  ? "text-green-400 border-green-900 bg-green-950/30"
                  : "text-red-400 border-red-900 bg-red-950/30"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - TERMINAL (לא נוגעים) */}
      <div className="w-1/2 bg-black">
        <TerminalWrapper activeLab={activeLab} />
      </div>
    </div>
  );
};

export default LabWorkspace;
