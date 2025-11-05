<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BookCard from '../../../components/books/BookCard.svelte';
	import type { PageData } from './$types';
	import type { BookWithOwner } from '$lib/types/book';

	export let data: PageData;

	let searchQuery = data.filters.search || '';
	let selectedGenre = data.filters.genre || '';
	let selectedCondition = data.filters.condition || '';
	let isLoading = false;

	// Phase 3 Optimization: Server-side filtering via URL parameters
	$: availableBooks = data.availableBooks;
	$: currentPage = data.currentPage;
	$: hasMore = data.hasMore;
	$: pageSize = data.pageSize;

	// Get unique genres and conditions from server-provided filter options
	// This ensures all filter options are available regardless of current page
	$: uniqueGenres = data.filterOptions?.genres || [];
	$: uniqueConditions = data.filterOptions?.conditions || [];

	// Build URL with search params
	function buildFilterUrl(params: Record<string, string | number | null>) {
		const url = new URL($page.url);

		// Clear existing params
		url.search = '';

		// Add new params (skip null/empty values)
		Object.entries(params).forEach(([key, value]) => {
			if (value !== null && value !== '' && value !== undefined) {
				url.searchParams.set(key, String(value));
			}
		});

		return url.pathname + url.search;
	}

	// Apply filters by navigating to new URL (triggers server reload)
	async function applyFilters() {
		isLoading = true;
		try {
			const url = buildFilterUrl({
				search: searchQuery || null,
				genre: selectedGenre || null,
				condition: selectedCondition || null,
				page: 1, // Reset to first page on filter change
				pageSize
			});
			await goto(url, { replaceState: false, keepFocus: true });
		} finally {
			isLoading = false;
		}
	}

	// Handle search with debounce
	let searchTimeout: ReturnType<typeof setTimeout>;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters();
		}, 500); // 500ms debounce
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedGenre = '';
		selectedCondition = '';
		applyFilters();
	}

	// Pagination handlers
	async function goToPage(newPage: number) {
		isLoading = true;
		try {
			const url = buildFilterUrl({
				search: searchQuery || null,
				genre: selectedGenre || null,
				condition: selectedCondition || null,
				page: newPage,
				pageSize
			});
			await goto(url, { replaceState: false, keepFocus: true });
			// Scroll to top of results after successful navigation
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} finally {
			isLoading = false;
		}
	}

	function nextPage() {
		if (hasMore) {
			goToPage(currentPage + 1);
		}
	}

	function previousPage() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}

	onMount(() => {
		document.title = 'Discover Books - Booze & Books';
	});
</script>

