import i18next from "i18next";
export const en = {
  folderCaseWarning:
    "Some paths differ only by letter case or Unicode normalization. GitHub keeps those paths distinct; check names carefully before staging.",
  folderLfs:
    "This folder contains a Git LFS pointer. Cross-repository LFS copying is unavailable. No changes were staged.",
  folderEmptyPicker:
    "The browser reported no files. Use New folder for an empty directory; it creates a disclosed .gitkeep marker.",
  folderConflictRestart:
    "This linked folder changed remotely. Discard and restage the entire folder to include its current subtree. Folder completeness checks stay active for every conflict choice.",
  folderRetargetReuse:
    "To copy this folder into another repository, discard this pending SHA copy and paste the original folder there instead.",
  folderFileDetails: "Files in this linked change",
  uploadFolder: "Upload folder",
  folderCollision: "Destination already exists",
  folderKeepBoth: "Keep both",
  folderReplace: "Replace",
  folderReplaceNote:
    "No option is selected. Replace removes the existing destination subtree and replaces pending changes there. Keep both uses a (shelf copy) suffix.",
  folderUploadCap:
    "Folder uploads are limited to 2,000 files, including empty-folder markers. Nothing was staged. Choose a smaller folder.",
  folderIncomplete:
    "The entire folder could not be listed. Nothing was staged. Retry after checking access.",
  folderSpecial:
    "This operation includes a symlink or submodule. Nothing was staged.",
  folderPendingSource:
    "Review or discard pending changes inside the source folder before changing the folder.",
  folderIntoSelf:
    "Choose a destination outside the source folder. Keep both can create a sibling copy.",
  folderParentFile: "A parent path is a file. Choose another destination.",
  folderDuplicate:
    "The selection contains overlapping destination paths. Choose separate destinations.",
  folderEntryUnavailable:
    "The browser could not read every dropped entry. Use Upload folder to choose the directory instead. Nothing was staged.",
  folderFallback:
    "The recursive tree was truncated. Every folder was listed separately, so this operation took longer.",
  folderPlanning: "Listing the complete folder and checking destinations",
  folderPlanCount_one: "{{count}} file change will be staged together",
  folderPlanCount_other: "{{count}} file changes will be staged together",
  folderGroup_one: "{{count}} file",
  folderGroup_other: "{{count}} files",
  folderSourceChanged:
    "The source blob or folder changed. Pending work was kept. Review the source before retrying.",
  folderCutNote:
    "Cut within this repository stages a move. Cross-repository Cut is unavailable until M4; Copy is available.",
  folderEmptyRemote:
    "This remote tree has no files or .gitkeep marker. Add a marker before changing it.",
  folderUploadHelp:
    "Folder paths are preserved. Empty directories use a disclosed .gitkeep marker. Maximum 2,000 files.",
};
export const hi = {
  folderCaseWarning:
    "कुछ पथ केवल अक्षर के रूप या Unicode सामान्यीकरण में अलग हैं। GitHub उन्हें अलग रखता है; स्टेज करने से पहले नाम जाँचें।",
  folderLfs:
    "इस फ़ोल्डर में Git LFS पॉइंटर है। अलग रिपॉज़िटरी में LFS कॉपी अनुपलब्ध है। कुछ स्टेज नहीं हुआ।",
  folderEmptyPicker:
    "ब्राउज़र ने कोई फ़ाइल नहीं दी। खाली निर्देशिका के लिए नया फ़ोल्डर उपयोग करें; वह .gitkeep मार्कर बनाता है।",
  folderConflictRestart:
    "यह जुड़ा फ़ोल्डर दूरस्थ रूप से बदला है। पूरा वर्तमान वृक्ष लेने के लिए बदलाव हटाकर फ़ोल्डर फिर स्टेज करें। हर टकराव विकल्प में पूर्णता की जाँच जारी रहती है।",
  folderRetargetReuse:
    "दूसरी रिपॉज़िटरी में कॉपी करने के लिए यह लंबित SHA प्रति हटाएँ और मूल फ़ोल्डर वहाँ पेस्ट करें।",
  folderFileDetails: "इस जुड़े बदलाव की फ़ाइलें",
  uploadFolder: "फ़ोल्डर अपलोड करें",
  folderCollision: "गंतव्य पहले से मौजूद है",
  folderKeepBoth: "दोनों रखें",
  folderReplace: "बदलें",
  folderReplaceNote:
    "कोई विकल्प चुना नहीं है। बदलें मौजूदा गंतव्य और वहाँ के लंबित बदलाव बदलता है। दोनों रखें (shelf copy) प्रत्यय लगाता है।",
  folderUploadCap:
    "खाली फ़ोल्डर मार्कर सहित अधिकतम 2,000 फ़ाइलें अपलोड करें। कुछ स्टेज नहीं हुआ। छोटा फ़ोल्डर चुनें।",
  folderIncomplete:
    "पूरा फ़ोल्डर सूचीबद्ध नहीं हुआ। कुछ स्टेज नहीं हुआ। पहुँच जाँचकर फिर प्रयास करें।",
  folderSpecial: "इस कार्य में सिमलिंक या सबमॉड्यूल है। कुछ स्टेज नहीं हुआ।",
  folderPendingSource:
    "स्रोत फ़ोल्डर बदलने से पहले उसके लंबित बदलाव की समीक्षा करें या हटाएँ।",
  folderIntoSelf:
    "स्रोत फ़ोल्डर के बाहर गंतव्य चुनें। दोनों रखें पास में एक प्रति बना सकता है।",
  folderParentFile: "मूल पथ एक फ़ाइल है। दूसरा गंतव्य चुनें।",
  folderDuplicate: "चयन में गंतव्य पथ एक दूसरे पर आते हैं। अलग गंतव्य चुनें।",
  folderEntryUnavailable:
    "ब्राउज़र छोड़ी गई हर प्रविष्टि नहीं पढ़ सका। फ़ोल्डर अपलोड करें बटन उपयोग करें। कुछ स्टेज नहीं हुआ।",
  folderFallback:
    "पुनरावर्ती वृक्ष अधूरा था। हर फ़ोल्डर अलग सूचीबद्ध किया गया, इसलिए अधिक समय लगा।",
  folderPlanning: "पूरा फ़ोल्डर और गंतव्य जाँचे जा रहे हैं",
  folderPlanCount_one: "{{count}} फ़ाइल बदलाव साथ स्टेज होगा",
  folderPlanCount_other: "{{count}} फ़ाइल बदलाव साथ स्टेज होंगे",
  folderGroup_one: "{{count}} फ़ाइल",
  folderGroup_other: "{{count}} फ़ाइलें",
  folderSourceChanged:
    "स्रोत फ़ाइल या फ़ोल्डर बदला है। लंबित काम रखा गया। फिर प्रयास से पहले स्रोत जाँचें।",
  folderCutNote:
    "इसी रिपॉज़िटरी में कट स्थानांतरण स्टेज करता है। अलग रिपॉज़िटरी में कट M4 तक अनुपलब्ध है; कॉपी कर सकते हैं।",
  folderEmptyRemote:
    "इस दूरस्थ वृक्ष में फ़ाइल या .gitkeep मार्कर नहीं है। पहले मार्कर जोड़ें।",
  folderUploadHelp:
    "फ़ोल्डर पथ रखे जाते हैं। खाली फ़ोल्डर में .gitkeep मार्कर बनता है। अधिकतम 2,000 फ़ाइलें।",
};
i18next.addResourceBundle("en", "translation", en, true, true);
i18next.addResourceBundle("hi", "translation", hi, true, true);
