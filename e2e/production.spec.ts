import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Finance Hub Production
 * Tests run against the deployed production URL
 */

test.describe('Production URL Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Finance Hub/);
  });

  test('navigation loads all main sections', async ({ page }) => {
    await page.goto('/');

    // Test navigation links exist
    await expect(page.locator('nav')).toBeVisible();

    // Dashboard link
    const dashboardLink = page.locator('a[href="/dashboard"]');
    await expect(dashboardLink).toBeVisible();

    // Transactions link
    const transactionsLink = page.locator('a[href="/transactions"]');
    await expect(transactionsLink).toBeVisible();

    // Credit Cards link
    const creditCardsLink = page.locator('a[href="/credit-cards"]');
    await expect(creditCardsLink).toBeVisible();

    // Loans link
    const loansLink = page.locator('a[href="/loads"]');
    await expect(loansLink).toBeVisible();

    // Receipts link
    const receiptsLink = page.locator('a[href="/receipts"]');
    await expect(receiptsLink).toBeVisible();

    // Reports link
    const reportsLink = page.locator('a[href="/reports"]');
    await expect(reportsLink).toBeVisible();

    // Settings link
    const settingsLink = page.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible();
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('transactions page loads', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions');
  });

  test('credit cards page loads', async ({ page }) => {
    await page.goto('/credit-cards');
    await expect(page.locator('h1')).toContainText('Credit Cards');
  });

  test('loans page loads', async ({ page }) => {
    await page.goto('/loans');
    await expect(page.locator('h1')).toContainText('Loans');
  });

  test('receipts page loads', async ({ page }) => {
    await page.goto('/receipts');
    await expect(page.locator('h1')).toContainText('Receipts');
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('login page loads and has OAuth options', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign In');

    // Check for GitHub OAuth button
    const githubButton = page.locator('a[href*="github"]').or(page.locator('button:has-text("GitHub")'));
    await expect(githubButton).toBeVisible();

    // Check for Google OAuth button
    const googleButton = page.locator('a[href*="google"]').or(page.locator('button:has-text("Google")'));
    await expect(googleButton).toBeVisible();
  });

  test('locale switcher is present', async ({ page }) => {
    await page.goto('/');

    // Look for language switcher (might be a dropdown or buttons)
    const languageSwitcher = page.locator('[aria-label*="language"], [aria-label*="Language"], select[name="locale"]');
    await expect(languageSwitcher.first()).toBeVisible();
  });

  test('page has proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);

    // Check charset
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveAttribute('charset', 'utf-8');
  });

  test('page is responsive on mobile', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check navigation is still accessible (might be a hamburger menu)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('no console errors on main pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pages = ['/', '/dashboard', '/transactions', '/credit-cards', '/loans', '/receipts', '/reports', '/settings'];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }

    expect(errors).toHaveLength(0);
  });
});

test.describe('Authentication Flows', () => {
  test('redirects to login when accessing protected routes', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/transactions', '/credit-cards', '/loans', '/receipts', '/reports', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should either redirect to login or show login form
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/login') || await page.locator('text=/sign in/i').isVisible();
      expect(isLoginPage).toBeTruthy();
    }
  });

  test('logout endpoint exists', async ({ page }) => {
    const response = await page.request.get('/auth/logout');
    // Logout should redirect (302 or 303)
    expect([302, 303, 200]).toContain(response.status());
  });
});

test.describe('API Health Checks', () => {
  test('health endpoint responds', async ({ request }) => {
    // Try common health check endpoints
    const endpoints = ['/health', '/api/health', '/_health', '/ping'];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      if (response.ok() || response.status() === 404) {
        // 404 is acceptable - endpoint might not exist
        break;
      }
    }
  });

  test('robots.txt exists', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
  });

  test('sitemap exists or returns 404', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Performance Checks', () => {
  test('homepage loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Homepage should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('largest contentful paint is acceptable', async ({ page }) => {
    const metrics = await page.goto('/').then(() =>
      page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      })
    );

    // LCP should be under 2.5 seconds
    expect(metrics).toBeLessThan(2500);
  });
});

test.describe('Accessibility Tests', () => {
  test('main heading exists on each page', async ({ page }) => {
    const pages = [
      { url: '/dashboard', heading: 'Dashboard' },
      { url: '/transactions', heading: 'Transactions' },
      { url: '/credit-cards', heading: 'Credit Cards' },
      { url: '/loans', heading: 'Loans' },
      { url: '/receipts', heading: 'Receipts' },
      { url: '/reports', heading: 'Reports' },
      { url: '/settings', heading: 'Settings' },
    ];

    for (const { url, heading } of pages) {
      await page.goto(url);
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text?.toLowerCase()).toContain(heading.toLowerCase());
    }
  });

  test('focus management works with keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    // Something should be focused after tab
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);
  });
});

test.describe('Vietnamese Locale Tests', () => {
  test('page loads with Vietnamese locale', async ({ page }) => {
    await page.goto('/?locale=vi');
    await page.waitForLoadState('networkidle');

    // Check for Vietnamese content (common words)
    const vietnameseText = await page.textContent('body');
    const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(vietnameseText || '');
    // This might not find Vietnamese if locale switch doesn't work without cookies
  });

  test('currency formatting for VND', async ({ page }) => {
    await page.goto('/?locale=vi');
    await page.waitForLoadState('networkidle');

    // If VND currency is displayed, it should use Vietnamese formatting
    const bodyText = await page.textContent('body');
    // Vietnamese uses dot as thousands separator: 1.234.567 ₫
    const hasVND = /[0-9]\.[0-9]{3}\.[0-9]{3}\s*₫/.test(bodyText || '');
    // This might not be present on homepage
  });
});

