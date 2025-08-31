# Hidden Items Tracker

This file tracks all temporarily hidden elements in the Triniva AI platform.
These items have been hidden and can be easily restored by removing the specified CSS or inline styles.

## Hidden Items List

### 1. Model Selector in Chat Interface
**File:** `/public/css/style.css`
**Line:** 1108
**Change:** Added `display: none;` to `.custom-model-dropdown` class
**How to restore:** Remove `display: none; /* Temporarily hidden */` from line 1108

### 2. Available AI Models Section
**File:** `/public/important-info.html`
**Line:** 32
**Change:** Added inline style `style="display: none;"` to the section element
**How to restore:** Remove `style="display: none;"` and the comment `<!-- Temporarily hidden -->` from line 32

### 3. License Declaration Section
**File:** `/public/terms-conditions.html`
**Line:** 115
**Change:** Added inline style `style="display: none;"` to the section element  
**How to restore:** Remove `style="display: none;"` and the comment `<!-- Temporarily hidden -->` from line 115

## Quick Restore Commands

To quickly restore all hidden items, you can run these commands:

1. **Restore Model Selector:**
   - Edit `/public/css/style.css` line 1108
   - Remove: `display: none; /* Temporarily hidden */`

2. **Restore Available AI Models Section:**
   - Edit `/public/important-info.html` line 32
   - Change: `<section class="info-section" style="display: none;"><!-- Temporarily hidden -->`
   - To: `<section class="info-section">`

3. **Restore License Declaration Section:**
   - Edit `/public/terms-conditions.html` line 115
   - Change: `<section class="info-section" style="display: none;"><!-- Temporarily hidden -->`
   - To: `<section class="info-section">`

## Notes
- All changes are non-destructive and easily reversible
- The functionality remains intact, only the visibility is affected
- Hidden date: August 31, 2025