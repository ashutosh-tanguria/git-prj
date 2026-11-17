# Shelf reading help

M1 is a GitHub reader. Connecting, browsing, previewing and changing local reading preferences never write repository files. Shelf is not a sync client.

- Enter a fine-grained token only in Connect. It stays in memory. Reload requires reconnection; reading position and table/pane preferences may survive in IndexedDB.
- Click selects; Ctrl/Cmd-click toggles; Shift extends a range; Ctrl/Cmd+A selects all. Type a filename prefix to jump. Use arrows and Home/End in the file list or Locations. Space opens Quick Look; Enter opens a folder or viewer. Quick Look supports Left/Right and Escape.
- Ctrl/Cmd+L edits the address; Backspace or Alt+Up opens the parent; Alt+Left/Right follows history. Ctrl/Cmd+B toggles Locations; Ctrl/Cmd+Alt+B toggles Inspector. Browsers may reserve some combinations; every action also has a visible control.
- The Columns disclosure and header context menu change visible columns. Headers sort, dividers resize with a pointer or Left/Right, and each location remembers its layout. Pane width sliders work with a pointer or arrows.
- Inspector offers Preview and Details. Multiple selection shows a known byte total; folder contents are excluded. Unknown metadata stays Unknown. History and actual guard verdicts arrive in their assigned milestones.
- PDF supports continuous/single-page reading, 25 to 400 percent zoom, fit width/page, thumbnails, outline, phrase search and selectable text. Use j/k or PageDown/PageUp, +/-, /, and g followed by a page number and Enter. Page, zoom and mode are local preferences. Far page canvases/text layers are released and recreated on return.
- Images support fit, 100 percent, zoom, pointer pan and Left/Right sibling navigation from the focused image surface in the full viewer. Native media supports Space, seek arrows and f for fullscreen where the browser permits it.
- Markdown resolves relative links and up to ten image assets inside the same repository. External images and paths above the repository root are blocked. Code offers line numbers, wrapping and Copy text; files above 2 MiB use plain text. Text previews stop at 10 MiB; Download remains available.
- CSV/TSV initially shows 5,000 virtualized records. Open all rows asks again above 100,000 records. HTML opens as source. Run preview uses an opaque sandbox with scripts, forms and network access disabled. Other unsupported formats offer metadata and Download.
- Each viewer offers Download, Copy link, Copy path and Open in provider. The ? disclosure lists the reading shortcuts, and pressing ? inside the viewer opens it.
- At narrow widths, Locations becomes a drawer and Inspector a bottom sheet. Long-press or Selection mode enables selection without drag and drop. Only read actions exist in M1. Escape closes overlays and restores focus.
- The guard strip stays visible. GitHub may throttle excessive bandwidth. Deleting files later does not remove Git history. Caching/offline reopening, staging, push, backup/wipe and other providers belong to subsequent milestones.

## हिन्दी

M1 में GitHub फ़ाइलें पढ़ी जा सकती हैं। कनेक्ट करने, फ़ोल्डर खोलने और पूर्वावलोकन से रिपॉज़िटरी में कोई बदलाव नहीं होता। Shelf सिंक क्लाइंट नहीं है। टोकन केवल Connect में दें; रीलोड पर फिर कनेक्ट करें।

क्लिक से चुनें, Ctrl/Cmd-क्लिक से चयन बदलें, Shift से सीमा बढ़ाएँ और Ctrl/Cmd+A से सभी चुनें। तीर, Home/End और नाम टाइप करके फ़ाइल तक जाएँ। Space पूर्वावलोकन और Enter फ़ाइल खोलता है। Escape संवाद बंद करके फ़ोकस लौटाता है। Ctrl/Cmd+L पता, Ctrl/Cmd+B स्थान और Ctrl/Cmd+Alt+B निरीक्षक के लिए हैं। Alt+Up मूल फ़ोल्डर तथा Alt+Left/Right पिछला या अगला स्थान खोलते हैं।

PDF में पृष्ठ मोड, ज़ूम, खोज, थंबनेल और रूपरेखा उपलब्ध हैं। j/k, PageDown/PageUp, +/-, / और g के बाद पृष्ठ संख्या तथा Enter का उपयोग करें। पृष्ठ और ज़ूम स्थानीय रूप से याद रहते हैं। निरीक्षक में पूर्वावलोकन, विवरण और कई फ़ाइलों का कुल ज्ञात आकार मिलता है। अज्ञात जानकारी गढ़ी नहीं जाती।

चित्र में ज़ूम और पैन, मीडिया में मूल प्लेयर, कोड में पंक्ति संख्या/रैप/कॉपी और CSV में सीमित वर्चुअल तालिका है। HTML अपने आप नहीं चलता; अलग पूर्वावलोकन में स्क्रिप्ट और नेटवर्क बंद रहते हैं। टेक्स्ट सीमा 10 MiB और Markdown चित्र सीमा दस है। डाउनलोड हमेशा उपलब्ध है। संकीर्ण स्क्रीन पर ड्रॉअर, बॉटम शीट और चयन मोड का उपयोग करें। बाद के माइलस्टोन में स्टेजिंग, पुश, ऑफ़लाइन कैश और अन्य प्रदाता आएँगे।

At narrow or short heights, expand PDF controls to change fit/search/sidebar settings and collapse them again for reading. The / shortcut opens the controls and focuses search. HTML preview is sanitized before sandbox creation so even attempted external image loads are removed, in addition to the frame CSP. Local media uses only the README-approved self/blob media policy.

Guard review: focus the file grid and press U, or drop local files into Shelf. Review checks only; Stage saves the working copy only after guard approval. Click the repository size in the guard strip for the read-only Size ledger, which currently covers the current listing.

