export function cardLine(icon: string, label: string, value: string) {
  return `${icon} ${label}: ${value}`;
}

export function cardNote(text: string) {
  return `⚠️ ${text}`;
}

export function renderCard(
  title: string,
  lines: Array<string | undefined>,
  footer?: Array<string | undefined>,
) {
  const content = [title, '', ...lines.filter(Boolean)];

  const normalizedFooter = footer?.filter(Boolean) ?? [];
  if (normalizedFooter.length > 0) {
    content.push('', ...normalizedFooter);
  }

  return content.join('\n');
}
