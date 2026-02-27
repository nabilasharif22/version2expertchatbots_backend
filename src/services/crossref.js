
import axios from 'axios';
import { logger } from '../utils/logger.js';

const CROSSREF_API = 'https://api.crossref.org/works';

export async function validateScientistHasPublications(authorName) {
  try {
    const url = `${CROSSREF_API}?query.author=${encodeURIComponent(authorName)}&rows=1`;
    const { data } = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'scientist-debate-app/0.1 (mailto:you@example.com)',
        Accept: 'application/json',
      },
    });

    const total = data?.message?.['total-results'] ?? 0;
    logger.info({ authorName, total }, 'CrossRef validation result');
    return total > 0;
  } catch (err) {
    logger.warn({ err, authorName }, 'CrossRef validation failed (network or API issue)');
    return false;
  }
}
