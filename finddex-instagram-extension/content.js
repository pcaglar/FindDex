const RESERVED_PATHS = new Set(['accounts', 'direct', 'explore', 'reels', 'stories', 'p']);

function meta(property) {
  return document.querySelector(`meta[property="${property}"]`)?.content?.trim() || '';
}

function profileHandle() {
  const segment = location.pathname.split('/').filter(Boolean)[0] || '';
  if (segment && !RESERVED_PATHS.has(segment.toLowerCase())) return segment;
  const title = meta('og:title') || document.title;
  return title.match(/@([\w.]+)/)?.[1] || '';
}

function cleanTitle(title, username) {
  if (!title) return username;
  return title.split(/\s*\(@/)[0].replace(/•.*Instagram.*/i, '').trim() || username;
}

function visibleText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent?.trim()) return element.textContent.trim();
  }
  return '';
}

function highestResolutionSource(image) {
  const candidates = (image.getAttribute('srcset') || '')
    .split(',')
    .map((candidate) => candidate.trim().match(/^(\S+)\s+(\d+)(?:w|x)$/))
    .filter(Boolean)
    .sort((left, right) => Number(right[2]) - Number(left[2]));
  return candidates[0]?.[1] || image.currentSrc || image.src || '';
}

function collectPostThumbnails(limit = 12) {
  const seen = new Set();
  const thumbnails = [];
  const postLinks = document.querySelectorAll('main a[href*="/p/"], main a[href*="/reel/"]');
  for (const link of postLinks) {
    const image = link.querySelector('img');
    if (!image) continue;
    const bounds = image.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || bounds.bottom < 0 || bounds.top > innerHeight) continue;
    const url = highestResolutionSource(image);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const href = link.getAttribute('href') || '';
    const isVideo = href.includes('/reel/') || Boolean(link.querySelector('svg[aria-label*="video" i], svg[aria-label*="reel" i], svg[aria-label*="oynat" i]'));
    thumbnails.push({ url, isVideo });
  }
  return thumbnails
    .sort((left, right) => Number(left.isVideo) - Number(right.isVideo))
    .slice(0, limit);
}

function extractProfile() {
  const username = profileHandle();
  const ogTitle = meta('og:title');
  const ogDescription = meta('og:description');
  const displayName = cleanTitle(ogTitle, username) || visibleText(['header h1', 'header h2']);
  const bioFallback = visibleText(['header section div[dir="auto"]', 'header span[dir="auto"]']);
  const description = ogDescription.replace(/^.*?Followers,.*?Following,.*?Posts\s*-\s*/i, '').trim();
  const image = meta('og:image') || document.querySelector('header img')?.src || '';
  const verified = Boolean(document.querySelector('header svg[aria-label*="Verified" i], header [title*="Verified" i], header svg[aria-label*="Doğrulanmış" i]'));
  return {
    username,
    displayName,
    bio: description || bioFallback,
    avatarUrl: image,
    isVerified: verified,
    profileUrl: location.href.split('?')[0],
    postThumbnails: collectPostThumbnails(),
    tags: [],
    notes: '',
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'EXTRACT_PROFILE') sendResponse({ ok: true, profile: extractProfile() });
});
