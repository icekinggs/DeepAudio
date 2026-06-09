import { KeyRound, X } from "lucide-react";

export function AccessTokenPanel({ token, onChange }) {
  return (
    <div className="token-panel">
      <KeyRound size={17} />
      <input
        type="password"
        value={token}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Token de acesso opcional"
        aria-label="Token de acesso"
      />
      {token && (
        <button type="button" aria-label="Remover token" onClick={() => onChange("")}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
