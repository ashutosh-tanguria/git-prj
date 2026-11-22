import i18next from "i18next";
const en = {
  keepOffline: "Keep offline",
  keptOffline: "Available offline",
  pushOffline: "Push is disabled while offline.",
  pushWhenOnline: "Push when back online",
  pushBatchChanged: "The pending batch changed. Review it before pushing.",
  storage: "Storage",
  storageUsage: "{{size}} MB cached",
  storageCapLabel: "Cache limit (MB)",
  storageSave: "Save cache limit",
  storageClear: "Clear cache",
  storageWipe: "Wipe all local data",
  storageWipeConfirm: "Wipe and sign out",
  storageConfirm:
    "Delete cached files, pending changes, preferences and credentials, and sign out of every provider?",
  storageCap: "Enter a positive cache limit in MB.",
  storageBlocked: "Close other Shelf tabs and try again.",
  storageFailed: "Shelf could not finish the storage operation.",
  storageFull:
    "Shelf could not save this file. Clear cache in Settings or increase the cache limit.",
  offlineMissing: "This file is unavailable offline.",
};
const hi = {
  keepOffline: "ऑफ़लाइन रखें",
  keptOffline: "ऑफ़लाइन उपलब्ध है",
  pushOffline: "ऑफ़लाइन रहते हुए पुश बंद है।",
  pushWhenOnline: "ऑनलाइन होने पर पुश करें",
  pushBatchChanged: "लंबित बदलाव बदल गए हैं। पुश करने से पहले समीक्षा करें।",
  storage: "स्टोरेज",
  storageUsage: "{{size}} MB कैश में",
  storageCapLabel: "कैश सीमा (MB)",
  storageSave: "कैश सीमा सहेजें",
  storageClear: "कैश साफ़ करें",
  storageWipe: "सभी स्थानीय डेटा मिटाएँ",
  storageWipeConfirm: "मिटाएँ और साइन आउट करें",
  storageConfirm:
    "कैश फ़ाइलें, लंबित बदलाव, प्राथमिकताएँ और क्रेडेंशियल मिटाएँ और सभी प्रदाताओं से साइन आउट करें?",
  storageCap: "कैश सीमा के लिए MB में धनात्मक संख्या डालें।",
  storageBlocked: "Shelf के दूसरे टैब बंद करें और फिर से कोशिश करें।",
  storageFailed: "Shelf स्टोरेज कार्रवाई पूरी नहीं कर सका।",
  storageFull: "Shelf फ़ाइल सहेज नहीं सका। सेटिंग में कैश साफ़ करें या सीमा बढ़ाएँ।",
  offlineMissing: "यह फ़ाइल ऑफ़लाइन उपलब्ध नहीं है।",
};
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
