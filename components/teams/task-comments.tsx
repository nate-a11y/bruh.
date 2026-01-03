"use client";

import { useState, useRef, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Send, MoreVertical, Edit2, Trash2, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  edited_at: string | null;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email: string;
  };
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  user?: {
    email: string;
    avatar_url?: string;
  };
}

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
  members: TeamMember[];
  currentUserId: string;
  onAddComment: (content: string, mentions: string[]) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function TaskComments({
  taskId,
  comments,
  members,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle @ mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "@") {
      setShowMentions(true);
      setMentionSearch("");
    } else if (showMentions) {
      if (e.key === "Escape") {
        setShowMentions(false);
      } else if (e.key === "Backspace" && mentionSearch === "") {
        setShowMentions(false);
      }
    }
  };

  const handleInput = (value: string) => {
    setNewComment(value);
    // Check for @ mentions
    const lastAt = value.lastIndexOf("@");
    if (lastAt !== -1) {
      const afterAt = value.slice(lastAt + 1);
      if (!afterAt.includes(" ")) {
        setMentionSearch(afterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAt = newComment.lastIndexOf("@");
    const beforeAt = newComment.slice(0, lastAt);
    const displayName = member.display_name || member.user?.email || "user";
    setNewComment(`${beforeAt}@${displayName} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter((m) => {
    const name = m.display_name || m.user?.email || "";
    return name.toLowerCase().includes(mentionSearch.toLowerCase());
  });

  // Extract mentions from comment content
  const extractMentions = (content: string): string[] => {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern) || [];
    return matches
      .map((m) => m.slice(1))
      .map((name) => {
        const member = members.find(
          (mem) =>
            (mem.display_name || mem.user?.email || "").toLowerCase() ===
            name.toLowerCase()
        );
        return member?.user_id;
      })
      .filter(Boolean) as string[];
  };

  async function handleSubmit() {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const mentions = extractMentions(newComment);
      await onAddComment(newComment.trim(), mentions);
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(commentId: string) {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onEditComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent("");
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;

    try {
      await onDeleteComment(commentId);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  // Render comment content with highlighted mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.user.avatar_url} />
                <AvatarFallback>
                  {comment.user.display_name?.slice(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.user.display_name || comment.user.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.edited_at && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(comment.id)}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {renderContent(comment.content)}
                  </p>
                )}
              </div>

              {comment.user_id === currentUserId && editingId !== comment.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... Use @ to mention"
          className="min-h-[80px] pr-12"
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
        >
          <Send className="h-4 w-4" />
        </Button>

        {/* Mentions Popover */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border bg-popover p-2 shadow-lg z-50">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              Mention someone
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                  onClick={() => insertMention(member)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {(member.display_name || member.user?.email || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {member.display_name || member.user?.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
