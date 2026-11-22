import i18next from "i18next";

const en = {
  indexingFiles: "Indexing {{count}} of {{total}} files",
  indexCancel: "Cancel indexing",
  indexResume: "Resume indexing",
  indexPaused: "Indexing paused",
  indexIssues: "Files with indexing notices ({{count}})",
  index_tooLarge: "Skipped: too large",
  index_scanned: "No text found. This PDF may be scanned.",
  index_failed: "Shelf could not index this file.",
  textSearch: "Search cached text",
  searchCache: "Search cached files",
  searchingCache: "Searching cached files",
  searchNoMatches: "No matches",
  searchPage: "Page {{count}}",
};
const hi = {
  indexingFiles: "{{total}} में से {{count}} फ़ाइलें इंडेक्स हो रही हैं",
  indexCancel: "इंडेक्स बनाना रद्द करें",
  indexResume: "इंडेक्स बनाना जारी रखें",
  indexPaused: "इंडेक्स बनाना रुका है",
  indexIssues: "इंडेक्स सूचनाओं वाली फ़ाइलें ({{count}})",
  index_tooLarge: "छोड़ी गई: फ़ाइल बहुत बड़ी है",
  index_scanned: "कोई टेक्स्ट नहीं मिला। यह PDF स्कैन की हुई हो सकती है।",
  index_failed: "Shelf इस फ़ाइल को इंडेक्स नहीं कर सका।",
  textSearch: "कैश का टेक्स्ट खोजें",
  searchCache: "कैश की फ़ाइलें खोजें",
  searchingCache: "कैश की फ़ाइलें खोजी जा रही हैं",
  searchNoMatches: "कोई मिलान नहीं",
  searchPage: "पेज {{count}}",
};
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
