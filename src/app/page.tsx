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

type ModelOption = {
  value: string;
  label: string;
};

type TokenInfo = {
  prompt: number;
  completion: number;
  total: number;
  cost: number;
};

const Flags = FlagIcons as Record<string, React.ComponentType<{ className?: string }>>;

const REQUEST_TIMEOUT = 120000; // 2 minutes per request
const MAX_RETRIES = 2; // retry slow requests

function buildMessages(jsonChunk: string, language: string, prompt: string) {
  return [
    {
      role: "system",
      content: `You are a professional translation assistant specializing in software localization and esports content. Your task is to translate JSON files while maintaining their structure and functionality.

CRITICAL RULES:
1. ONLY translate string values (text content), NEVER translate keys or structural elements
2. Preserve ALL special characters, placeholders ({{variable}}, %s, {0}, etc.), HTML tags, and formatting
3. Return ONLY valid JSON - no explanations, comments, or markdown formatting
4. Maintain exact JSON structure, nesting, and array orders
5. For technical terms, use established terminology in the target language
6. Keep proper names, brand names, and technical identifiers untranslated
7. Preserve URLs, email addresses, and file paths exactly as they are
8. For empty strings or null values, keep them as-is
9. Maintain consistent terminology throughout the translation
10. Consider cultural context for esports and gaming terminology

ESPORTS CONTEXT:
- Use established esports terminology in the target language
- Keep game-specific terms that are commonly used internationally
- Translate UI elements appropriately for the gaming audience
- Maintain professional tone suitable for sports organizations`,
    },
    {
      role: "user",
      content: `Context: ${prompt}

Target Language: ${language}

Please translate the following JSON content according to the rules above:

${jsonChunk}`,
    },
  ];
}

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

const modelOptions: ModelOption[] = [
  {
    value: "gpt-4o-mini",
    label: "gpt-4o-mini (vysoká kvalita pro JSON překlady, rychlý)",
  },
  {
    value: "gpt-4o",
    label: "gpt-4o (nejvyšší kvalita pro JSON překlady, střední rychlost)",
  },
  {
    value: "gpt-4-turbo",
    label: "gpt-4-turbo (velmi dobrá kvalita pro JSON překlady, střední rychlost)",
  },
  {
    value: "gpt-3.5-turbo",
    label: "gpt-3.5-turbo (základní kvalita pro JSON překlady, nejrychlejší)",
  },
];

const modelPricing: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o-mini": { prompt: 0.000005, completion: 0.000015 },
  "gpt-4o": { prompt: 0.000005, completion: 0.000015 },
  "gpt-4-turbo": { prompt: 0.00001, completion: 0.00003 },
  "gpt-3.5-turbo": { prompt: 0.0000005, completion: 0.0000015 },
};

// Function to convert language name to language code
const getLanguageCode = (languageName: string): string => {
  const languageCodeMap: Record<string, string> = {
    // European languages
    "English": "en",
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
    "Portuguese": "pt",
    "Russian": "ru",
    "Polish": "pl",
    "Dutch": "nl",
    "Swedish": "sv",
    "Norwegian": "no",
    "Danish": "da",
    "Finnish": "fi",
    "Greek": "el",
    "Czech": "cs",
    "Slovak": "sk",
    "Hungarian": "hu",
    "Romanian": "ro",
    "Bulgarian": "bg",
    "Croatian": "hr",
    "Serbian": "sr",
    "Ukrainian": "uk",
    "Lithuanian": "lt",
    "Latvian": "lv",
    "Estonian": "et",
    "Slovenian": "sl",
    "Macedonian": "mk",
    "Albanian": "sq",
    "Bosnian": "bs",
    "Montenegrin": "cnr",
    "Icelandic": "is",
    "Maltese": "mt",
    "Irish": "ga",
    "Welsh": "cy",
    "Catalan": "ca",
    "Basque": "eu",
    "Galician": "gl",
    // Asian languages
    "Chinese": "zh",
    "Japanese": "ja",
    "Korean": "ko",
    "Arabic": "ar",
    "Hindi": "hi",
    "Turkish": "tr",
    "Hebrew": "he",
    "Thai": "th",
    "Vietnamese": "vi",
    "Bengali": "bn",
    "Urdu": "ur",
    "Punjabi": "pa",
    "Tamil": "ta",
    "Telugu": "te",
    "Marathi": "mr",
    "Gujarati": "gu",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Nepali": "ne",
    "Sinhala": "si",
    "Burmese": "my",
    "Khmer": "km",
    "Lao": "lo",
    "Mongolian": "mn",
    "Tibetan": "bo",
    "Kazakh": "kk",
    "Kyrgyz": "ky",
    "Tajik": "tg",
    "Turkmen": "tk",
    "Uzbek": "uz",
    "Armenian": "hy",
    "Georgian": "ka",
    "Azerbaijani": "az",
    "Persian": "fa",
    "Kurdish": "ku",
    "Pashto": "ps",
    // African languages
    "Afrikaans": "af",
    "Amharic": "am",
    "Hausa": "ha",
    "Swahili": "sw",
    "Yoruba": "yo",
    "Zulu": "zu",
    "Xhosa": "xh",
    "Somali": "so",
    // Other languages
    "Filipino": "fil",
    "Tagalog": "tl",
    "Indonesian": "id",
    "Malay": "ms",
    "Maori": "mi",
    "Belarusian": "be",
    "Moldovan": "ro", // Moldovan uses Romanian language code
  };
  
  return languageCodeMap[languageName] || languageName.toLowerCase().replace(/\s+/g, '_');
};

