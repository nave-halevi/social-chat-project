import TerminalWrapper from "./TerminalWrapper";

const LabList = ({ activeLab }) => {
  if (!activeLab) {
    return null;
  }
  return (
    <div
      style={{
        marginTop: "30px",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ color: "green" }}>✅ Lab is up and running!</h2>
      <p>
        Internal SSH Port: <strong>{activeLab.port}</strong>
      </p>
      <p>
        Environment ID:{" "}
        <span style={{ color: "gray", fontSize: "12px" }}>
          {activeLab.envId}
        </span>
      </p>

      <div
        style={{
          marginTop: "20px",
          height: "400px",
          backgroundColor: "#0f141c",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <TerminalWrapper activeLab={activeLab} />
      </div>
    </div>
  );
};

export default LabList;