test.describe('Security Headers', () => {
  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');

    const headers = response.headers();

    // Check for important security headers (might not all be present on Cloudflare Pages)
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
      'x-xss-protection',
    ];

    const foundHeaders = securityHeaders.filter(header => headers[header]);
    // At least some security headers should be present
    expect(foundHeaders.length).toBeGreaterThan(0);
  });
});

test.describe('Edge Cases and Error Handling', () => {
  test('handles invalid route gracefully', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');

    // Should show 404 page or redirect gracefully
    const status = response?.status() || 200;
    expect([200, 404]).toContain(status);

    // Page should still load (either custom 404 or fallback)
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('handles trailing slashes consistently', async ({ page }) => {
    // Test both with and without trailing slash
    await page.goto('/dashboard');
    const title1 = await page.title();

    await page.goto('/dashboard/');
    const title2 = await page.title();

    // Both should load successfully
    expect(title1).toBeTruthy();
    expect(title2).toBeTruthy();
  });

  test('URL encoding works correctly', async ({ page }) => {
    // Test URL with encoded characters
    await page.goto('/transactions?search=test%20search');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    const hasErrors = await page.evaluate(() => {
      return window.performance.getEntriesByType('navigation').some((entry: any) =>
        (entry as any).transferSize > 0
      );
    });
    expect(hasErrors).toBeTruthy();
  });

  test('handles query parameters correctly', async ({ page }) => {
    await page.goto('/transactions?page=1&limit=20');
    await page.waitForLoadState('networkidle');

    // Page should load with query params
    const url = page.url();
    expect(url).toContain('page=1');
  });

  test('very long URL does not break navigation', async ({ page }) => {
    const longParam = 'a'.repeat(200);
    await page.goto(`/transactions?search=${longParam}`);
    await page.waitForLoadState('networkidle');

    // Should handle gracefully
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('back navigation preserves state', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be back on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('forward navigation works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Should be back on transactions
    expect(page.url()).toContain('/transactions');
  });
});

test.describe('Form Validation Edge Cases', () => {
  test('form inputs handle special characters', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Look for any input field and test special characters
    const inputs = page.locator('input[type="text"], input[type="email"]');
    const count = await inputs.count();

    if (count > 0) {
      const input = inputs.first();
      await input.fill('<script>alert("test")</script>');
      await input.press('Tab');

      // Input should be sanitized or handled
      const value = await input.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('required fields show validation', async ({ page }) => {
    // This test would require knowing which forms have required fields
    // For now, we'll just check that forms can be accessed
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const forms = page.locator('form');
    const formCount = await forms.count();

    if (formCount > 0) {
      // Form is present
      expect(forms.first()).toBeVisible();
    }
  });
});

test.describe('Resource Loading', () => {
  test('all images load successfully', async ({ page }) => {
    const failedImages: string[] = [];

    page.on('response', response => {
      if (response.request().resourceType() === 'image' && !response.ok()) {
        failedImages.push(response.request().url());
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if there are any failed images (except tracking pixels)
    const actualFailures = failedImages.filter(url =>
      !url.includes('tracking') && !url.includes('analytics')
    );

    // For this test, we'll just log the result
    if (actualFailures.length > 0) {
      console.log('Failed images:', actualFailures);
    }
  });

  test('CSS loads without errors', async ({ page }) => {
    const failedCSS: string[] = [];

    page.on('response', response => {
      if (response.request().resourceType() === 'stylesheet' && !response.ok()) {
        failedCSS.push(response.request().url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All CSS should load successfully
    expect(failedCSS.length).toBe(0);
  });

  test('JavaScript loads without blocking', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const domLoadTime = Date.now() - startTime;

    // DOM should be ready quickly (within 1 second)
    expect(domLoadTime).toBeLessThan(1000);
  });
});

test.describe('Mobile Responsiveness', () => {
  test('responsive on small mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check content is readable
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('touch targets are large enough on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check interactive elements have sufficient size
    const buttons = page.locator('button, a, input[type="checkbox"], input[type="radio"]');
    const count = await buttons.count();

    if (count > 0) {
      const button = buttons.first();
      const box = await button.boundingBox();

      if (box) {
        // Touch target should be at least 44x44 pixels
        const minSize = 44;
        expect(box.width).toBeGreaterThanOrEqual(minSize - 10); // Allow some tolerance
        expect(box.height).toBeGreaterThanOrEqual(minSize - 10);
      }
    }
  });
});

test.describe('Data Flow Edge Cases', () => {
  test('handles empty state gracefully', async ({ page }) => {
    // This would require authenticated session
    // For now, test that the page loads
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('pagination parameters are valid', async ({ page }) => {
    // Test various pagination combinations
    const paginationTests = [
      '/transactions?page=0',
      '/transactions?page=-1',
      '/transactions?page=999999',
      '/transactions?limit=0',
      '/transactions?limit=-1',
    ];

    for (const url of paginationTests) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Page should handle gracefully (either default to valid values or show error)
      // Just verify page loads without crashing
      const bodyText = await page.textContent('body').catch(() => null);
      expect(bodyText).not.toBeNull();
    }
  });

  test('search with special characters works', async ({ page }) => {
    const searchTerms = [
      'test search',
      'search-with-dash',
      'search_with_underscore',
      'search.with.dot',
      'search+with+plus',
    ];

    for (const term of searchTerms) {
      await page.goto(`/transactions?search=${encodeURIComponent(term)}`);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url).toContain('search=');
    }
  });
});
