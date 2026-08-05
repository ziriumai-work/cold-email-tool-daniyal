/**
 * Analyze subject line and body text for spam score & suggest optimizations
 */
export function analyzeSpamScore(subject = '', body = '') {
  let score = 0; // Lower is better (0 = clean, 100 = high spam risk)
  const suggestions = [];

  const textSubject = (subject || '').trim();
  const textBody = (body || '').replace(/<[^>]*>?/gm, '').trim();

  // 1. Subject Line Checks
  if (!textSubject) {
    score += 30;
    suggestions.push('Subject line is missing.');
  } else {
    if (textSubject === textSubject.toUpperCase() && textSubject.length > 5) {
      score += 25;
      suggestions.push('Subject line is ALL CAPS. Avoid excessive uppercase.');
    }
    if (textSubject.includes('!')) {
      score += 15;
      suggestions.push('Avoid exclamation marks in subject line.');
    }
    if (textSubject.length > 60) {
      score += 10;
      suggestions.push('Subject line is over 60 characters. Shorter subjects (< 40 chars) perform better.');
    }
  }

  // 2. High Risk Spam Words
  const highRiskWords = [
    'free', '100%', 'guarantee', 'risk free', 'click here', 'act now', 'urgent',
    'buy now', 'earn money', 'extra income', 'cash', 'winner', 'no catch', 'bonus',
    'double your', 'satisfaction guaranteed', 'unbelievable'
  ];

  const combinedText = (textSubject + ' ' + textBody).toLowerCase();
  const matchedSpamWords = [];

  highRiskWords.forEach((word) => {
    if (combinedText.includes(word)) {
      matchedSpamWords.push(word);
      score += 15;
    }
  });

  if (matchedSpamWords.length > 0) {
    suggestions.push(`Found potential spam trigger terms: "${matchedSpamWords.join(', ')}". Replace with conversational alternatives.`);
  }

  // 3. Link Ratio Check
  const urlCount = (textBody.match(/https?:\/\/[^\s]+/gi) || []).length;
  if (urlCount > 2) {
    score += 20;
    suggestions.push(`Body contains ${urlCount} links. Cold outreach emails should contain 0 to 1 clean links.`);
  }

  // 4. HTML / Text ratio check
  if (body.includes('<img') || body.includes('<iframe')) {
    score += 15;
    suggestions.push('Embedded images or iframes detected. Plain-text style emails have higher inbox delivery rates.');
  }

  // 5. Body Length
  const wordCount = textBody.split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    score += 10;
    suggestions.push('Email body is very short (< 20 words). Provide a clear, valuable context.');
  } else if (wordCount > 250) {
    score += 10;
    suggestions.push('Email body is long (> 250 words). Concise emails (50-125 words) get higher reply rates.');
  }

  // Normalize score 0-100
  score = Math.max(0, Math.min(100, score));

  let status = 'Clean';
  if (score >= 60) status = 'High Spam Risk';
  else if (score >= 30) status = 'Moderate Risk';

  if (suggestions.length === 0) {
    suggestions.push('Content is clean! Low risk of spam filtering.');
  }

  return {
    score,
    status,
    wordCount,
    linkCount: urlCount,
    suggestions
  };
}
