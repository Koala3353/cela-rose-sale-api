import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { parseBundleString, formatOptionName, findProductForOption, isLiteralOption } from '../utils/bundleHelpers';

interface BundleConfiguratorProps {
    product: Product;
    allProducts: Product[];
    onConfigChange: (isValid: boolean, selectedOptions: { [key: string]: string }, bundleDetailsString: string) => void;
}

const BundleConfigurator: React.FC<BundleConfiguratorProps> = ({ product, allProducts, onConfigChange }) => {
    // Stores selections flattened by path: "0", "0.1", "1", "1.0", etc.
    // "0" = first slot of main bundle
    // "0.1" = second slot of the bundle product selected in "0"
    const [selections, setSelections] = useState<{ [key: string]: string }>({});

    // Helper to get display label (Product Name if found, otherwise formatted string)
    const getOptionLabel = (option: string) => {
        const p = findProductForOption(option, allProducts);
        return p ? p.name : formatOptionName(option);
    };

    // Calculate validity and generate flat string whenever selections change
    useEffect(() => {
        // We'll traverse the structure to validate
        // This is a simplified validation: it checks if we have a selection for visible slots
        // But visibility depends on upper selections.

        let isValid = true;
        let detailsParts: string[] = [];

        // Helper to validate and collect details recursively
        const validateLevel = (bundleStr: string, parentPath: string): boolean => {
            const slots = parseBundleString(bundleStr);
            let levelValid = true;

            slots.forEach((slot, index) => {
                const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;
                const selected = selections[currentPath];

                if (slot.isFixed) {
                    // Fixed slots are auto-valid (though we might not explicitly store them in selections if we just treat them as defaults)
                    // But to be safe, we treat them as valid.
                    // For string generation, we use the fixed option.
                    const opt = slot.options[0];

                    // Recursion check for fixed items too
                    const subProduct = findProductForOption(opt, allProducts);
                    if (subProduct?.bundleItems) {
                        const subValid = validateLevel(subProduct.bundleItems, currentPath);
                        if (!subValid) levelValid = false;
                    }

                    detailsParts.push(`${getOptionLabel(opt)}`);
                } else {
                    if (!selected) {
                        levelValid = false;
                    } else {
                        detailsParts.push(`${getOptionLabel(selected)}`);
                        // Recursion check for user-selected items
                        const subProduct = findProductForOption(selected, allProducts);
                        if (subProduct?.bundleItems) {
                            const subValid = validateLevel(subProduct.bundleItems, currentPath);
                            if (!subValid) levelValid = false;
                        }
                    }
                }
            });

            return levelValid;
        };

        if (product.bundleItems) {
            isValid = validateLevel(product.bundleItems, '');
        }

        // Generate a prettier details string
        // We actually want: "MainBundle: [Opt 1, Opt 2]; SubBundle: [SubOpt A]" - but that's hard to flatten generically perfectly.
        // For now, let's just make sure we capture everything.
        // We'll construct a structured object for the final string to be readable.

        const buildDetailsString = (bundleStr: string, parentPath: string): string => {
            const slots = parseBundleString(bundleStr);
            const parts: string[] = [];

            slots.forEach((slot, index) => {
                const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;
                const selected = slot.isFixed ? slot.options[0] : selections[currentPath];

                if (selected) {
                    let partStr = getOptionLabel(selected);
                    const subProduct = findProductForOption(selected, allProducts);

                    if (subProduct?.bundleItems) {
                        const subDetails = buildDetailsString(subProduct.bundleItems, currentPath);
                        if (subDetails) {
                            partStr += ` (${subDetails})`;
                        }
                    }
                    parts.push(partStr);
                }
            });
            return parts.join(', ');
        };

        const finalString = product.bundleItems ? buildDetailsString(product.bundleItems, '') : '';

        onConfigChange(isValid, selections, finalString);
    }, [selections, product, allProducts]);


    // Recursive Renderer
    const renderSlots = (bundleStr: string, parentPath: string) => {
        const slots = parseBundleString(bundleStr);

        return (
            <div className="space-y-6">
                {slots.map((slot, index) => {
                    const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;
                    const selected = selections[currentPath];

                    // Fixed Slot Handling
                    if (slot.isFixed) {
                        const fixedOption = slot.options[0];
                        const subProduct = findProductForOption(fixedOption, allProducts);

                        return (
                            <div key={currentPath} className="pb-4 border-b border-rose-100 last:border-0 last:pb-0">
                                <p className="font-semibold text-sm text-gray-500 mb-2 uppercase tracking-wide">
                                    Item {index + 1}: <span className="text-rose-600">{getOptionLabel(fixedOption)}</span>
                                </p>
                                <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 inline-block">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {getOptionLabel(fixedOption)}
                                </div>

                                {/* RECURSION FOR FIXED ITEMS */}
                                {subProduct?.bundleItems && (
                                    <div className="mt-4 pl-4 border-l-2 border-rose-200 ml-2">
                                        <h4 className="text-sm font-semibold text-rose-500 mb-3">Customize {getOptionLabel(fixedOption)}:</h4>
                                        {renderSlots(subProduct.bundleItems, currentPath)}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Selectable Slot Handling
                    const subProduct = selected ? findProductForOption(selected, allProducts) : undefined;

                    return (
                        <div key={currentPath} className="pb-6 border-b border-rose-100 last:border-0 last:pb-0">
                            <p className="font-semibold text-sm text-gray-500 mb-3 uppercase tracking-wide">
                                Item {index + 1}: <span className="text-rose-600">{selected ? getOptionLabel(selected) : 'Choose One'}</span>
                            </p>

                            <div className="flex flex-wrap gap-3">
                                {slot.options.map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            // Clear ALL children of this path when changing selection to preventing stale state 
                                            // (e.g. if previous selection was a bundle with specific sub-options)
                                            // A simple way is to recreate the state object filtering out keys starting with currentPath + "."
                                            setSelections(prev => {
                                                const next = { ...prev };
                                                Object.keys(next).forEach(key => {
                                                    if (key.startsWith(currentPath + '.')) {
                                                        delete next[key];
                                                    }
                                                });
                                                next[currentPath] = option;
                                                return next;
                                            });
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${selections[currentPath] === option
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-md ring-2 ring-rose-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                                            }`}
                                    >
                                        {getOptionLabel(option)}
                                    </button>
                                ))}
                            </div>

                            {/* RECURSION FOR SELECTED ITEMS */}
                            {subProduct?.bundleItems && (
                                <div className="mt-4 pl-4 border-l-2 border-rose-200 ml-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h4 className="text-sm font-semibold text-rose-500 mb-3">Customize {getOptionLabel(selected!)}:</h4>
                                    {renderSlots(subProduct.bundleItems, currentPath)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!product.bundleItems) return null;

    return (
        <div className="bg-rose-50/50 rounded-xl p-4 md:p-6 border border-rose-100">
            {renderSlots(product.bundleItems, '')}
        </div>
    );
};

export default BundleConfigurator;
