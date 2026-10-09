export function companyFromCommand(value) {
  const text=value.trim().replace(/[.!?]+$/,'');
  const patterns=[/^(?:find|search)(?:\s+for)?\s+alumni(?:\s+who\s+work|\s+working)?\s+(?:at|in|from|for)\s+(.+?)(?:\s+and\s+(?:invite|send).*)?$/i,/^(?:find|search)\s+(.+?)\s+alumni(?:\s+and\s+.*)?$/i];
  for(const pattern of patterns){const match=text.match(pattern);if(match)return match[1].trim();}
  if(text && text.length<=100 && !/^(find|search|invite|send)\b/i.test(text))return text;
  return null;
}
