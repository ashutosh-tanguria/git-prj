export function fileFamily(extension = ""): string {
  const ext = extension.toLowerCase();
  const families: Record<string, string[]> = {
    pdf: ["pdf"],
    doc: ["doc", "docx", "odt"],
    sheet: ["xls", "xlsx", "csv", "tsv", "ods"],
    slide: ["ppt", "pptx", "odp"],
    image: ["png", "jpg", "jpeg", "gif", "svg", "webp", "avif"],
    video: ["mp4", "webm", "mov"],
    audio: ["mp3", "wav", "ogg", "flac"],
    code: ["js", "ts", "tsx", "jsx", "py", "rs", "go", "html", "css", "json"],
    archive: ["zip", "gz", "tar", "7z", "rar"],
  };
  return (
    Object.keys(families).find((key) => families[key].includes(ext)) || "text"
  );
}
