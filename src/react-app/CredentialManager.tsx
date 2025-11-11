// src/react-app/CredentialManager.tsx
import { useState, FormEvent } from "react";

interface CredentialManagerProps {
  onCredentialAdded?: () => void;
}

export default function CredentialManager({ onCredentialAdded }: CredentialManagerProps) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("");
    if (!label || !value) {
      setStatus("Label and value required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value })
      });
      if (res.ok) {
        setStatus("✅ Credential saved successfully");
        setLabel("");
        setValue("");
        if (onCredentialAdded) {
          onCredentialAdded();
        }
      } else {
        setStatus("❌ Error saving credential");
      }
    } catch (_) {
      setStatus("❌ Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cred-form">
      <h2>🔐 Upload Credentials</h2>
      <p style={{ color: "#666", fontSize: "0.9em" }}>
        Credentials are securely stored and accessible to agents via the Master Control Agent.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            <strong>Credential Name/Label:</strong>
            <input 
              value={label} 
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., E2B_API_KEY, GITHUB_TOKEN"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            <strong>Secret Value:</strong>
            <input 
              value={value} 
              type="password" 
              onChange={e => setValue(e.target.value)}
              placeholder="Enter API key or secret"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: "0.75rem 1.5rem" }}
        >
          {isSubmitting ? "Saving..." : "Save Credential"}
        </button>
      </form>
      {status && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "0.75rem", 
          borderRadius: "4px",
          background: status.includes("✅") ? "#d4edda" : "#f8d7da",
          color: status.includes("✅") ? "#155724" : "#721c24"
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
