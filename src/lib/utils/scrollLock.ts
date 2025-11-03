/**
 * Scroll Lock Utility
 *
 * Prevents layout shift when locking body scroll by calculating and
 * compensating for scrollbar width.
 */

/**
 * Calculates the current scrollbar width and sets it as a CSS variable
 * @returns The scrollbar width in pixels
 */
function calculateScrollbarWidth(): number {
	const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
	document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
	return scrollbarWidth;
}

/**
 * Locks body scroll and prevents layout shift by compensating for scrollbar width
 */
export function lockScroll(): void {
	// Calculate scrollbar width before adding the class
	calculateScrollbarWidth();

	// Add the prevent-scroll class
	document.body.classList.add('prevent-scroll');
}

/**
 * Unlocks body scroll and removes scrollbar width compensation
 */
export function unlockScroll(): void {
	// Remove the prevent-scroll class
	document.body.classList.remove('prevent-scroll');

	// Clean up the CSS variable
	document.documentElement.style.removeProperty('--scrollbar-width');
}

/**
 * Returns whether scroll is currently locked
 */
export function isScrollLocked(): boolean {
	return document.body.classList.contains('prevent-scroll');
}
