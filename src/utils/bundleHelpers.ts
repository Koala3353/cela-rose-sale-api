import { Product } from '../types';

export interface BundleSlot {
    options: string[]; // Options for this slot (e.g. from "a/b")
    label: string;     // Display label "Select Option" or the single item name
    isFixed: boolean;  // True if only 1 option
}

/**
 * Parses a bundle string like "red-rose/pink-rose, chocolate" into a structured array
 */
export const parseBundleString = (bundleStr?: string): BundleSlot[] => {
    if (!bundleStr) return [];

    return bundleStr.split(',').map(part => {
        const cleanPart = part.trim();
        // Support quoted strings that might contain slashes inside them?
        // For now assuming slashes only separate options. 
        // User example: "blush + power..." is one option. "rose/carnation" is two.
        const options = cleanPart.split('/').map(opt => opt.trim()).filter(Boolean);

        if (options.length === 0) return null;

        return {
            options,
            label: options.length === 1 ? formatOptionName(options[0]) : 'Select Option',
            isFixed: options.length === 1
        };
    }).filter(Boolean) as BundleSlot[];
};

/**
 * Clean option name:
 * - Removes quotes if present (literal string).
 * - Formats "red-rose" -> "Red Rose".
 */
export const formatOptionName = (option: string): string => {
    let clean = option;

    // Explicitly check for quotes indicating literal string
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1);
        return clean; // Return literals as-is (just stripped)
    }

    return clean
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Checks if an option is a literal string (quoted)
 */
export const isLiteralOption = (option: string): boolean => {
    return (option.startsWith('"') && option.endsWith('"')) || (option.startsWith("'") && option.endsWith("'"));
};

/**
 * Checks if a specific product (by ID or name) is part of a bundle
 */
export const getRelatedBundles = (product: Product, allProducts: Product[]): Product[] => {
    if (!product.id && !product.name) return [];

    const productId = product.id.toLowerCase();
    return allProducts.filter(p =>
        p.category === 'Bundle' &&
        p.bundleItems &&
        (p.bundleItems.toLowerCase().includes(productId) ||
            p.bundleItems.toLowerCase().includes(product.name.toLowerCase()))
    );
};

/**
 * Finds a product that matches the selected option string (if it's not a literal)
 * Matches by ID or Name (case-insensitive)
 * NOTE: This function searches ALL products regardless of availability status.
 * This allows bundle options to display correct product names even for unavailable items.
 */
export const findProductForOption = (option: string, allProducts: Product[]): Product | undefined => {
    if (isLiteralOption(option)) return undefined; // Literals are never products

    const search = option.toLowerCase().trim();

    // Search all products regardless of availability
    return allProducts.find(p =>
        p.id.toLowerCase() === search ||
        p.name.toLowerCase() === search
    );
};

/**
 * Finds a product by ID or Name specifically, without filtering by availability.
 * Used for bundle option label display.
 */
export const findProductByIdOrName = (option: string, allProducts: Product[]): Product | undefined => {
    if (isLiteralOption(option)) return undefined;

    const search = option.toLowerCase().trim();

    return allProducts.find(p =>
        p.id.toLowerCase() === search ||
        p.name.toLowerCase() === search
    );
};

