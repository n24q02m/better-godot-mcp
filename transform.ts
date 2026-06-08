/**
 * Transforms the [input] section of project.godot to add/remove actions or events
 */
function transformInputMap(
  content: string,
  targetAction: string,
  operation: 'add_event' | 'remove_action',
  eventObj?: string
): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inInputSection = false;
  let actionFound = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '[input]') {
      inInputSection = true;
      result.push(line);
      i++;
      continue;
    }

    if (inInputSection && trimmed.startsWith('[')) {
      inInputSection = false;
    }

    if (inInputSection) {
      // Check for action start
      // format: action_name={
      const actionStartMatch = trimmed.match(/^([^=]+)=\{/);
      if (actionStartMatch && actionStartMatch[1].trim() === targetAction) {
        actionFound = true;
        if (operation === 'remove_action') {
          // Skip this action block
          let blockEndFound = trimmed.endsWith('}');
          while (!blockEndFound && i < lines.length) {
            i++;
            if (i < lines.length && lines[i].trim().endsWith('}')) {
              blockEndFound = true;
            }
          }
          i++; // Skip the last line of the block
          continue;
        } else if (operation === 'add_event' && eventObj) {
          // Process this action block to find "events": [
          let blockLines: string[] = [];
          let blockEndFound = false;
          let eventsFound = false;

          while (i < lines.length && !blockEndFound) {
            let currentLine = lines[i];
            let currentTrimmed = currentLine.trim();

            if (!eventsFound && currentTrimmed.includes('"events":')) {
              eventsFound = true;
              if (currentTrimmed.includes('[') && currentTrimmed.includes(']')) {
                // Single line events array
                const openBracket = currentLine.indexOf('[');
                const closeBracket = currentLine.lastIndexOf(']');
                const before = currentLine.slice(0, closeBracket).trimEnd();
                const after = currentLine.slice(closeBracket);
                const existing = currentLine.slice(openBracket + 1, closeBracket).trim();
                const separator = existing ? ', ' : '';
                currentLine = `${before}${separator}${eventObj}${after}`;
              } else if (currentTrimmed.includes('[')) {
                // Multi-line events array starts
                // We'll append the event after the bracket or on a new line
                // For simplicity, let's look for the closing bracket in subsequent lines
                blockLines.push(currentLine);
                i++;
                while (i < lines.length) {
                   let nextLine = lines[i];
                   if (nextLine.trim().includes(']')) {
                     const closeBracket = nextLine.lastIndexOf(']');
                     const before = nextLine.slice(0, closeBracket).trimEnd();
                     const after = nextLine.slice(closeBracket);
                     const existing = before.trim();
                     const separator = existing && !existing.endsWith('[') ? ', ' : '';
                     blockLines.push(`${before}${separator}${eventObj}${after}`);
                     break;
                   }
                   blockLines.push(nextLine);
                   i++;
                }
                if (i < lines.length) {
                  if (lines[i].trim().endsWith('}')) blockEndFound = true;
                  i++;
                }
                continue;
              }
            }

            blockLines.push(currentLine);
            if (currentTrimmed.endsWith('}')) blockEndFound = true;
            i++;
          }

          result.push(...blockLines);
          continue;
        }
      }
    }

    result.push(line);
    i++;
  }

  if (!actionFound) {
    throw new GodotMCPError(`Action "${targetAction}" not found`, 'INPUT_ERROR', 'Check action name with list.');
  }

  return result.join('\n');
}
