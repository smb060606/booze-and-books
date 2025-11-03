import { error } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import type { PageServerLoad } from './$types';

// Simple input sanitization for Phase 3 (can be enhanced later)
function sanitizeFilterInput(input: string): string {
	return input.trim().replace(/[<>'"]/g, '');
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.supabase) {
		throw error(401, 'Unauthorized');
	}

	// Use the recommended getUser() method instead of session
	const { data: { user }, error: userError } = await locals.supabase.auth.getUser();

	if (userError || !user) {
		throw error(401, 'Unauthorized');
	}

	const currentUserId = user.id;
	if (!currentUserId?.trim()) {
		throw error(401, 'Invalid user session - missing user ID');
	}

	// Phase 3 Optimization: Parse URL parameters for server-side filtering
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
	const genre = url.searchParams.get('genre') || undefined;
	const condition = url.searchParams.get('condition') || undefined;
	const search = url.searchParams.get('search') || undefined;
	const sortBy = (url.searchParams.get('sortBy') || 'created_at') as 'created_at' | 'title';
	const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

	// Validate and sanitize inputs
	const safePageSize = Math.min(Math.max(pageSize, 1), 100); // Max 100 books per page
	const safePage = Math.max(page, 1);
	const offset = (safePage - 1) * safePageSize;

	try {
		// Use the optimized discovery method with server-side filtering
		const { books: availableBooks, hasMore } = await BookServiceServer.getAvailableBooksForDiscoveryOptimized(
			locals.supabase,
			currentUserId,
			{
				limit: safePageSize,
				offset,
				genre: genre ? sanitizeFilterInput(genre) : undefined,
				condition: condition ? sanitizeFilterInput(condition) : undefined,
				search: search ? sanitizeFilterInput(search) : undefined,
				sortBy,
				sortOrder
			}
		);

		return {
			availableBooks,
			hasMore,
			currentPage: safePage,
			pageSize: safePageSize,
			filters: {
				genre: genre || null,
				condition: condition || null,
				search: search || null,
				sortBy,
				sortOrder
			}
		};
	} catch (err) {
		console.error('Error loading discovery page:', err);

		// Always return empty array instead of throwing errors
		// This prevents 500 errors and allows the page to load gracefully
		console.warn('Database error occurred, returning empty books for graceful fallback');
		return {
			availableBooks: [],
			hasMore: false,
			currentPage: 1,
			pageSize: safePageSize,
			filters: {
				genre: null,
				condition: null,
				search: null,
				sortBy: 'created_at' as const,
				sortOrder: 'desc' as const
			}
		};
	}
};