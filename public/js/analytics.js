// Vercel Analytics Integration
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
export function initAnalytics() {
    try {
        // Inject analytics with configuration
        inject({
            mode: 'production',
            beforeSend: (event) => {
                // You can filter or modify events here if needed
                return event;
            }
        });

        console.log('Vercel Analytics initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Vercel Analytics:', error);
    }
}

// Auto-initialize when the script loads
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }
}