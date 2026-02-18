import React from "react";

interface ModalProps {
  message: string;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ message, onClose }) => {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>Message</h3>
        <p>{message}</p>
        <button style={buttonStyle} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
  textAlign: "center",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "15px",
  padding: "8px 15px",
  border: "none",
  backgroundColor: "#007bff",
  color: "#fff",
  borderRadius: "5px",
  cursor: "pointer",
};

export default Modal;
