import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'chaintrust_visitor_id';

/**
 * Gets or creates a unique anonymous visitor ID for the current browser.
 * This is used to track unique scans without requiring an account.
 */
export const getVisitorId = (): string => {
	if (typeof window === 'undefined') {
		return ''; // Server-side rendering safe fallback
	}

	let visitorId = localStorage.getItem(VISITOR_ID_KEY);
	
	if (!visitorId) {
		visitorId = uuidv4();
		localStorage.setItem(VISITOR_ID_KEY, visitorId);
	}

	return visitorId;
};
