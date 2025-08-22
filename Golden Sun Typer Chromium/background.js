// MV3 background service worker for Chromium
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    tb_enabled: true,
    tb_volume: 0.7,
    tb_play_in_passwords: false,
    tb_include_content_editable: true
  });
});