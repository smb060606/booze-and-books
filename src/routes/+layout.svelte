<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { profile, profileStore } from '$lib/stores/profile';
	import { ProfileService } from '$lib/services/profileService';
	import { realtimeService } from '$lib/services/realtimeService';
	import NotificationBell from '../components/notifications/NotificationBell.svelte';
	import DashboardNav from '../components/dashboard/DashboardNav.svelte';
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { lockScroll, unlockScroll } from '$lib/utils/scrollLock';

	// Import mobile utilities
	import '$lib/styles/mobile-utilities.css';

	// Phase 3: Performance tracking and cache management
	import { initPerformanceTracking } from '$lib/utils/performance';
	import { initCacheCleanup, stopCacheCleanup } from '$lib/utils/cache';

	export let data: PageData;

	// Mobile menu state for public navigation
	let isMobileMenuOpen = false;

	// SEO defaults
	const siteName = 'Booze & Books';
	const baseUrl = 'https://boozeandbooks.me';
	const defaultTitle = 'Booze & Books — Swap books, discover cocktails';
	const defaultDescription = 'Swap books with locals, discover cocktails, and connect with readers.';
	const defaultImagePath = '/images/social-share.jpeg';
	const defaultImageAlt = 'Booze & Books social share image';
	const image = `${baseUrl}${defaultImagePath}`;
	$: url = $page?.url ? $page.url.href : baseUrl;

	// initialize store on client
	onMount(() => {
		auth.initialize(data.session);
		if (data.profile) {
			profile.set(data.profile);
		}

		// Phase 3: Initialize performance tracking and cache cleanup
		initPerformanceTracking();
		initCacheCleanup();
	});

	onDestroy(() => {
		auth.teardown();
		// Cleanup realtime subscriptions
		if (realtimeUnsubscribers) {
			realtimeUnsubscribers.unsubscribeNotifications();
			realtimeUnsubscribers.unsubscribeSwaps();
			realtimeUnsubscribers.unsubscribeBooks();
			realtimeUnsubscribers.unsubscribeConnection();
		}
		// Phase 3: Stop cache cleanup interval
		stopCacheCleanup();
		// Cleanup mobile menu
		if (browser) {
			unlockScroll();
		}
	});

	// Mobile menu functions for public navigation
	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	// Handle scroll lock when mobile menu opens/closes
	$: if (browser) {
		if (isMobileMenuOpen) {
			lockScroll();
		} else {
			unlockScroll();
		}
	}

	// Close menu when route changes
	$: if ($page.url.pathname) {
		isMobileMenuOpen = false;
	}

	// Realtime service cleanup functions
	let realtimeUnsubscribers: {
		unsubscribeNotifications: () => void;
		unsubscribeSwaps: () => void;
		unsubscribeBooks: () => void;
		unsubscribeConnection: () => void;
	} | null = null;

	// Initialize realtime services when user is available
	$: if (user && user.id && !realtimeUnsubscribers) {
		realtimeService.initializeForUser(user.id).then((unsubscribers) => {
			realtimeUnsubscribers = unsubscribers;
		});
	}

	// Cleanup realtime services on logout
	$: if (!user && realtimeUnsubscribers) {
		realtimeUnsubscribers.unsubscribeNotifications();
		realtimeUnsubscribers.unsubscribeSwaps();
		realtimeUnsubscribers.unsubscribeBooks();
		realtimeUnsubscribers.unsubscribeConnection();
		realtimeUnsubscribers = null;
	}

	// SSR-safe user reference
	$: user = data.user ?? $auth.user;
	$: avatarUrl = ProfileService.getAvatarUrl($profile?.avatar_url || null);
	$: initials = ProfileService.generateInitials(
		$profile?.full_name || null,
		$profile?.username || null,
		user?.email
	);
	
	// Check if we're on an /app route (which has its own layout with navigation)
	$: isAppRoute = $page.url.pathname.startsWith('/app');
</script>

