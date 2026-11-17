import i18next from "i18next";
export const en = {
  branch: "Branch",
  repoRateLimit: "GitHub rate limit reached. Wait before retrying.",
  settings: "Settings",
  repoBranchWarning:
    "The repository was created. The default branch could not be confirmed as main. Review the branch on GitHub.",
  viewCommit: "View commit on GitHub",
  tokenPreset: "Token permissions",
  repoCreate: "Create repository",
  repoName: "Repository name",
  repoOwner: "Owner",
  repoDescription: "Description",
  repoReadme: "Add a README file",
  repoPrivate: "Private",
  repoPublic: "Public",
  repoInvalid:
    "Use up to 100 letters, digits, dots, underscores or hyphens. Replace spaces with hyphens.",
  repoAvailable: "Name available",
  repoTaken: "Name unavailable",
  repoRejected:
    "GitHub rejected creation. The name may be taken, or creation may be restricted by token or organization policy. Refresh repositories before retrying.",
  repoChecking: "Checking name",
  repoDenied:
    "This token cannot create repositories, or the name was rejected.",
  repoGithub: "Create on github.com",
  repoAllow: "How to allow it",
  repoGuide:
    "Use a fine-grained token with Repository creation write or Administration write, plus Contents write for pushing. Organization policy and token resource coverage also apply.",
  repoRefresh: "Refresh repositories",
  repoCreated: "Repository created",
  repoError:
    "Could not complete the request. Refresh repositories before retrying.",
  destination: "Destination",
  destinationChange: "Change destination",
  destinationFolder: "Folder path (empty means root)",
  destinationCreate: "Create folder path",
  destinationPin: "Always push here",
  destinationApply: "Apply destination",
  destinationInvalid:
    "Choose a valid folder path without dot or .git segments.",
  quickPush: "Quick push",
  pushTo: "Push to",
  commandSettings: "Shortcut settings",
  shortcutSave: "Save shortcuts",
  shortcutInvalid:
    "Bindings must be unique and must not use reserved browser or app shortcuts.",
  commandName: "Name",
  commandPreview: "Review staged operation",
  clipboardEmpty: "Copy or cut files first",
  clipboardFilesOnly: "Select files. Folder transfers are not supported yet.",
  clipboardSamePath: "Choose another destination folder",
  clipboardCrossRepository:
    "Cross-repository cuts need verified transfer support in M4. Copy is available.",
  commandError: "The action could not be completed. Pending work was kept.",
  commandDelete: "Stage deletion",
  commandNewFolder:
    "New folder stores a .gitkeep marker until files are added.",
  pushDestFirst:
    "First use, changed destination or warnings require full review.",
  tokenReadPush:
    "Recommended: read and push selected repositories (Contents write, Metadata read)",
  tokenCreate:
    "Also create repositories (adds Repository creation write or Administration write; broader access)",
  shortcutUnverified:
    "Browser-reserved keys may not reach the app. Test changed bindings in your browser.",
};
export const hi = {
  branch: "शाखा",
  repoRateLimit: "GitHub की अनुरोध सीमा पूरी हुई। फिर प्रयास करने से पहले रुकें।",
  settings: "सेटिंग",
  repoBranchWarning:
    "रिपॉज़िटरी बन गई। मुख्य शाखा main की पुष्टि नहीं हो सकी। GitHub पर शाखा जाँचें।",
  viewCommit: "GitHub पर कमिट देखें",
  tokenPreset: "टोकन की अनुमतियाँ",
  repoCreate: "रिपॉज़िटरी बनाएँ",
  repoName: "रिपॉज़िटरी का नाम",
  repoOwner: "मालिक",
  repoDescription: "विवरण",
  repoReadme: "README फ़ाइल जोड़ें",
  repoPrivate: "निजी",
  repoPublic: "सार्वजनिक",
  repoInvalid:
    "अधिकतम 100 अक्षर, अंक, डॉट, अंडरस्कोर या हाइफ़न उपयोग करें। रिक्त स्थान को हाइफ़न से बदलें।",
  repoAvailable: "नाम उपलब्ध है",
  repoTaken: "नाम उपलब्ध नहीं है",
  repoRejected:
    "GitHub ने निर्माण अस्वीकार किया। नाम पहले से लिया हो सकता है या टोकन और संगठन की नीति रोक सकती है। फिर प्रयास से पहले रिपॉज़िटरी ताज़ा करें।",
  repoChecking: "नाम की जाँच",
  repoDenied: "यह टोकन रिपॉज़िटरी नहीं बना सकता या नाम अस्वीकार हुआ।",
  repoGithub: "github.com पर बनाएँ",
  repoAllow: "अनुमति कैसे दें",
  repoGuide:
    "रिपॉज़िटरी बनाने या प्रशासन की लिखने की अनुमति वाला सूक्ष्म टोकन उपयोग करें। पुश के लिए Contents write चाहिए। संगठन की नीति और टोकन का दायरा भी लागू हैं।",
  repoRefresh: "रिपॉज़िटरी फिर लोड करें",
  repoCreated: "रिपॉज़िटरी बनाई गई",
  repoError: "कार्य पूरा नहीं हुआ। फिर प्रयास करने से पहले रिपॉज़िटरी फिर लोड करें।",
  destination: "गंतव्य",
  destinationChange: "गंतव्य बदलें",
  destinationFolder: "फ़ोल्डर पथ (रिक्त का अर्थ रूट)",
  destinationCreate: "फ़ोल्डर पथ बनाएँ",
  destinationPin: "हमेशा यहाँ पुश करें",
  destinationApply: "गंतव्य लागू करें",
  destinationInvalid: "बिना डॉट या .git खंड वाला मान्य फ़ोल्डर पथ चुनें।",
  quickPush: "त्वरित पुश",
  pushTo: "यहाँ पुश करें",
  commandSettings: "शॉर्टकट सेटिंग",
  shortcutSave: "शॉर्टकट सहेजें",
  shortcutInvalid: "कुंजियाँ अलग हों और ब्राउज़र या ऐप की आरक्षित कुंजियाँ उपयोग न करें।",
  commandName: "नाम",
  commandPreview: "स्टेज किए जाने वाले बदलाव देखें",
  clipboardEmpty: "पहले फ़ाइलें कॉपी या कट करें",
  clipboardFilesOnly: "फ़ाइलें चुनें। फ़ोल्डर स्थानांतरण अभी समर्थित नहीं है।",
  clipboardSamePath: "दूसरा गंतव्य फ़ोल्डर चुनें",
  clipboardCrossRepository:
    "अलग रिपॉज़िटरी में कट के लिए M4 का सत्यापित स्थानांतरण चाहिए। कॉपी उपलब्ध है।",
  commandError: "कार्य पूरा नहीं हुआ। लंबित बदलाव सुरक्षित हैं।",
  commandDelete: "हटाना स्टेज करें",
  commandNewFolder: "फ़ाइलें जोड़ने तक नए फ़ोल्डर में .gitkeep मार्कर रहता है।",
  pushDestFirst: "पहली बार, बदले गंतव्य या चेतावनी पर पूरी समीक्षा आवश्यक है।",
  tokenReadPush:
    "अनुशंसित: चुनी रिपॉज़िटरी पढ़ें और पुश करें (Contents write, Metadata read)",
  tokenCreate:
    "रिपॉज़िटरी भी बनाएँ (बनाने या प्रशासन की लिखने की अनुमति जोड़ता है; व्यापक दायरा)",
  shortcutUnverified:
    "ब्राउज़र की आरक्षित कुंजियाँ ऐप तक नहीं पहुँच सकतीं। बदली कुंजियाँ अपने ब्राउज़र में जाँचें।",
};
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
