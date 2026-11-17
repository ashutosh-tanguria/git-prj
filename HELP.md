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

Guard review: focus the file grid and press U, or drop local files into Shelf. Review checks only; Stage remains disabled until M3. Click the repository size in the guard strip for the read-only Size ledger, which currently covers the current listing.
