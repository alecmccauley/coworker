"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCoworkerTemplateSchema } from "@coworker/shared-services";
import type { CreateCoworkerTemplateSchemaInput } from "@coworker/shared-services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  defaultBehaviorsJson: string | null;
  defaultToolsPolicyJson: string | null;
  modelRoutingPolicyJson: string | null;
  version: number;
  isPublished: boolean;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSubmit: (data: CreateCoworkerTemplateSchemaInput) => Promise<void>;
}

function parseJsonSafe<T>(json: string | null): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: TemplateFormDialogProps) {
  const isEditing = !!template;

  const form = useForm<CreateCoworkerTemplateSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCoworkerTemplateSchema as any),
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      rolePrompt: "",
      isPublished: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          slug: template.slug,
          name: template.name,
          description: template.description ?? "",
          rolePrompt: template.rolePrompt,
          defaultBehaviors: parseJsonSafe(template.defaultBehaviorsJson),
          defaultToolsPolicy: parseJsonSafe(template.defaultToolsPolicyJson),
          modelRoutingPolicy: parseJsonSafe(template.modelRoutingPolicyJson),
          isPublished: template.isPublished,
        });
      } else {
        form.reset({
          slug: "",
          name: "",
          description: "",
          rolePrompt: "",
          isPublished: false,
        });
      }
    }
  }, [open, template, form]);

  const handleSubmit = async (data: CreateCoworkerTemplateSchemaInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the co-worker template configuration."
              : "Create a new role-based co-worker template."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Marketing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="marketing"
                            {...field}
                            disabled={isEditing}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier (lowercase, hyphens only)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A brief description of this co-worker role..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rolePrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="You are a marketing specialist who helps with..."
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The core prompt that defines how this co-worker behaves
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Published</FormLabel>
                        <FormDescription>
                          Make this template available to users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
