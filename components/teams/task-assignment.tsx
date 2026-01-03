"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TeamMember {
  user_id: string;
  display_name: string | null;
  role: string;
  user?: {
    email: string;
    avatar_url?: string;
  };
}

interface TaskAssignmentProps {
  taskId: string;
  currentAssignee: TeamMember | null;
  members: TeamMember[];
  onAssign: (userId: string | null) => Promise<void>;
  compact?: boolean;
}

export function TaskAssignment({
  taskId,
  currentAssignee,
  members,
  onAssign,
  compact = false,
}: TaskAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleSelect(userId: string | null) {
    if (userId === currentAssignee?.user_id) {
      setOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onAssign(userId);
      const member = members.find((m) => m.user_id === userId);
      toast.success(
        userId
          ? `Assigned to ${member?.display_name || member?.user?.email}`
          : "Unassigned"
      );
    } catch {
      toast.error("Failed to update assignment");
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  }

  const displayName = currentAssignee?.display_name || currentAssignee?.user?.email;

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2"
            disabled={isUpdating}
          >
            {currentAssignee ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentAssignee.user?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs max-w-[100px] truncate">
                  {displayName}
                </span>
              </>
            ) : (
              <>
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Assign</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {currentAssignee && (
                  <CommandItem
                    value="unassign"
                    onSelect={() => handleSelect(null)}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Unassign
                  </CommandItem>
                )}
                {members.map((member) => (
                  <CommandItem
                    key={member.user_id}
                    value={member.display_name || member.user?.email || member.user_id}
                    onSelect={() => handleSelect(member.user_id)}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(member.display_name || member.user?.email || "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">
                      {member.display_name || member.user?.email}
                    </span>
                    {currentAssignee?.user_id === member.user_id && (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Assignee</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isUpdating}
          >
            {currentAssignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={currentAssignee.user?.avatar_url} />
                  <AvatarFallback>
                    {displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{displayName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select assignee...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search team members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup heading="Team Members">
                {currentAssignee && (
                  <CommandItem
                    value="unassign"
                    onSelect={() => handleSelect(null)}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove assignment
                  </CommandItem>
                )}
                {members.map((member) => (
                  <CommandItem
                    key={member.user_id}
                    value={member.display_name || member.user?.email || member.user_id}
                    onSelect={() => handleSelect(member.user_id)}
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback>
                        {(member.display_name || member.user?.email || "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p>{member.display_name || member.user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                    {currentAssignee?.user_id === member.user_id && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