<style>
	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
		}
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		color: #2d3748;
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		line-height: 1.2;
	}

	.page-subtitle {
		color: #718096;
		font-size: 1rem;
		margin: 0;
	}

	/* Filters Section */
	.filters-section {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.filters-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
	}

	.search-container {
		margin-bottom: 1.5rem;
	}

	.search-input-wrapper {
		position: relative;
		max-width: 400px;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		color: #9ca3af;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #f8f9fa;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.search-input::placeholder {
		color: #9ca3af;
	}

	.filters-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1rem;
		align-items: end;
	}

	@media (max-width: 768px) {
		.filters-row {
			grid-template-columns: 1fr;
		}
	}

	.filter-group {
		display: flex;
		flex-direction: column;
	}

	.filter-label {
		color: #374151;
		font-size: 0.9rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.filter-select {
		padding: 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.95rem;
		background: #f8f9fa;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.filter-select:focus {
		outline: none;
		border-color: #8B2635;
		background: white;
		box-shadow: 0 0 0 3px rgba(139, 38, 53, 0.1);
	}

	.btn-clear {
		padding: 0.75rem 1.5rem;
		background: #f8f9fa;
		color: #8B2635;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-clear:hover {
		background: #F5F5DC;
		border-color: #8B2635;
		color: #722F37;
	}

	.btn-clear:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Results Header */
	.results-header {
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.results-count {
		color: #718096;
		font-size: 0.9rem;
		margin: 0;
	}

	.results-count strong {
		color: #2d3748;
		font-weight: 600;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pagination-btn {
		padding: 0.5rem 1rem;
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: #f8f9fa;
		border-color: #8B2635;
		color: #8B2635;
	}

	.pagination-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-info {
		color: #718096;
		font-size: 0.9rem;
		padding: 0 0.5rem;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: #9ca3af;
		margin: 0 auto 1rem;
	}

	.empty-title {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.empty-subtitle {
		color: #718096;
		font-size: 0.95rem;
		margin: 0 0 1.5rem 0;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	/* Loading overlay */
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.loading-spinner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid #e2e8f0;
		border-top-color: #8B2635;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Grid */
	.books-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 2rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 640px) {
		.books-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}

	/* Utility classes */
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (min-width: 640px) {
		.container {
			padding: 2rem 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		.container {
			padding: 2rem 2rem;
		}
	}
</style>

<svelte:head>
	<title>Discover Books - Booze & Books</title>
	<meta name="description" content="Discover books available for swap from other readers" />
</svelte:head>

{#if isLoading}
	<div class="loading-overlay">
		<div class="loading-spinner">
			<div class="spinner"></div>
			<span>Loading books...</span>
		</div>
	</div>
{/if}

<div class="container">
	<!-- Header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Discover Books</h1>
			<p class="page-subtitle">
				Find books available for swap from other readers
			</p>
		</div>
	</div>

	<!-- Filters Section -->
	<div class="filters-section">
		<h2 class="filters-title">Filter Books</h2>

		<!-- Search -->
		<div class="search-container">
			<div class="search-input-wrapper">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
				</svg>
				<input
					id="search"
					type="text"
					bind:value={searchQuery}
					on:input={handleSearchInput}
					class="search-input"
					placeholder="Search by title or genre..."
				/>
			</div>
		</div>

		<!-- Filters Row -->
		<div class="filters-row">
			<!-- Genre Filter -->
			<div class="filter-group">
				<label for="genre" class="filter-label">Genre</label>
				<select
					id="genre"
					bind:value={selectedGenre}
					on:change={applyFilters}
					class="filter-select"
				>
					<option value="">All Genres</option>
					{#each uniqueGenres as genre}
						<option value={genre}>{genre}</option>
					{/each}
				</select>
			</div>

			<!-- Condition Filter -->
			<div class="filter-group">
				<label for="condition" class="filter-label">Condition</label>
				<select
					id="condition"
					bind:value={selectedCondition}
					on:change={applyFilters}
					class="filter-select"
				>
					<option value="">All Conditions</option>
					{#each uniqueConditions as condition}
						<option value={condition}>{condition.replace(/_/g, ' ')}</option>
					{/each}
				</select>
			</div>

			<!-- Clear Filters -->
			<button
				type="button"
				on:click={clearFilters}
				class="btn-clear"
				disabled={!searchQuery && !selectedGenre && !selectedCondition}
			>
				Clear Filters
			</button>
		</div>
	</div>

	<!-- Results Header with Pagination -->
	<div class="results-header">
		<p class="results-count">
			<strong>{availableBooks.length}</strong> book{availableBooks.length !== 1 ? 's' : ''} on this page
			{#if hasMore}
				<span class="text-gray-500">• More available</span>
			{/if}
		</p>

		<!-- Pagination Controls -->
		{#if currentPage > 1 || hasMore}
			<div class="pagination">
				<button
					type="button"
					class="pagination-btn"
					on:click={previousPage}
					disabled={currentPage <= 1 || isLoading}
				>
					← Previous
				</button>
				<span class="pagination-info">Page {currentPage}</span>
				<button
					type="button"
					class="pagination-btn"
					on:click={nextPage}
					disabled={!hasMore || isLoading}
				>
					Next →
				</button>
			</div>
		{/if}
	</div>

	<!-- Books Grid -->
	{#if availableBooks.length === 0}
		<div class="empty-state">
			<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
			</svg>
			<h3 class="empty-title">No books found</h3>
			<p class="empty-subtitle">
				{#if searchQuery || selectedGenre || selectedCondition}
					Try adjusting your search or filters to find more books.
				{:else}
					No books are currently available for swap.
				{/if}
			</p>
			{#if searchQuery || selectedGenre || selectedCondition}
				<button type="button" class="btn-clear" on:click={clearFilters}>
					Clear all filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="books-grid">
			{#each availableBooks as book (book.id)}
				<BookCard
					{book}
					showActions={true}
					showOwner={true}
					enableSwapRequests={true}
				/>
			{/each}
		</div>

		<!-- Bottom Pagination -->
		{#if currentPage > 1 || hasMore}
			<div class="pagination" style="justify-content: center; margin-top: 2rem;">
				<button
					type="button"
					class="pagination-btn"
					on:click={previousPage}
					disabled={currentPage <= 1 || isLoading}
				>
					← Previous
				</button>
				<span class="pagination-info">Page {currentPage}</span>
				<button
					type="button"
					class="pagination-btn"
					on:click={nextPage}
					disabled={!hasMore || isLoading}
				>
					Next →
				</button>
			</div>
		{/if}
	{/if}
</div>
