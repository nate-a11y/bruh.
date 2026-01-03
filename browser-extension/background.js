// Bruh Browser Extension - Background Service Worker

const API_BASE = 'https://bruh.app';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'add-task-from-selection',
    title: 'Add "%s" as task to Bruh',
    contexts: ['selection']
  });

  // Context menu for links
  chrome.contextMenus.create({
    id: 'add-task-from-link',
    title: 'Add link as task to Bruh',
    contexts: ['link']
  });

  // Context menu for page
  chrome.contextMenus.create({
    id: 'add-task-from-page',
    title: 'Add page as task to Bruh',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let title = '';
  let notes = '';

  switch (info.menuItemId) {
    case 'add-task-from-selection':
      title = info.selectionText?.slice(0, 200) || '';
      notes = `Selected from: ${tab?.url || ''}`;
      break;

    case 'add-task-from-link':
      title = info.linkUrl ? `Check: ${info.linkUrl}` : '';
      notes = `Link from: ${tab?.url || ''}`;
      break;

    case 'add-task-from-page':
      title = tab?.title?.slice(0, 200) || 'Review page';
      notes = `Page: ${tab?.url || ''}`;
      break;
  }

  if (!title) return;

  try {
    const response = await fetch(`${API_BASE}/api/tasks/quick-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        notes,
        priority: 'normal',
        source: 'extension-context-menu'
      })
    });

    if (response.ok) {
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Task Added',
        message: title.slice(0, 50) + (title.length > 50 ? '...' : '')
      });
    } else {
      throw new Error('Failed to add task');
    }
  } catch (error) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Error',
      message: 'Failed to add task. Please log in to Bruh.'
    });
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    // Opening popup is handled automatically
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'logout') {
    chrome.storage.local.remove('session');
    sendResponse({ success: true });
  }
  return true;
});