export default function Home() {
  const [prompt, setPrompt] = useState("Creating a translation of the application, which serves as an information system for sports clubs and other sports organizations and entities.");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState(options.find(o => o.label === "English")?.label || options[0].label);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(modelOptions[0].value);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [success, setSuccess] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    prompt: 0,
    completion: 0,
    total: 0,
    cost: 0,
  });

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

  // Function to split JSON into chunks
  function chunkObject(obj: Record<string, unknown>, chunkSize: number) {
    const entries = Object.entries(obj);
    const chunks = [] as Record<string, unknown>[];
    
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunkEntries = entries.slice(i, i + chunkSize);
      chunks.push(Object.fromEntries(chunkEntries));
    }
    
    return chunks;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setTokenInfo({ prompt: 0, completion: 0, total: 0, cost: 0 });
    if (!file) {
      setError("Please upload a JSON file.");
      return;
    }
    
    // Parse and validate JSON
    const text = await file.text();
    let jsonData: Record<string, unknown>;
    try {
      jsonData = JSON.parse(text);
    } catch {
      setError("Invalid JSON file. Please check your file format.");
      return;
    }
    
    setLoading(true);
    try {
      // Split JSON into small chunks (1 keys each)
      const chunks = chunkObject(jsonData, 1);
      console.log(`Splitting into ${chunks.length} chunks for translation`);

      let promptTokens = 0;
      let completionTokens = 0;
      
      // Initialize progress
      setProgress({ current: 0, total: chunks.length });
      
      const translatedChunks: Record<string, unknown>[] = [];

      async function translateChunkWithRetry(chunk: Record<string, unknown>, index: number): Promise<Record<string, unknown>> {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const messages = buildMessages(
              JSON.stringify(chunk),
              language,
              prompt
            );

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const res = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model,
                  messages,
                  temperature: 0.1,
                }),
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);

            const data = await res.json();

            if (!res.ok) {
              throw new Error(data.error?.message || `Request failed for chunk ${index}`);
            }

            if (data.usage) {
              promptTokens += data.usage.prompt_tokens || 0;
              completionTokens += data.usage.completion_tokens || 0;
            }

            let result = data.choices?.[0]?.message?.content || "";
            result = result.trim();
            result = result.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
            result = result.replace(/^```\s*/, "").replace(/\s*```$/, "");

            return JSON.parse(result);
          } catch (error) {
            if (attempt === MAX_RETRIES) {
              throw error;
            }
            console.warn(`Chunk ${index} failed, retrying... (${attempt + 1}/${MAX_RETRIES})`);
          }
        }
        throw new Error("Retry logic failed");
      }

      // Process each chunk separately with progress
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);

        try {
          const translatedChunk = await translateChunkWithRetry(chunk, i + 1);
          translatedChunks.push(translatedChunk);

          // Update progress
          setProgress({ current: i + 1, total: chunks.length });
          console.log(`Translation progress: ${i + 1}/${chunks.length}`);

        } catch (chunkError) {
          console.error(`Failed to translate chunk ${i + 1}:`, chunkError);
          setError(`Translation failed on chunk ${i + 1}/${chunks.length}. ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
          return;
        }
      }
      
      // Combine all translated chunks
      const combinedResult = translatedChunks.reduce((acc, chunk) => {
        return { ...acc, ...chunk };
      }, {});

      const tokenTotal = promptTokens + completionTokens;
      const pricing = modelPricing[model];
      const cost = pricing
        ? promptTokens * pricing.prompt + completionTokens * pricing.completion
        : 0;
      setTokenInfo({
        prompt: promptTokens,
        completion: completionTokens,
        total: tokenTotal,
        cost,
      });
      
      // Download the result
      const blob = new Blob([JSON.stringify(combinedResult, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Generate filename with language code
      const languageCode = getLanguageCode(language);
      a.download = `translation_${languageCode}.json`;
      
      a.click();
      URL.revokeObjectURL(url);
      
      // Show success state
      setSuccess(true);
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error(error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Translation failed. Please try again.");
      }
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-foreground">
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        {/* Logo Section */}
        <div className="mb-12 text-center">
          <div className="flex flex-col items-center gap-4 mb-4 p-6 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-slate-200/50 dark:border-slate-700/50">
            <svg width="64" height="20" viewBox="0 0 160 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
              <path d="M73.77 19.93C73.768 21.15 73.466 22.183 72.867 23.028C72.267 23.877 71.441 24.562 70.387 25.085C69.333 25.61 68.097 25.987 66.675 26.223C65.1506 26.4662 63.6086 26.582 62.065 26.569C62.065 26.999 62.137 27.387 62.276 27.735C62.42 28.082 62.654 28.377 62.976 28.616C63.296 28.856 63.727 29.043 64.263 29.176C64.801 29.309 65.475 29.374 66.289 29.378C67.247 29.381 68.155 29.279 69.015 29.078C69.809 28.893 70.41 28.714 70.82 28.535L69.905 32.323C69.567 32.428 69.197 32.529 68.791 32.628C67.761 32.877 66.639 32.998 65.421 32.996C64.057 32.993 62.887 32.816 61.905 32.468C60.925 32.118 60.128 31.634 59.507 31.008C58.8911 30.3869 58.427 29.6319 58.151 28.802C57.867 27.952 57.726 27.012 57.731 25.983C57.731 24.597 57.969 23.256 58.437 21.953C58.8837 20.6873 59.5817 19.525 60.489 18.536C61.389 17.558 62.48 16.77 63.758 16.176C65.041 15.583 66.505 15.286 68.155 15.29C69.803 15.295 71.154 15.704 72.202 16.522L73.77 19.93ZM69.576 20.53C69.576 19.98 69.378 19.557 68.986 19.254C68.594 18.957 68.037 18.804 67.321 18.804C66.221 18.8 65.175 19.174 64.181 19.924C63.184 20.674 62.494 21.875 62.109 23.521C63.615 23.524 64.851 23.436 65.821 23.243C66.789 23.055 67.547 22.814 68.099 22.514C68.649 22.219 69.031 21.891 69.251 21.532L69.576 20.53Z" fill="currentColor"></path>
              <path d="M80.648 14.214C81.281 13.81 82.052 13.61 82.96 13.61C84.132 13.613 85.134 13.748 85.97 14.014C86.81 14.279 87.498 14.602 88.05 14.987L89.922 11.584C89.6223 11.4065 89.3168 11.2391 89.006 11.082C88.5755 10.8633 88.1272 10.6813 87.666 10.538C87.0729 10.3538 86.4683 10.2092 85.856 10.105C85.092 9.97473 84.318 9.91282 83.543 9.91999C80.915 9.91099 78.888 10.549 77.463 11.82C76.037 13.096 75.321 14.787 75.314 16.89C75.314 17.751 75.419 18.48 75.633 19.078C75.8269 19.6421 76.1228 20.1658 76.506 20.623C76.876 21.053 77.317 21.426 77.83 21.738C78.344 22.048 78.898 22.361 79.494 22.673C79.973 22.914 80.42 23.153 80.839 23.392C81.254 23.635 81.619 23.897 81.929 24.185C82.24 24.473 82.485 24.79 82.662 25.137C82.84 25.485 82.932 25.872 82.927 26.303C82.927 26.876 82.812 27.355 82.583 27.737C82.3571 28.115 82.05 28.4381 81.684 28.683C81.2866 28.9442 80.8425 29.1262 80.376 29.219C79.8556 29.3267 79.3254 29.3797 78.794 29.377C78.2063 29.3778 77.62 29.3218 77.043 29.21C76.0758 29.0243 75.1399 28.7024 74.263 28.254C73.893 28.059 73.591 27.892 73.351 27.749L73.341 27.769L72.39 31.704C72.8405 31.9604 73.3147 32.1728 73.806 32.338C74.356 32.532 75.008 32.7 75.756 32.846C76.509 32.992 77.363 33.064 78.321 33.068C81.188 33.076 83.408 32.443 84.976 31.167C86.544 29.894 87.334 28.037 87.34 25.597C87.34 24.712 87.218 23.949 86.97 23.304C86.736 22.6832 86.3903 22.1104 85.95 21.614C85.5039 21.1196 84.9853 20.6958 84.412 20.357C83.817 19.996 83.161 19.648 82.444 19.31C81.679 18.974 81.03 18.596 80.492 18.176C79.958 17.757 79.688 17.138 79.692 16.326C79.694 15.322 80.012 14.62 80.648 14.214" fill="currentColor"></path>
              <path d="M103.935 21.5539C103.935 23.0359 103.712 24.4669 103.279 25.8539C102.871 27.1932 102.204 28.4396 101.317 29.5229C100.44 30.5849 99.332 31.4319 97.992 32.0599C96.65 32.6899 95.085 33.0029 93.292 32.9979C92.815 32.9979 92.446 32.9819 92.182 32.9579C91.9523 32.9392 91.7244 32.9034 91.5 32.8509L90.612 36.4389L85.682 38.5369H85.68L91.04 16.5699C91.542 16.3579 92.08 16.1779 92.653 16.0379C93.231 15.8949 93.81 15.7779 94.397 15.6829C94.955 15.5925 95.5169 15.5287 96.081 15.4919C96.618 15.4549 97.101 15.4399 97.533 15.4399C99.756 15.4459 101.378 16.0159 102.406 17.1559L103.935 21.5539ZM99.598 21.8649C99.598 21.5049 99.563 21.1599 99.491 20.8249C99.4259 20.5003 99.2918 20.1934 99.098 19.9249C98.908 19.6629 98.636 19.4529 98.278 19.2989C97.918 19.1399 97.452 19.0629 96.878 19.0589C96.402 19.0589 96 19.0819 95.678 19.1289C95.3821 19.1706 95.0889 19.2297 94.8 19.3059L92.406 29.1219C92.526 29.1719 92.656 29.1969 92.801 29.1969H93.266C94.246 29.1999 95.131 29.0059 95.921 28.6149C96.6935 28.2347 97.374 27.6908 97.915 27.0209C98.456 26.3559 98.868 25.5719 99.158 24.6759L99.598 21.8649Z" fill="currentColor"></path>
              <path d="M110.764 33.157C108.757 33.152 107.265 32.574 106.288 31.425C105.311 30.275 104.826 28.745 104.83 26.832C104.832 25.396 105.052 23.999 105.486 22.638C105.9 21.3165 106.547 20.0796 107.396 18.986C108.241 17.9086 109.307 17.0247 110.522 16.394C111.766 15.742 113.202 15.416 114.826 15.42C116.572 15.425 117.975 15.96 119.036 17.027C120.097 18.093 120.624 19.678 120.618 21.782C120.615 23.1901 120.406 24.5902 119.998 25.938C119.609 27.2595 118.979 28.4981 118.142 29.592C117.311 30.6684 116.257 31.552 115.052 32.182L110.764 33.157ZM111.675 29.316C112.395 29.316 113.028 29.104 113.579 28.676C114.147 28.2294 114.63 27.684 115.004 27.066C115.403 26.4147 115.706 25.7095 115.904 24.972C116.101 24.2788 116.206 23.5626 116.216 22.842C116.22 21.719 116.06 20.835 115.738 20.189C115.416 19.543 114.753 19.218 113.748 19.215C113.065 19.2097 112.4 19.4352 111.861 19.855C111.288 20.2951 110.805 20.8418 110.439 21.465C110.049 22.1193 109.751 22.8238 109.553 23.559C109.355 24.252 109.251 24.9683 109.243 25.689C109.24 26.813 109.4 27.699 109.721 28.344L111.675 29.316Z" fill="currentColor"></path>
              <path d="M133.954 19.55L133.842 20.026H133.843L133.958 19.55H133.954Z" fill="currentColor"></path>
              <path d="M133.648 15.713L133.605 15.903L132.723 19.556L132.657 19.828C132.023 19.7602 131.386 19.7268 130.749 19.728C130.108 19.7277 129.467 19.7678 128.831 19.848C128.213 19.921 127.605 20.0584 127.016 20.258L124.01 32.727L119.6 32.714L123.403 16.984C124.531 16.532 125.743 16.184 127.046 15.938C128.349 15.69 129.575 15.568 130.724 15.57C131.884 15.573 132.858 15.62 133.648 15.713Z" fill="currentColor"></path>
              <path d="M136.77 26.1279C136.647 26.7269 136.587 27.1919 136.587 27.5279C136.584 28.2449 136.825 28.7229 137.316 28.9619C137.806 29.2039 138.361 29.3219 138.983 29.3249C139.628 29.3249 140.292 29.2519 140.973 29.0999C141.653 28.9449 142.319 28.7359 142.966 28.4749V28.5219L141.998 32.5269C141.512 32.6849 141.002 32.8159 140.461 32.9149C139.565 33.0799 138.671 33.1629 137.791 33.1589C135.877 33.1539 134.449 32.7389 133.51 31.9109C132.565 31.0839 132.098 29.8819 132.1 28.3049C132.103 27.4817 132.214 26.6624 132.43 25.8679L133.258 22.4359L133.838 20.0339H133.839L133.954 19.5579H133.95L134.834 15.8929L135.63 12.6069L140.696 10.0699L139.234 15.9169L145.652 15.9349L144.744 19.5889L138.364 19.5709L136.77 26.1279Z" fill="currentColor"></path>
              <path d="M151.4 19.4591C151.663 19.3421 151.942 19.2641 152.242 19.2291C152.542 19.1941 152.809 19.1791 153.05 19.1791C154.125 19.1821 155.014 19.2681 155.718 19.4351C156.425 19.6051 157.054 19.8201 157.601 20.0851L159.224 16.6121C158.626 16.3241 157.821 16.0701 156.804 15.8521C155.788 15.6341 154.674 15.5241 153.456 15.5201C150.992 15.5151 149.142 16.0341 147.91 17.0841C146.675 18.1341 146.056 19.5311 146.054 21.2761C146.05 21.8981 146.134 22.4341 146.299 22.8881C146.465 23.3421 146.713 23.7441 147.049 24.0931C147.384 24.4391 147.801 24.7451 148.301 25.0101C148.804 25.2731 149.387 25.5281 150.058 25.7671C150.608 25.9851 151.058 26.1701 151.418 26.3241C151.775 26.4841 152.057 26.6391 152.258 26.7941C152.462 26.9501 152.604 27.1111 152.69 27.2781C152.77 27.4481 152.812 27.6391 152.812 27.8561C152.812 28.3091 152.571 28.7011 152.092 29.0341C151.612 29.3701 150.742 29.5341 149.475 29.5321C148.301 29.5281 147.3 29.3701 146.465 29.0561C146.068 28.9107 145.676 28.7523 145.289 28.5811L144.37 32.3941C144.59 32.4771 144.83 32.5571 145.092 32.6381C145.642 32.8061 146.287 32.9521 147.024 33.0751C147.767 33.1941 148.626 33.2561 149.607 33.2591C150.968 33.2621 152.14 33.0981 153.122 32.7671C154.104 32.4341 154.896 31.9991 155.512 31.4641C156.121 30.9261 156.571 30.3261 156.858 29.6561C157.148 28.9881 157.294 28.3061 157.294 27.6131C157.297 26.9461 157.22 26.3731 157.068 25.8921C156.916 25.4215 156.659 24.9919 156.316 24.6361C155.972 24.2741 155.54 23.9521 155.03 23.6631C154.432 23.3378 153.815 23.0492 153.182 22.7991C152.698 22.6265 152.221 22.4343 151.752 22.2231C151.394 22.0531 151.119 21.8921 150.927 21.7341C150.736 21.5801 150.61 21.4251 150.554 21.2701C150.49 21.0908 150.459 20.9013 150.464 20.7111C150.464 20.4031 150.557 20.1461 150.736 19.9431C150.916 19.7391 151.136 19.5781 151.4 19.4591" fill="currentColor"></path>
              <path d="M134.868 20.02L134.769 20.435H134.771L134.871 20.02H134.868Z" fill="currentColor"></path>
              <path d="M135.518 20.24L135.418 20.656H135.42L135.521 20.24H135.518Z" fill="#343534"></path>
              <path d="M48.11 24.128C48.11 37.32 37.42 48.01 24.229 48.01C11.039 48.01 0.349976 37.32 0.349976 24.128C0.349976 10.942 11.04 0.25 24.229 0.25C37.42 0.25 48.11 10.942 48.11 24.128Z" fill="#f60"></path>
              <path d="M29.012 12.198C29.012 12.825 28.8885 13.4459 28.6485 14.0251C28.4085 14.6044 28.0568 15.1307 27.6134 15.5741C27.17 16.0174 26.6436 16.369 26.0642 16.6089C25.4849 16.8487 24.864 16.9721 24.237 16.972C23.292 16.9724 22.3681 16.6925 21.5822 16.1677C20.7963 15.6429 20.1837 14.8968 19.8219 14.0237C19.4601 13.1507 19.3654 12.19 19.5498 11.2631C19.7341 10.3363 20.1892 9.48492 20.8575 8.81677C21.5258 8.14861 22.3773 7.69368 23.3042 7.50954C24.2311 7.3254 25.1918 7.42031 26.0647 7.78227C26.9377 8.14423 27.6836 8.75698 28.2083 9.54299C28.7329 10.329 29.0126 11.253 29.012 12.198" fill="#FFFFFE"></path>
              <path d="M38.52 22.8501C38.654 23.8291 38.13 24.7401 37.646 25.5501C36.524 27.4271 35.042 29.0891 33.535 30.6611C31.755 32.5191 29.861 34.2651 27.923 35.9541C29.168 36.9631 30.429 37.9541 31.709 38.9181L31.58 39.0461L29.052 41.5741L28.33 42.2961C28.307 42.3191 27.252 41.465 27.159 41.392C26.685 41.022 26.213 40.6511 25.744 40.2761C21.684 37.0431 17.674 33.6581 14.16 29.8291C12.768 28.3131 11.383 26.6931 10.437 24.8511C10.215 24.4231 10.01 23.9831 9.94997 23.5011C9.88095 22.9218 10.0017 22.3358 10.294 21.8311C10.856 20.8641 11.869 20.4601 12.905 20.2011C15.278 19.6061 17.768 19.5331 20.2 19.4211C22.108 19.3331 24.026 19.3431 25.934 19.3671C28.333 19.3971 30.737 19.4831 33.12 19.7691C33.6766 19.8309 34.2304 19.916 34.78 20.0241C35.065 20.0831 35.349 20.1421 35.63 20.2151C35.867 20.2781 36.141 20.3251 36.362 20.4351C37.436 20.8241 38.402 21.6391 38.521 22.8511L38.52 22.8501ZM24.602 32.5611C26.1737 31.2057 27.7028 29.8017 29.187 28.3511C30.413 27.1431 31.615 25.8951 32.674 24.5361C32.0005 24.4543 31.3249 24.3909 30.648 24.3461C28.132 24.1661 25.606 24.1211 23.084 24.1471C20.659 24.1711 18.21 24.2341 15.8 24.5361C16.95 26.0151 18.269 27.3641 19.61 28.6691C20.4 29.4391 21.209 30.1911 22.027 30.9311C22.451 31.3151 22.88 31.6971 23.311 32.0751C23.537 32.2741 23.766 32.4711 23.992 32.6711L24.172 32.8311C24.214 32.9011 24.255 32.9011 24.296 32.8291C24.398 32.7411 24.499 32.6491 24.602 32.5611V32.5611Z" fill="#FFFFFE"></path>
            </svg>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#f60] to-orange-500 bg-clip-text text-transparent">
              Translatio
            </h1>
          </div>
      
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-2xl shadow-xl"
        >
        <div>
          <label htmlFor="app-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Application Description:
          </label>
          <textarea
            id="app-description"
            className="w-full border rounded-md p-3 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            rows={3}
            placeholder="Describe your app..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            OpenAI API Key:
          </label>
          <input
            id="api-key"
            type="password"
            className="w-full border rounded-md p-3 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            OpenAI Model:
          </label>
          {isMounted ? (
          <Select
            instanceId="model-select"
            options={modelOptions}
            value={modelOptions.find((m) => m.value === model)}
            onChange={(m: ModelOption | null) => m && setModel(m.value)}
            isSearchable
            menuPlacement="auto"
            className="text-black dark:text-white"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: '0.375rem',
                borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                minHeight: '42px',
                boxShadow: state.isFocused ? (document.documentElement.classList.contains('dark') ? '0 0 0 1px #3b82f6' : '0 0 0 1px #3b82f6') : 'none',
                '&:hover': {
                  borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#9ca3af'
                }
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                border: document.documentElement.classList.contains('dark') ? '1px solid #374151' : '1px solid #d1d5db',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused
                  ? (document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6')
                  : (document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'),
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                '&:hover': {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
                }
              }),
              singleValue: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
              }),
              input: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
              }),
              placeholder: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              }),
              indicatorSeparator: (base) => ({
                ...base,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                '&:hover': {
                  color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                }
              }),
            }}
          />
        ) : (
          <div className="h-[42px] w-full border rounded-md bg-transparent animate-pulse" />
        )}
        </div>
        
        {/* Enhanced File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            JSON File:
          </label>
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
        </div>

        <div>
          <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Language:
          </label>
          {isMounted ? (
          <Select
            instanceId="language-select"
            options={options}
            value={options.find((o) => o.label === language)}
            onChange={(o: OptionType | null) => o && setLanguage(o.label)}
            isSearchable
            menuPlacement="auto"
            className="text-black dark:text-white"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: '0.375rem',
                borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                minHeight: '42px',
                boxShadow: state.isFocused ? (document.documentElement.classList.contains('dark') ? '0 0 0 1px #3b82f6' : '0 0 0 1px #3b82f6') : 'none',
                '&:hover': {
                  borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#9ca3af'
                }
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                border: document.documentElement.classList.contains('dark') ? '1px solid #374151' : '1px solid #d1d5db',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused 
                  ? (document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6')
                  : (document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'),
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                '&:hover': {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6',
                }
              }),
              singleValue: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
              }),
              input: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
              }),
              placeholder: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
              }),
              indicatorSeparator: (base) => ({
                ...base,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
                '&:hover': {
                  color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                }
              }),
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
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#f60] text-white py-3 rounded-md hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading && (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {success 
            ? "✓ Translation Complete!" 
            : loading && progress.total > 0 
              ? `Translating ${progress.current}/${progress.total}...` 
              : loading 
                ? "Translating..." 
                : "Translate"
          }
        </button>
        
        {/* Progress Bar */}
        {(loading || success) && progress.total > 0 && (
          <div className="w-full space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  success ? 'bg-green-500' : 'bg-[#f60]'
                }`}
                style={{
                  width: `${Math.round((progress.current / progress.total) * 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {success ? 'Completed' : 'Progress'}
              </span>
              <span>
                {progress.current}/{progress.total} chunks ({Math.round((progress.current / progress.total) * 100)}%)
              </span>
            </div>
          </div>
        )}

        {success && tokenInfo.total > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {`${tokenInfo.total} tokens (~$${tokenInfo.cost.toFixed(4)})`}
          </div>
        )}
        
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
    </div>
  );
}
