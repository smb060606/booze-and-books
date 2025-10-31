<script lang="ts">
	import { page } from '$app/stores';
	import { pendingSwapCounts } from '$lib/stores/swaps';
	import { auth } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { ProfileService } from '$lib/services/profileService';
	import NotificationBell from '../notifications/NotificationBell.svelte';

	$: user = $auth.user;
	$: avatarUrl = ProfileService.getAvatarUrl($profile?.avatar_url || null);
	$: initials = ProfileService.generateInitials(
		$profile?.full_name || null,
		$profile?.username || null,
		user?.email
	);

	// Mobile menu state
	let isMobileMenuOpen = false;

	// Close mobile menu when route changes
	$: if ($page.url.pathname) {
		isMobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const nav = document.querySelector('.horizontal-nav');
		if (isMobileMenuOpen && nav && !nav.contains(target)) {
			isMobileMenuOpen = false;
		}
	}

	$: navItems = [
		{
			name: 'Dashboard',
			href: '/app',
			icon: 'home'
		},
		{
			name: 'My Books',
			href: '/app/books',
			icon: 'book'
		},
		{
			name: 'Discover Books',
			href: '/app/discover',
			icon: 'search'
		},
		{
			name: 'Cocktails',
			href: '/app/cocktails',
			icon: 'cocktail'
		},
		{
			name: 'Swap Requests',
			href: '/app/swaps',
			icon: 'exchange',
			badgeCount: $pendingSwapCounts.incoming
		},
		{
			name: 'Documentation',
			href: '/docs',
			icon: 'book'
		}
	];

	const icons: Record<string, string> = {
		home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>`,
		user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>`,
		book: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>`,
		search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>`,
		cocktail: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16L12 12 4 4z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12v6"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21h8"></path>`,
		exchange: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>`,
		settings: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>`,
		menu: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>`,
		close: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`
	};

	$: currentPath = $page.url.pathname;
</script>

<svelte:window on:click={handleClickOutside} />

<nav class="horizontal-nav">
	<div class="nav-container">
		<div class="nav-brand">
			<a href="/" class="brand-link">
				<h1 class="brand-title">📚 Booze & Books</h1>
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
				{@html isMobileMenuOpen ? icons.close : icons.menu}
			</svg>
		</button>

		<!-- Desktop notification bell and avatar (visible on desktop) -->
		<div class="desktop-user-actions">
			{#if user}
				<NotificationBell />
				<a href="/app/profile" class="nav-link profile-link" title="Profile">
					<div class="user-avatar">
						{#if avatarUrl}
							<img src={avatarUrl} alt="Profile" class="avatar-img" />
						{:else}
							<div class="avatar-placeholder">{initials}</div>
						{/if}
					</div>
				</a>
			{/if}
		</div>

		<!-- Navigation items (desktop + mobile menu) -->
		<ul class="nav-items" class:mobile-menu-open={isMobileMenuOpen}>
			{#each navItems as item}
				<li class="nav-item">
					<a
						href={item.href}
						class="nav-link {
							currentPath === item.href ||
							(item.href === '/app/books' && currentPath.startsWith('/app/books')) ||
							(item.href === '/app/discover' && currentPath.startsWith('/app/discover')) ||
							(item.href === '/app/swaps' && currentPath.startsWith('/app/swaps')) ||
							(item.href === '/app/cocktails' && currentPath.startsWith('/app/cocktails'))
								? 'active'
								: ''
						}"
						on:click={closeMobileMenu}
					>
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							{@html icons[item.icon]}
						</svg>
						<span class="nav-text">{item.name}</span>
						{#if item.badgeCount && item.badgeCount > 0}
							<span class="nav-badge">
								{item.badgeCount}
							</span>
						{/if}
					</a>
				</li>
			{/each}

			<!-- User Profile, Notifications, and Sign Out (mobile menu only) -->
			{#if user}
				<li class="nav-item mobile-only">
					<NotificationBell />
				</li>
				<li class="nav-item mobile-only">
					<a href="/app/profile" class="nav-link profile-link" title="Profile" on:click={closeMobileMenu}>
						<div class="user-avatar">
							{#if avatarUrl}
								<img src={avatarUrl} alt="Profile" class="avatar-img" />
							{:else}
								<div class="avatar-placeholder">{initials}</div>
							{/if}
						</div>
						<span class="nav-text">Profile</span>
					</a>
				</li>
				<li class="nav-item mobile-only">
					<form method="POST" action="/auth/logout" style="display: inline; width: 100%;">
						<button type="submit" class="nav-link logout-btn">
							<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
							</svg>
							<span class="nav-text">Sign Out</span>
						</button>
					</form>
				</li>
			{/if}
		</ul>
	</div>
</nav>

<style>
	/* Books & Booze Theme Colors */
	:global(:root) {
		--primary-burgundy: #8B2635;
		--secondary-gold: #D4AF37;
		--accent-cream: #F5F5DC;
		--warm-brown: #8B4513;
		--deep-red: #722F37;
		--light-cream: #FFF8DC;
	}

	.horizontal-nav {
		background: linear-gradient(135deg, var(--primary-burgundy) 0%, var(--deep-red) 100%);
		box-shadow: 0 2px 8px rgba(139, 38, 53, 0.3);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2rem;
		height: 4rem;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		min-width: fit-content;
		margin-right: 2rem;
	}

	.brand-link {
		text-decoration: none;
		color: inherit;
		transition: all 0.3s ease;
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.brand-link:hover {
		background: rgba(212, 175, 55, 0.2);
		transform: translateY(-1px);
	}

	.brand-title {
		color: var(--accent-cream);
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		margin: 0;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
		white-space: nowrap;
	}

	.brand-link:hover .brand-title {
		color: var(--secondary-gold);
	}

	.nav-items {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-item {
		position: relative;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		color: var(--light-cream);
		text-decoration: none;
		border-radius: 0.5rem;
		transition: all 0.3s ease;
		font-weight: 500;
		position: relative;
		overflow: hidden;
	}

	.nav-link:hover {
		background: rgba(212, 175, 55, 0.2);
		color: var(--secondary-gold);
		transform: translateY(-1px);
	}

	.nav-link.active {
		background: var(--secondary-gold);
		color: var(--primary-burgundy);
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(212, 175, 55, 0.4);
	}

	.nav-link.active:hover {
		background: var(--secondary-gold);
		color: var(--primary-burgundy);
		transform: translateY(-1px);
	}

	.nav-icon {
		width: 1.25rem !important;
		height: 1.25rem !important;
		min-width: 1.25rem !important;
		min-height: 1.25rem !important;
		max-width: 1.25rem !important;
		max-height: 1.25rem !important;
		flex-shrink: 0;
	}

	.nav-text {
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.nav-badge {
		background: #dc2626;
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		min-width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Profile Avatar Styles */
	.profile-link {
		position: relative;
	}

	.profile-link.active,
	.profile-link:hover {
		background: rgba(212, 175, 55, 0.2);
		color: var(--secondary-gold);
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-cream);
		border: 2px solid var(--secondary-gold);
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary-burgundy);
	}

	/* Logout Button Styles */
	.logout-btn {
		background: none;
		border: 1px solid rgba(245, 245, 220, 0.3);
		color: var(--light-cream);
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.3s ease;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logout-btn:hover {
		background: rgba(220, 38, 38, 0.2);
		border-color: rgba(220, 38, 38, 0.5);
		color: #fca5a5;
		transform: translateY(-1px);
	}

	/* Mobile menu toggle button */
	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		color: var(--accent-cream);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		min-width: 44px;
		min-height: 44px;
		align-items: center;
		justify-content: center;
	}

	.mobile-menu-toggle:hover {
		background: rgba(212, 175, 55, 0.2);
		color: var(--secondary-gold);
	}

	.menu-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	/* Desktop user actions (hidden on mobile) */
	.desktop-user-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Mobile-only items (hidden on desktop) */
	.mobile-only {
		display: none;
	}

	/* ========================================
	   RESPONSIVE DESIGN
	   ======================================== */

	/* Tablet and below - Show hamburger menu */
	@media (max-width: 768px) {
		.nav-container {
			padding: 0 1rem;
			position: relative;
		}

		/* Show mobile menu toggle */
		.mobile-menu-toggle {
			display: flex;
			order: 3;
		}

		/* Hide desktop user actions */
		.desktop-user-actions {
			display: none;
		}

		/* Navigation items become mobile menu */
		.nav-items {
			position: fixed;
			top: 4rem;
			right: 0;
			width: 280px;
			max-width: 85vw;
			background: linear-gradient(135deg, var(--primary-burgundy) 0%, var(--deep-red) 100%);
			box-shadow: -4px 0 15px rgba(0, 0, 0, 0.3);
			flex-direction: column;
			gap: 0;
			padding: 1rem 0;
			transform: translateX(100%);
			transition: transform 0.3s ease-in-out;
			z-index: 1000;
			max-height: calc(100vh - 4rem);
			overflow-y: auto;
			border-left: 2px solid var(--secondary-gold);
		}

		.nav-items.mobile-menu-open {
			transform: translateX(0);
		}

		/* Mobile menu items */
		.nav-item {
			width: 100%;
		}

		.nav-link {
			width: 100%;
			padding: 1rem 1.5rem;
			border-radius: 0;
			justify-content: flex-start;
			gap: 1rem;
			border-bottom: 1px solid rgba(212, 175, 55, 0.1);
			min-height: 48px;
		}

		.nav-link:hover {
			transform: none;
			background: rgba(212, 175, 55, 0.15);
		}

		.nav-link.active {
			border-left: 4px solid var(--secondary-gold);
			background: rgba(212, 175, 55, 0.2);
		}

		.nav-text {
			display: inline;
			font-size: 1rem;
		}

		/* Show mobile-only items */
		.mobile-only {
			display: block;
			border-top: 2px solid var(--secondary-gold);
			margin-top: 0.5rem;
			padding-top: 0.5rem;
		}

		.mobile-only:first-of-type {
			margin-top: 0.5rem;
		}

		.logout-btn {
			width: 100%;
			justify-content: flex-start;
			text-align: left;
			border: none;
			border-bottom: 1px solid rgba(212, 175, 55, 0.1);
		}

		.brand-title {
			font-size: 0.85rem;
		}

		.nav-badge {
			margin-left: auto;
		}
	}

	/* Small phones */
	@media (max-width: 480px) {
		.nav-container {
			padding: 0 0.75rem;
			height: 3.5rem;
		}

		.brand-title {
			font-size: 0.75rem;
		}

		.nav-items {
			width: 100%;
			max-width: 100vw;
			top: 3.5rem;
		}

		.nav-link {
			padding: 0.875rem 1.25rem;
		}
	}

	/* Accessibility: Prevent body scroll when mobile menu is open */
	:global(body:has(.nav-items.mobile-menu-open)) {
		overflow: hidden;
	}

	/* Reduce motion for accessibility */
	@media (prefers-reduced-motion: reduce) {
		.nav-items {
			transition: none;
		}

		.nav-link,
		.mobile-menu-toggle,
		.brand-link {
			transition: none;
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
</style>
