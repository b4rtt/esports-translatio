"use client";
import { useState } from "react";
import Select from "react-select";
import { languages as allLanguages, countries } from "countries-list";
import * as FlagIcons from "country-flag-icons/react/3x2";
const Flags = FlagIcons as Record<string, React.ComponentType<{ className?: string }>>;

const languageData = Object.entries(allLanguages).map(([code, { name }]) => ({
  code,
  label: name,
}));

const countryByLanguage: Record<string, string | undefined> = {};
for (const [cc, info] of Object.entries(countries)) {
  (info.languages || []).forEach((l) => {
    if (!countryByLanguage[l]) countryByLanguage[l] = cc;
  });
}

const options = languageData.map((l) => ({
  value: l.label,
  label: l.label,
  countryCode: countryByLanguage[l.code],
}));

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState(options[0].label);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please upload a JSON file.");
      return;
    }
    const text = await file.text();
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: text, language, prompt }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      const blob = new Blob([data.result], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "translation.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setError("Translation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 w-full max-w-md bg-background border border-foreground p-6 rounded-lg shadow-lg"
      >
        <textarea
          className="w-full border rounded-md p-2 bg-transparent"
          rows={3}
          placeholder="Describe your app"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <input
          type="file"
          accept="application/json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
        />
        <Select
          options={options}
          value={options.find((o) => o.label === language)}
          onChange={(o) => o && setLanguage(o.label)}
          isSearchable
          className="text-black dark:text-white"
          formatOptionLabel={(o) => {
            const Flag = o.countryCode ? Flags[o.countryCode as keyof typeof Flags] : null;
            return (
              <div className="flex items-center gap-2">
                {Flag && <Flag className="w-5 h-5" />}
                <span>{o.label}</span>
              </div>
            );
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background py-2 rounded-md hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
          )}
          {loading ? "Translating..." : "Translate"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </div>
  );
}
