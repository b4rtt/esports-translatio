"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { languages as allLanguages, countries } from "countries-list";
import * as FlagIcons from "country-flag-icons/react/3x2";

type OptionType = {
  value: string;
  label: string;
  countryCode: string | undefined;
};

const Flags = FlagIcons as Record<string, React.ComponentType<{ className?: string }>>;

const languageData = Object.entries(allLanguages).map(([code, { name }]) => ({
  code,
  label: name,
}));

// Better language to country mapping for more accurate flags
const languageToCountry: Record<string, string> = {
  // Major languages with their most representative countries
  English: "US",
  Spanish: "ES", 
  French: "FR",
  German: "DE",
  Italian: "IT",
  Portuguese: "PT",
  Russian: "RU",
  Chinese: "CN",
  Japanese: "JP",
  Korean: "KR",
  Arabic: "SA",
  Hindi: "IN",
  Turkish: "TR",
  Polish: "PL",
  Dutch: "NL",
  Swedish: "SE",
  Norwegian: "NO",
  Danish: "DK",
  Finnish: "FI",
  Greek: "GR",
  Hebrew: "IL",
  Thai: "TH",
  Vietnamese: "VN",
  Czech: "CZ",
  Slovak: "SK",
  Hungarian: "HU",
  Romanian: "RO",
  Bulgarian: "BG",
  Croatian: "HR",
  Serbian: "RS",
  Ukrainian: "UA",
  Lithuanian: "LT",
  Latvian: "LV",
  Estonian: "EE",
  Slovenian: "SI",
  Macedonian: "MK",
  Albanian: "AL",
  Bosnian: "BA",
  Montenegrin: "ME",
  Icelandic: "IS",
  Maltese: "MT",
  Irish: "IE",
  Welsh: "GB",
  Scottish: "GB",
  Catalan: "ES",
  Basque: "ES",
  Galician: "ES",
  Breton: "FR",
  Corsican: "FR",
  Luxembourgish: "LU",
  Faroese: "FO",
  Greenlandic: "GL",
  Sami: "NO",
  Frisian: "NL",
  Flemish: "BE",
  Walloon: "BE",
  Romansh: "CH",
  Ladin: "IT",
  Sardinian: "IT",
  Neapolitan: "IT",
  Sicilian: "IT",
  Venetian: "IT",
  Piedmontese: "IT",
  // African languages
  Afrikaans: "ZA",
  Amharic: "ET",
  Hausa: "NG",
  Igbo: "NG",
  Swahili: "KE",
  Yoruba: "NG",
  Zulu: "ZA",
  Xhosa: "ZA",
  Somali: "SO",
  // Asian languages
  Bengali: "BD",
  Urdu: "PK",
  Punjabi: "IN",
  Tamil: "IN",
  Telugu: "IN",
  Marathi: "IN",
  Gujarati: "IN",
  Kannada: "IN",
  Malayalam: "IN",
  Oriya: "IN",
  Assamese: "IN",
  Nepali: "NP",
  Sinhala: "LK",
  Burmese: "MM",
  Khmer: "KH",
  Lao: "LA",
  Mongolian: "MN",
  Tibetan: "CN",
  Uyghur: "CN",
  Kazakh: "KZ",
  Kyrgyz: "KG",
  Tajik: "TJ",
  Turkmen: "TM",
  Uzbek: "UZ",
  Armenian: "AM",
  Georgian: "GE",
  Azerbaijani: "AZ",
  // Middle Eastern languages
  Persian: "IR",
  Kurdish: "IQ",
  Pashto: "AF",
  Dari: "AF",
  // American languages
  Quechua: "PE",
  Guarani: "PY",
  // Pacific languages
  Maori: "NZ",
  Filipino: "PH",
  Tagalog: "PH",
  Indonesian: "ID",
  Malay: "MY",
  // Other European languages
  Belarusian: "BY",
  Moldovan: "MD",
};

// Create a fallback mapping using the original logic for languages not in our manual mapping
const countryByLanguageFallback: Record<string, string | undefined> = {};
for (const [cc, info] of Object.entries(countries)) {
  (info.languages || []).forEach((l) => {
    if (!countryByLanguageFallback[l]) countryByLanguageFallback[l] = cc;
  });
}

const options: OptionType[] = languageData.map((l) => ({
  value: l.label,
  label: l.label,
  countryCode: languageToCountry[l.label] || countryByLanguageFallback[l.code],
}));

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState(options[0].label);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === "application/json") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Please upload a JSON file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      setError("");
    }
  };

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
        className="space-y-6 w-full max-w-md bg-background border border-foreground p-8 rounded-lg shadow-lg"
      >
        <textarea
          className="w-full border rounded-md p-3 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          rows={3}
          placeholder="Describe your app..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        {/* Enhanced File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : file 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="text-center">
            {file ? (
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop your JSON file here' : 'Upload JSON file'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag & drop or click to browse
                </p>
              </div>
            )}
          </div>
        </div>

        {isMounted ? (
          <Select
            instanceId="language-select"
            options={options}
            value={options.find((o) => o.label === language)}
            onChange={(o: OptionType | null) => o && setLanguage(o.label)}
            isSearchable
            className="text-black dark:text-white"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: '0.375rem',
                borderColor: '#d1d5db',
                minHeight: '42px',
                '&:hover': {
                  borderColor: '#9ca3af'
                }
              })
            }}
            formatOptionLabel={(o: OptionType) => {
              const Flag = o.countryCode ? Flags[o.countryCode as keyof typeof Flags] : null;
              return (
                <div className="flex items-center gap-2">
                  {Flag ? (
                    <Flag className="w-5 h-5 rounded-sm" />
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center text-sm">
                      🌍
                    </div>
                  )}
                  <span>{o.label}</span>
                </div>
              );
            }}
          />
        ) : (
          <div className="h-[42px] w-full border rounded-md bg-transparent animate-pulse" />
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#f60] text-white py-3 rounded-md hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading && (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {loading ? "Translating..." : "Translate"}
        </button>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
