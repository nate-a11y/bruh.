import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createPage, updatePage, notionRequest } from "./notion";

interface Task {
  id: string;
  title: string;
  notes?: string | null;
  due_date?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
}

interface NotionSettings {
  database_id?: string;
  auto_sync?: boolean;
  task_mappings?: Record<string, string>; // taskId -> notionPageId
}

// Get Notion integration for a user
async function getNotionIntegration(userId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("zeroed_integrations")
    .select("access_token, settings, sync_enabled")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single();

  if (!data?.access_token || !data?.sync_enabled) {
    return null;
  }

  const settings = data.settings as NotionSettings | null;
  if (!settings?.database_id) {
    return null;
  }

  // Check auto_sync setting
  if (settings.auto_sync === false) {
    return null;
  }

  return {
    accessToken: data.access_token,
    databaseId: settings.database_id,
  };
}

// Store mapping between Bruh task and Notion page
async function storeTaskMapping(userId: string, taskId: string, notionPageId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current settings
  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("settings")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single();

  const currentSettings = (integration?.settings as NotionSettings) || {};
  const taskMappings = currentSettings.task_mappings || {};
  taskMappings[taskId] = notionPageId;

  await supabase
    .from("zeroed_integrations")
    .update({
      settings: { ...currentSettings, task_mappings: taskMappings },
    })
    .eq("user_id", userId)
    .eq("provider", "notion");
}

// Get Notion page ID for a task
async function getNotionPageId(userId: string, taskId: string): Promise<string | null> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("settings")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .single();

  const settings = integration?.settings as NotionSettings | null;
  return settings?.task_mappings?.[taskId] || null;
}

// Sync a task to Notion (create or update)
export async function syncTaskToNotion(userId: string, task: Task) {
  try {
    const integration = await getNotionIntegration(userId);
    if (!integration) return;

    const { accessToken, databaseId } = integration;

    // Check if task already has a Notion page
    const existingPageId = await getNotionPageId(userId, task.id);

    // Build Notion properties
    const properties: Record<string, unknown> = {
      // Title property (required)
      Name: {
        title: [{ text: { content: task.title } }],
      },
    };

    // Add notes/description if present
    if (task.notes) {
      properties["Description"] = {
        rich_text: [{ text: { content: task.notes } }],
      };
    }

    // Add due date if present
    if (task.due_date) {
      properties["Due Date"] = {
        date: { start: task.due_date },
      };
    }

    // Add priority if present
    if (task.priority) {
      const priorityMap: Record<string, string> = {
        low: "Low",
        normal: "Medium",
        high: "High",
        urgent: "Urgent",
      };
      properties["Priority"] = {
        select: { name: priorityMap[task.priority] || "Medium" },
      };
    }

    // Add status
    properties["Status"] = {
      checkbox: task.status === "completed",
    };

    if (existingPageId) {
      // Update existing page
      await updatePage(accessToken, existingPageId, properties);
      console.log(`Updated Notion page ${existingPageId} for task ${task.id}`);
      return existingPageId;
    } else {
      // Create new page
      const page = await createPage(accessToken, databaseId, properties);
      console.log(`Created Notion page ${page.id} for task ${task.id}`);

      // Store the mapping
      await storeTaskMapping(userId, task.id, page.id);

      return page.id;
    }
  } catch (error) {
    console.error("Failed to sync task to Notion:", error);
  }
}

// Mark task as complete in Notion
export async function completeTaskInNotion(userId: string, taskId: string) {
  try {
    const integration = await getNotionIntegration(userId);
    if (!integration) return;

    const notionPageId = await getNotionPageId(userId, taskId);
    if (!notionPageId) {
      console.log(`No Notion page found for task ${taskId}`);
      return;
    }

    const { accessToken } = integration;

    await updatePage(accessToken, notionPageId, {
      Status: { checkbox: true },
    });
    console.log(`Marked Notion page ${notionPageId} as complete`);
  } catch (error) {
    console.error("Failed to complete task in Notion:", error);
  }
}

// Uncomplete task in Notion
export async function uncompleteTaskInNotion(userId: string, taskId: string) {
  try {
    const integration = await getNotionIntegration(userId);
    if (!integration) return;

    const notionPageId = await getNotionPageId(userId, taskId);
    if (!notionPageId) return;

    const { accessToken } = integration;

    await updatePage(accessToken, notionPageId, {
      Status: { checkbox: false },
    });
    console.log(`Marked Notion page ${notionPageId} as incomplete`);
  } catch (error) {
    console.error("Failed to uncomplete task in Notion:", error);
  }
}

// Archive a task in Notion (soft delete)
export async function archiveTaskInNotion(userId: string, taskId: string) {
  try {
    const integration = await getNotionIntegration(userId);
    if (!integration) return;

    const notionPageId = await getNotionPageId(userId, taskId);
    if (!notionPageId) {
      console.log(`No Notion page found for task ${taskId}`);
      return;
    }

    const { accessToken } = integration;

    await notionRequest(accessToken, `/pages/${notionPageId}`, "PATCH", {
      archived: true,
    });
    console.log(`Archived Notion page ${notionPageId}`);
  } catch (error) {
    console.error("Failed to archive task in Notion:", error);
  }
}
