const stopWords = new Set(['and','or','a','an','the','i','me','my','how','do','can','to','for','is','are','what','you','your','with','of','in','want','need','please','about']);
export function searchPages(pages, query) {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g)?.filter(t => !stopWords.has(t)) || [];
  if (!tokens.length) return [];
  return pages.map(page => {
    const title = page.title.toLowerCase();
    const words = `${title} ${page.terms} ${page.summary}`.toLowerCase();
    const matches = tokens.filter(t => words.includes(t));
    const score = matches.length * 5 + matches.filter(t => title.includes(t)).length * 2;
    return {...page, score};
  }).filter(page => page.score > 0).sort((a,b) => b.score-a.score).slice(0,5);
}
export function enquiryMessage(values) {
  const clean = (value, max) => String(value || '').trim().slice(0,max);
  return ['Hi Ammon, I’d like to discuss my plans.', '', `My plans: ${clean(values.goal,80) || 'Still exploring'}`, `Details: ${clean(values.details,700) || 'I’d appreciate some guidance.'}`, `Timing: ${clean(values.timing,150) || 'Flexible / still exploring'}`, ...(clean(values.question,700) ? [`My question: ${clean(values.question,700)}`] : [])].join('\n');
}
export const whatsappUrl = message => 'https://wa.me/6580989441?text=' + encodeURIComponent(message);
