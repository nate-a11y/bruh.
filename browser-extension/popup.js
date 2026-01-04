// bruh. Browser Extension - Popup Script

const API_BASE = 'https://bruh.app';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');

  // Check if user is logged in
  const session = await getSession();

  if (!session) {
    content.innerHTML = `
      <div class="login-prompt">
        <p>Please log in to bruh. to add tasks</p>
        <p style="margin-top: 12px;">
          <a href="${API_BASE}/login" target="_blank">Log in to bruh. →</a>
        </p>
      </div>
    `;
    return;
  }

  // Get current page info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTitle = tab?.title || '';
  const pageUrl = tab?.url || '';

  // Render the form
  content.innerHTML = `
    <div class="page-info" title="${pageUrl}">
      📄 ${pageTitle || 'Current page'}
    </div>

    <div class="input-group">
      <label>Task</label>
      <input type="text" id="task-title" placeholder="What needs to be done?" autofocus>
      <div class="hint">Use !high or !urgent for priority, dates work too</div>
    </div>

    <div class="input-group">
      <label>Notes (optional)</label>
      <textarea id="task-notes" placeholder="Add details..."></textarea>
    </div>

    <div class="row">
      <div class="input-group">
        <label>Priority</label>
        <select id="task-priority">
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div class="input-group">
        <label>Due</label>
        <input type="date" id="task-due">
      </div>
    </div>

    <div class="input-group">
      <label>
        <input type="checkbox" id="include-url" checked>
        Include page URL in notes
      </label>
    </div>

    <button id="add-task">Add Task</button>
    <div id="status" class="status" style="display: none;"></div>
  `;

  // Pre-fill with selected text if any
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ''
    });
    if (result) {
      document.getElementById('task-title').value = result.trim();
    }
  } catch (e) {
    // Can't access page content (e.g., chrome:// pages)
  }

  // Handle form submission
  document.getElementById('add-task').addEventListener('click', async () => {
    const title = document.getElementById('task-title').value.trim();
    const notes = document.getElementById('task-notes').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due').value;
    const includeUrl = document.getElementById('include-url').checked;

    if (!title) {
      showStatus('Please enter a task', 'error');
      return;
    }

    const button = document.getElementById('add-task');
    button.disabled = true;
    button.textContent = 'Adding...';

    try {
      const fullNotes = includeUrl && pageUrl
        ? `${notes}\n\nSource: ${pageUrl}`.trim()
        : notes;

      const response = await fetch(`${API_BASE}/api/tasks/quick-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          notes: fullNotes,
          priority,
          due_date: dueDate || null,
          source: 'extension'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      showStatus('Task added!', 'success');

      // Clear form
      document.getElementById('task-title').value = '';
      document.getElementById('task-notes').value = '';

      // Close popup after a moment
      setTimeout(() => window.close(), 1500);

    } catch (error) {
      showStatus(error.message || 'Failed to add task', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Add Task';
    }
  });

  // Handle Enter key
  document.getElementById('task-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('add-task').click();
    }
  });
});

// Get session from storage or API
async function getSession() {
  // Try to get session from storage first
  const { session } = await chrome.storage.local.get('session');
  if (session && new Date(session.expires_at) > new Date()) {
    return session;
  }

  // Try to fetch from API
  try {
    const response = await fetch(`${API_BASE}/api/auth/session`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        await chrome.storage.local.set({ session: data });
        return data;
      }
    }
  } catch (e) {
    console.error('Failed to get session:', e);
  }

  return null;
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';

  if (type === 'error') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}
