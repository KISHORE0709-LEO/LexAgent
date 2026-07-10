/**
 * Simple word-based diff utility for forensic legal analysis
 */
export const computeDiff = (oldStr = '', newStr = '') => {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const diff = [];
  let i = 0;
  let j = 0;

  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      diff.push({ type: 'unchanged', value: oldWords[i] });
      i++;
      j++;
    } else {
      // Look ahead to see if we can find a match later in the strings (Resync)
      let foundMatch = false;
      for (let lookAhead = 1; lookAhead < 10; lookAhead++) {
        if (i + lookAhead < oldWords.length && oldWords[i + lookAhead] === newWords[j]) {
          // Found a match in the old string later, so everything in between was removed
          for (let k = 0; k < lookAhead; k++) {
            diff.push({ type: 'removed', value: oldWords[i + k] });
          }
          i += lookAhead;
          foundMatch = true;
          break;
        }
        if (j + lookAhead < newWords.length && oldWords[i] === newWords[j + lookAhead]) {
          // Found a match in the new string later, so everything in between was added
          for (let k = 0; k < lookAhead; k++) {
            diff.push({ type: 'added', value: newWords[j + k] });
          }
          j += lookAhead;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        // No match found in lookahead, treat as a direct replacement
        if (i < oldWords.length) {
          diff.push({ type: 'removed', value: oldWords[i] });
          i++;
        }
        if (j < newWords.length) {
          diff.push({ type: 'added', value: newWords[j] });
          j++;
        }
      }
    }
  }

  return diff;
};
