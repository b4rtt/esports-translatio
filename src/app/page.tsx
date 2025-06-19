"use client";
import { useState } from "react";

const languages = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState(languages[0].label);
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
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
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
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full border rounded-md p-2 bg-transparent"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.label} className="text-black dark:text-white">
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background py-2 rounded-md hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Translating..." : "Translate"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </div>
  );
}
