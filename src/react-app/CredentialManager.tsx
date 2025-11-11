// src/react-app/CredentialManager.tsx
import React, { useState } from "react";

export default function CredentialManager() {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    if (!label || !value) {
      setStatus("Label and value required");
      return;
    }
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value })
      });
      if (res.ok) {
        setStatus("Credential saved");
        setLabel("");
        setValue("");
      } else {
        setStatus("Error saving credential");
      }
    } catch (_) {
      setStatus("Network error");
    }
  };

  return (
    <div className="cred-form">
      <h2>Credential Upload</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name/Label:
          <input value={label} onChange={e => setLabel(e.target.value)} />
        </label>
        <label>
          Secret Value:
          <input value={value} type="password" onChange={e => setValue(e.target.value)} />
        </label>
        <button type="submit">Save</button>
      </form>
      {status && <div>{status}</div>}
    </div>
  );
}
