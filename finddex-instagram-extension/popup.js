const $ = (id) => document.getElementById(id);
const fields = ['username', 'displayName', 'bio', 'avatarUrl', 'profileUrl', 'notes'];
let selectedCoverUrl = '';
let selectedCoverKind = 'profile';
let language = 'en';

// Strings live in _locales/<lang>/messages.json (see i18n.js).
let translate = (key) => key;
const tr = (key) => translate(key);

async function applyLanguage(nextLanguage) {
  language = nextLanguage === 'tr' ? 'tr' : 'en';
  translate = await FindDexI18n.createTranslator(language);
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = tr(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => { element.title = tr(element.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = tr(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-alt]').forEach((element) => { element.alt = tr(element.dataset.i18nAlt); });
  $('language').value = language;
}

function status(message, type = 'ok') {
  $('status').textContent = message;
  $('status').className = `status ${type}`;
}

async function loadSettings() {
  const saved = await chrome.storage.local.get(['serverUrl', 'apiKey', 'language']);
  await applyLanguage(saved.language || 'en');
  $('serverUrl').value = saved.serverUrl || 'http://localhost:12000';
  $('apiKey').value = saved.apiKey || '';
  if (!saved.apiKey) $('settings').classList.remove('hidden');
}

function selectCover(url, kind) {
  selectedCoverUrl = url || $('avatarUrl').value.trim();
  selectedCoverKind = kind;
  $('coverPreview').src = selectedCoverUrl;
  document.querySelectorAll('.cover-option').forEach((option) => option.classList.toggle('selected', option.dataset.kind === kind && option.dataset.url === selectedCoverUrl));
}

function coverOption(url, kind, isVideo = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cover-option';
  button.dataset.url = url;
  button.dataset.kind = kind;
  button.setAttribute('aria-label', kind === 'profile' ? tr('chooseProfile') : tr('choosePost'));
  const image = document.createElement('img');
  image.src = url;
  image.alt = '';
  image.referrerPolicy = 'no-referrer';
  button.append(image);
  if (kind === 'profile') {
    const label = document.createElement('span');
    label.className = 'kind';
    label.textContent = tr('profile');
    button.append(label);
  }
  if (isVideo) {
    const badge = document.createElement('span');
    badge.className = 'video';
    badge.textContent = '▶';
    button.append(badge);
  }
  button.addEventListener('click', () => selectCover(url, kind));
  return button;
}

function renderCoverPicker(profile) {
  const thumbnails = Array.isArray(profile.postThumbnails) ? profile.postThumbnails.filter((item) => item?.url) : [];
  $('coverLoading').classList.add('hidden');
  if (!thumbnails.length) {
    $('coverPicker').classList.add('hidden');
    selectedCoverUrl = profile.avatarUrl || '';
    return;
  }
  $('coverGrid').replaceChildren(coverOption(profile.avatarUrl, 'profile'), ...thumbnails.map((item, index) => coverOption(item.url, `post-${index}`, Boolean(item.isVideo))));
  $('coverContent').classList.remove('hidden');
  selectCover(profile.avatarUrl, 'profile');
}

async function extract() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://www.instagram.com/')) {
    $('pageWarning').textContent = tr('openInstagram');
    $('pageWarning').classList.remove('hidden');
    $('submit').disabled = true;
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PROFILE' });
    if (!response?.profile?.username) throw new Error(tr('profileMissing'));
    fields.forEach((field) => { $(field).value = response.profile[field] || ''; });
    $('isVerified').checked = Boolean(response.profile.isVerified);
    renderCoverPicker(response.profile);
  } catch (error) {
    $('pageWarning').textContent = error.message;
    $('pageWarning').classList.remove('hidden');
    $('submit').disabled = true;
  }
}

$('avatarUrl').addEventListener('input', () => {
  if (selectedCoverKind !== 'profile') return;
  const nextUrl = $('avatarUrl').value.trim();
  const profileOption = document.querySelector('.cover-option[data-kind="profile"]');
  if (profileOption) {
    profileOption.dataset.url = nextUrl;
    const image = profileOption.querySelector('img');
    if (image) image.src = nextUrl;
  }
  selectCover(nextUrl, 'profile');
});

$('language').addEventListener('change', async (event) => {
  await applyLanguage(event.target.value);
  await chrome.storage.local.set({ language });
});
$('toggleSettings').addEventListener('click', () => $('settings').classList.toggle('hidden'));
$('saveSettings').addEventListener('click', async () => {
  const rawUrl = $('serverUrl').value.trim().replace(/\/+$/, '');
  let origin;
  try { origin = new URL(rawUrl).origin; } catch { status(tr('invalidAddress'), 'error'); return; }
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) { status(tr('permissionDenied'), 'error'); return; }
  await chrome.storage.local.set({ serverUrl: origin, apiKey: $('apiKey').value.trim(), language });
  $('settings').classList.add('hidden');
  status(tr('settingsSaved'));
});

$('profileForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('submit').disabled = true;
  status(tr('saving'));
  const profile = Object.fromEntries(fields.map((field) => [field, $(field).value.trim()]));
  profile.coverImageUrl = selectedCoverUrl || profile.avatarUrl;
  profile.tags = $('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean);
  profile.isVerified = $('isVerified').checked;
  const response = await chrome.runtime.sendMessage({ type: 'SAVE_PROFILE', profile });
  if (response?.ok) status(tr('saved')); else status(response?.error || tr('saveFailed'), 'error');
  $('submit').disabled = false;
});

void loadSettings().then(extract);
