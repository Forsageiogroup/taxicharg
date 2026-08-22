const MESSAGES = {
  success: { tone: "success", text: (p) => `${p} connected successfully.` },
  incomplete: { tone: "warning", text: (p) => `${p} onboarding started — a few details are still needed.` },
  denied: { tone: "warning", text: (p) => `${p} connection was cancelled.` },
  invalid_state: { tone: "error", text: (p) => `${p} connection could not be verified. Please try again.` },
  not_configured: {
    tone: "warning",
    text: (p) => `${p} isn't configured yet — add its API keys as environment variables to enable this.`,
  },
  error: { tone: "error", text: (p) => `Something went wrong connecting ${p}. Please try again.` },
};

const TONES = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBanner({ provider, code }) {
  if (!code || !MESSAGES[code]) return null;
  const { tone, text } = MESSAGES[code];
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}>
      {text(provider)}
    </div>
  );
}