Pending review now saves staged bytes before confirmation, supports Undo/Redo and Discard, and can download or restore a working-copy ZIP. Push always checks remote versions and guards again. Protected branches retain pending work; use an allowed branch on GitHub before recovery. History restores are staged for review rather than pushed immediately.


M3b: New repository (Alt+N) defaults to Private and README initialization. Creation permission is broader than the recommended selected-repository read/push preset; permission refusals offer github.com/new and a refresh action. New folder (Alt+M) stages a disclosed .gitkeep marker. Upload, Rename, Delete and file Cut/Copy/Paste run guard review and save pending work before confirming. Same-repository Cut/Paste reuses the blob; cross-repository Cut remains unavailable; directory operations are available in M3c.

Push (Alt+P) generates an editable English commit message. Change destination offers repository, branch and folder suggestions, including new folder paths for additions. Always push here pins later uploads; uncheck it and apply to remove the pin. First use, changed targets, public repositories, warnings and conflicts require full review. Eligible private destinations use compact Quick push and still re-run guards. Settings offers persisted shortcut remapping; browser-menu conflicts need checking in your actual browser.

M3b: नई रिपॉज़िटरी Alt+N से खोलें; निजी और README विकल्प पहले से चुने हैं। Alt+M नया फ़ोल्डर स्टेज करता है। अपलोड, नाम बदलना, हटाना और फ़ाइल कट/कॉपी/पेस्ट पहले जाँच और फिर लंबित संग्रह में सहेजते हैं। Alt+P पुश समीक्षा खोलता है। गंतव्य पिन करने पर अगली फ़ाइलें वहीं स्टेज होती हैं। सार्वजनिक रिपॉज़िटरी, चेतावनी और टकराव में पूरी समीक्षा ज़रूरी है। सेटिंग में शॉर्टकट बदल सकते हैं; अपने ब्राउज़र में कुंजियाँ जाँचें।


M3c folder operations: F2 renames and Delete stages deletion of the selected file or folder. Cut/Copy and Paste preserve complete folder subtrees. Pending shows one linked row with a file count and an expandable file list; Undo, Redo and Discard apply to the whole group. Same-repository copies and moves reuse blob SHAs. Cross-repository Copy downloads source bytes only after guard approval; cross-repository or cross-branch Cut waits for M4. Unsupported special entries and cross-repository LFS pointers stop the operation.

Upload folder preserves the selected directory prefix through directory-entry drops or the directory picker. Empty directories get a disclosed .gitkeep marker. The limit is 2,000 files including markers; over-cap or incomplete enumeration stages nothing. If the picker reports no files for an empty root, use New folder. Collisions require Keep both, Replace or Cancel with no default. Replace removes the existing destination subtree. If a remote folder changes, discard and restage the linked operation to include its current contents.

M3c: फ़ोल्डर के लिए F2 नाम बदलता है और Delete हटाना स्टेज करता है। कट/कॉपी और पेस्ट पूरा फ़ोल्डर वृक्ष रखते हैं। लंबित सूची में फ़ाइल गिनती सहित एक जुड़ी पंक्ति है; Undo, Redo और Discard पूरे समूह पर काम करते हैं। फ़ोल्डर अपलोड मूल पथ रखता है और खाली फ़ोल्डर में .gitkeep मार्कर बनाता है। अधिकतम 2,000 फ़ाइलें हैं। अधूरी सूची या सीमा पार होने पर कुछ स्टेज नहीं होता। नाम टकराने पर दोनों रखें, बदलें या रद्द करें चुनना आवश्यक है। अलग रिपॉज़िटरी में कट M4 तक अनुपलब्ध है।

Website and media preview (M3.5a): choose Preview site for a static site folder or HTML file, then Run. It uses a separate sandbox site. Stop releases the preview. Phone, Tablet and Desktop change the viewport. External requests start blocked; turning them on allows repository content to contact HTTPS servers. Requests and Console list reported failures. Projects needing a server use the hand-off menu. GitHub Pages appears only after the API confirms a site. CodeSandbox opens a blank browser sandbox because repository imports have been retired. Shelf sends no credentials or file bytes to hand-off services.

Audio and video download with progress and play through blob URLs. Space plays or pauses, arrows seek five seconds, and F opens fullscreen while the player has focus. Media is cached by source version in OPFS, with an IndexedDB fallback and a 500 MB LRU cap. Files above 100 MB show a notice without downloading. Clearing browser site data removes this disposable cache. This does not add general offline-library support.

वेबसाइट और मीडिया पूर्वावलोकन: स्थिर साइट फ़ोल्डर या HTML फ़ाइल पर साइट का पूर्वावलोकन चुनें, फिर चलाएँ। यह अलग सैंडबॉक्स मूल पर चलता है। रोकें से संसाधन मुक्त होते हैं। बाहरी अनुरोध शुरू में बंद रहते हैं। उन्हें चालू करने पर रिपॉज़िटरी की सामग्री बाहरी HTTPS सर्वर से संपर्क कर सकती है। सर्वर वाले प्रोजेक्ट के लिए बाहरी सेवा का मेनू है। GitHub Pages तभी दिखता है जब API साइट की पुष्टि करे। CodeSandbox अब खाली ब्राउज़र सैंडबॉक्स खोलता है। Shelf इन सेवाओं को टोकन या फ़ाइलें नहीं भेजता। मीडिया डाउनलोड की प्रगति दिखती है और संस्करण के अनुसार कैश होता है। स्पेस चलाता या रोकता है, तीर पाँच सेकंड आगे या पीछे करते हैं और F पूर्ण स्क्रीन खोलता है। 100 MB से बड़ी फ़ाइलें पूर्वावलोकन के लिए डाउनलोड नहीं होतीं।
