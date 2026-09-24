# FindDex Instagram Chrome Extension

This local-only extension runs on `www.instagram.com` profile pages and saves profiles directly to your personal FindDex installation. It does not need to be published in the Chrome Web Store.

## Install

1. In FindDex, open **Settings → API Access → Create New Key**, then copy the generated key.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the `finddex-instagram-extension` folder.
6. Optionally pin FindDex to the browser toolbar.

## First use

1. Open an Instagram profile such as `https://www.instagram.com/username/`.
2. Select the FindDex toolbar icon.
3. Open extension settings and enter your FindDex URL (for example, `http://localhost:12000`) and the copied `fd_live_...` API key. Legacy `mv_live_...` keys created before rebranding remain supported.
4. Save the settings and approve access to the FindDex address you entered.
5. Review the extracted fields, optionally add tags and notes, then select **Save to FindDex**.

When visible posts are available, **Choose Cover Photo** shows the profile photo and the first post thumbnails. The selected image is downloaded immediately by FindDex. If no post is selected, the profile photo remains the default. Video thumbnails display a play badge and can still be used as cover images.

The extension stores its interface language in `chrome.storage.local`. English is the default; English and Türkçe can be selected from the popup.

## Troubleshooting

- `401`: verify the API key in extension settings. Revoked keys no longer work.
- No profile data: wait until the Instagram profile page finishes loading, then reopen the popup.
- Duplicate warning: the same username or profile URL may already exist in FindDex.
- If the port changes, update the FindDex URL in extension settings.
