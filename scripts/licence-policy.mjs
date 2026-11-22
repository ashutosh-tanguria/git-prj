const allowed = new Set([
  "MIT", "MIT-0", "PSF-2.0", "CC0-1.0", "ISC", "Apache-2.0", "BSD-2-Clause",
  "BSD-3-Clause", "0BSD", "OFL-1.1", "MPL-2.0", "Python-2.0", "CC-BY-4.0",
  "BlueOak-1.0.0", "Zlib",
]);

export function approvesLicence(expression) {
  if (typeof expression !== "string") return false;
  const tokens = expression.match(/[A-Za-z0-9.:-]+\+?|[()]|[^\s]/g) ?? [];
  let position = 0;
  let valid = true;

  function atom() {
    const token = tokens[position++];
    if (token === "(") {
      const result = alternatives();
      if (tokens[position++] !== ")") valid = false;
      return result;
    }
    if (!token || !/^[A-Za-z0-9.:-]+\+?$/.test(token) || ["OR", "AND", "WITH"].includes(token)) {
      valid = false;
      return false;
    }
    if (tokens[position] === "WITH") {
      position++;
      const exception = tokens[position++];
      if (!exception || !/^[A-Za-z0-9.-]+$/.test(exception) || ["OR", "AND", "WITH"].includes(exception)) valid = false;
      return false;
    }
    return allowed.has(token);
  }

  function requirements() {
    let result = atom();
    while (tokens[position] === "AND") {
      position++;
      const next = atom();
      result = result && next;
    }
    return result;
  }

  function alternatives() {
    let result = requirements();
    while (tokens[position] === "OR") {
      position++;
      const next = requirements();
      result = result || next;
    }
    return result;
  }

  const approved = alternatives();
  return valid && position === tokens.length && approved;
}