<svelte:head>
	<title>{defaultTitle}</title>
	<meta name="description" content={defaultDescription} />
	<link rel="canonical" href={url} />

	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={defaultTitle} />
	<meta property="og:description" content={defaultDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:image" content={image} />
	<meta property="og:image:url" content={image} />
	<meta property="og:image:secure_url" content={image} />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={defaultImageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={defaultTitle} />
	<meta name="twitter:description" content={defaultDescription} />
	<meta name="twitter:image" content={image} />
</svelte:head>

<div id="app">
	{#if user && !isAppRoute}
		<!-- Show DashboardNav for authenticated users only on non-app routes (like homepage) -->
		<DashboardNav />
	{:else if !user}
		<!-- Show simple nav for non-authenticated users -->
		<nav class="main-nav">
			<div class="nav-brand">
				<a href="/" class="brand-link">
					📚 Booze & Books
				</a>
			</div>

			<!-- Mobile menu toggle button -->
			<button
				class="mobile-menu-toggle"
				on:click={toggleMobileMenu}
				aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={isMobileMenuOpen}
			>
				<svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if isMobileMenuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
					{/if}
				</svg>
			</button>

			<div class="nav-auth" class:mobile-menu-open={isMobileMenuOpen}>
				<a href="/docs" class="nav-link" on:click={closeMobileMenu}>Documentation</a>
				<a href="/auth/login" class="nav-link" on:click={closeMobileMenu}>Sign In</a>
				<a href="/auth/signup" class="nav-link primary" on:click={closeMobileMenu}>Sign Up</a>
			</div>
		</nav>
	{/if}
	
	<slot />
	
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: #f8f9fa;
		color: #212529;
	}

	#app {
		min-height: 100vh;
	}

	.main-nav {
		background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
		border-bottom: 1px solid rgba(212, 175, 55, 0.2);
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.3);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-brand {
		flex-shrink: 0;
		z-index: 101;
	}

	.brand-link {
		color: #F5F5DC;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 700;
		font-family: 'Georgia', serif;
		transition: all 0.2s ease;
		padding: 0.5rem;
		border-radius: 8px;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
	}

	.brand-link:hover {
		color: #D4AF37;
		background-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	/* Mobile menu toggle button */
	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		color: #F5F5DC;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		min-width: 44px;
		min-height: 44px;
		align-items: center;
		justify-content: center;
		z-index: 101;
	}

	.mobile-menu-toggle:hover {
		background: rgba(212, 175, 55, 0.2);
		color: #D4AF37;
	}

	.menu-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-profile-link {
		text-decoration: none;
		color: inherit;
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
	}

	.user-profile-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e2e8f0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		font-size: 14px;
		font-weight: 600;
		color: #4a5568;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.user-name {
		color: #FFF8DC;
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.user-email {
		color: #F5F5DC;
		font-size: 0.8rem;
		line-height: 1.2;
		opacity: 0.9;
	}

	.nav-auth {
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: transform 0.3s ease-in-out;
	}

	.nav-link {
		color: #F5F5DC;
		text-decoration: none;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-link:hover {
		background-color: rgba(212, 175, 55, 0.2);
		color: #D4AF37;
	}

	.nav-link.primary {
		background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
		color: #8B2635;
		font-weight: 600;
	}

	.nav-link.primary:hover {
		background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
		transform: translateY(-1px);
	}

	.logout-btn {
		background: none;
		border: 1px solid rgba(245, 245, 220, 0.3);
		color: #F5F5DC;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: rgba(212, 175, 55, 0.1);
		border-color: rgba(212, 175, 55, 0.5);
		color: #D4AF37;
	}

	:global(.container) {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	/* ========================================
	   MOBILE RESPONSIVENESS - PUBLIC NAV
	   ======================================== */

	/* Tablet and below - Show hamburger menu */
	@media (max-width: 768px) {
		.main-nav {
			padding: 1rem;
			position: relative;
		}

		/* Show mobile menu toggle */
		.mobile-menu-toggle {
			display: flex;
			order: 3;
		}

		/* Navigation items become mobile menu */
		.nav-auth {
			position: fixed;
			top: 0;
			right: 0;
			width: 280px;
			max-width: 85vw;
			height: 100vh;
			background: linear-gradient(135deg, #8B2635 0%, #722F37 100%);
			box-shadow: -4px 0 15px rgba(0, 0, 0, 0.3);
			flex-direction: column;
			gap: 0;
			padding: 5rem 0 2rem 0;
			transform: translateX(100%);
			transition: transform 0.3s ease-in-out;
			z-index: 100;
			border-left: 2px solid #D4AF37;
		}

		.nav-auth.mobile-menu-open {
			transform: translateX(0);
		}

		/* Mobile menu items */
		.nav-link {
			width: 100%;
			padding: 1rem 1.5rem;
			border-radius: 0;
			justify-content: flex-start;
			border-bottom: 1px solid rgba(212, 175, 55, 0.1);
			min-height: 48px;
			display: flex;
			align-items: center;
		}

		.nav-link:hover {
			transform: none;
			background: rgba(212, 175, 55, 0.15);
		}

		.nav-link.primary {
			background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
			color: #8B2635;
			font-weight: 600;
			margin: 1rem 1.5rem;
			width: calc(100% - 3rem);
			border-radius: 8px;
			justify-content: center;
		}

		.nav-link.primary:hover {
			background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
			transform: translateY(-1px);
		}

		.brand-link {
			font-size: 0.85rem;
		}
	}

	/* Small phones */
	@media (max-width: 480px) {
		.main-nav {
			padding: 0.75rem;
		}

		.brand-link {
			font-size: 0.75rem;
			padding: 0.375rem;
		}

		.nav-auth {
			width: 100%;
			max-width: 100vw;
		}

		.nav-link {
			padding: 0.875rem 1.25rem;
		}
	}

	/* Touch device optimizations */
	@media (hover: none) and (pointer: coarse) {
		.nav-link,
		.mobile-menu-toggle {
			min-height: 48px;
		}

		.mobile-menu-toggle {
			-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
		}
	}

	/* Reduce motion for accessibility */
	@media (prefers-reduced-motion: reduce) {
		.nav-auth {
			transition: none;
		}

		.nav-link,
		.mobile-menu-toggle,
		.brand-link {
			transition: none;
		}
	}
</style>
