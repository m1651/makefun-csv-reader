// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference program).
//
// Same answers as the reference for every input, by the same broken-row
// policy, but without its per-character string building: unquoted fields are
// located with native indexOf and taken with one slice, quoted fields are
// located the same way, and a field's characters are only ever copied once.
// Rare paths (stray CRs, doubled quotes, line breaks inside quotes, an
// unterminated quote) fall back to small local scans that follow the
// reference step for step.
//
// Reference semantics, kept exactly:
//  - a U+FEFF at the very start is dropped;
//  - a record ends at LF or CRLF, and a line left with no characters is no
//    record (a line holding only stray CRs is also no record, its stray_cr
//    errors stay);
//  - outside quotes a CR not followed by LF is dropped (stray_cr);
//  - a field that opens with a quote runs to the next quote that is not
//    doubled, "" inside it is one quote, each CRLF or lone CR inside it is
//    read as LF; what follows its closing quote, up to the next comma or
//    line break, is appended as it stands (quote_junk, when the field ends);
//    a quote that never closes is a literal character, and the text after
//    it is read again as unquoted (unterminated_quote);
//  - a quote inside an unquoted field is a literal character;
//  - fields stay strings, never trimmed or converted;
//  - columns is the first record when header is true, else null; rows holds
//    the records after it, each padded with "" (short_row, with fields: its
//    field count) or cut (long_row, with extra: the cut fields) to the first
//    record's width;
//  - each error is {code, line, row}, in the order met; line is the 1-based
//    line its record starts on, counting every LF, CRLF and lone CR inside
//    quotes, and row is its record's index in rows, null for the header.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const s = String(input.text);
  const header = input.header === true;
  const n = s.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && s.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header). These are read by error() at the moment an
  // error is met, exactly as in the reference.
  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads unquoted characters onto `value` up to the next comma or line
  // break: a CR not followed by LF is dropped (stray_cr). Returns the field
  // and how it ended; `added` counts the characters kept. The CR check is
  // made on the field's slice, never on an unbounded scan of the text: a
  // stray CR is rare, and an unbounded indexOf would walk to the next CR
  // far past the field in files that hold few of them.
  function readUnquoted(value) {
    let added = 0;
    for (;;) {
      if (pos >= n) return { value, ended: END, added };
      const iC = s.indexOf(',', pos);
      const iN = s.indexOf('\n', pos);
      const end = iC < 0 ? (iN < 0 ? n : iN) : (iN < 0 ? iC : iC < iN ? iC : iN);
      const seg = s.slice(pos, end);
      if (seg.indexOf('\r') < 0) {
        // No CR before the next delimiter: the slice is the field.
        if (end > pos) {
          value += seg;
          added += end - pos;
        }
        pos = end;
        if (pos >= n) return { value, ended: END, added };
        if (s.charCodeAt(pos) === 44) {
          pos += 1;
          return { value, ended: COMMA, added };
        }
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      // A CR sits before the next delimiter: walk pos..end, dropping stray
      // CRs (each one an error) and stopping at a CRLF line break.
      let i = pos;
      while (i < end) {
        if (s.charCodeAt(i) === 13) {
          if (s.charCodeAt(i + 1) === 10) {
            if (i > pos) {
              value += s.slice(pos, i);
              added += i - pos;
            }
            pos = i + 2;
            line += 1;
            return { value, ended: LINE_BREAK, added };
          }
          if (i > pos) {
            value += s.slice(pos, i);
            added += i - pos;
          }
          error('stray_cr');
          i += 1;
          pos = i;
        } else {
          i += 1;
        }
      }
      if (end > pos) {
        value += s.slice(pos, end);
        added += end - pos;
      }
      pos = end;
    }
  }

  // A quoted segment with each CRLF or lone CR read as LF: returns the
  // segment as the reference reads it, and how many lines it spans.
  function xform(seg) {
    if (seg.indexOf('\r') < 0 && seg.indexOf('\n') < 0) return [seg, 0];
    let d = 0;
    const t = seg.replace(/\r\n|\r|\n/g, () => {
      d += 1;
      return '\n';
    });
    return [t, d];
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let p = pos + 1;
    let segs = null;
    let lineDelta = 0;
    for (;;) {
      const q = s.indexOf('"', p);
      if (q < 0) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as unquoted. The line is put back to the
        // opening quote's line, as in the reference.
        pos = open + 1;
        line = openLine;
        error('unterminated_quote');
        return readUnquoted('"');
      }
      if (s.charCodeAt(q + 1) === 34) {
        // A doubled quote: one literal quote, and the scan goes on.
        const [t, d] = xform(s.slice(p, q));
        if (!segs) segs = [];
        segs.push(t, '"');
        lineDelta += d;
        p = q + 2;
        continue;
      }
      // The closing quote is at q.
      const [t, d] = xform(s.slice(p, q));
      line += lineDelta + d;
      const value = segs ? (segs.push(t), segs.join('')) : t;
      pos = q + 1;
      if (pos >= n) return { value, ended: END };
      const c = s.charCodeAt(pos);
      if (c === 44) {
        pos += 1;
        return { value, ended: COMMA };
      }
      if (c === 10) {
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      if (c === 13 && s.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
        return { value, ended: LINE_BREAK };
      }
      // What follows the closing quote is appended as it stands, up to the
      // next comma or line break.
      const junk = readUnquoted(value);
      if (junk.added > 0) error('quote_junk');
      return junk;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = s.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && s.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = s.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.slice(width) });
      fields.length = width;
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
