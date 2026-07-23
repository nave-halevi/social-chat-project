const CreateLabButton = ({ isLoading, onCreate }) => {
  return (
    <button
      onClick={onCreate}
      disabled={isLoading}
      style={{
        padding: "10px 20px",
        fontSize: "18px",
        cursor: isLoading ? "not-allowed" : "pointer",
        backgroundColor: isLoading ? "#ccc" : "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "5px",
      }}
    >
      {isLoading ? "Building VM in background... ⏳" : "Create New Lab"}
    </button>
  );
};

export default CreateLabButton;
