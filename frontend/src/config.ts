// application-wide configuration and constants

export const DEFAULT_INPUT = '明天阴天 15 度，去面试，希望正式一点、偏深色、不要太厚';

// whether to skip real API calls and use mock data
export const USE_MOCK = false;

// true: 使用 fetch + ReadableStream 消费 SSE；false: 使用 EventSource
export const USE_FETCH_SSE = true;

// sizing for assistant bubble
export const ASSISTANT_BUBBLE_WIDTH = 520;
// increased height to avoid clipping content (see screenshot arrow)
export const ASSISTANT_BUBBLE_HEIGHT = 460;
