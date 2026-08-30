/**
 * Search Service - Main export
 * Provides a unified interface for all search functionality
 */

export { default as searchEngine } from './searchEngine.js';
export { default as queryNormalizer } from './queryNormalizer.js';
export { default as spellCorrector } from './spellCorrector.js';
export { default as synonymExpander } from './synonymExpander.js';
export { default as intentDetector } from './intentDetector.js';
export { default as SearchRanker } from './searchRanker.js';
