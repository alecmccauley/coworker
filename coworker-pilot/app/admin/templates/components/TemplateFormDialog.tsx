"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCoworkerTemplateSchema } from "@coworker/shared-services";
import type { CreateCoworkerTemplateSchemaInput } from "@coworker/shared-services";
import { tokenStorage } from "@/lib/sdk";
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

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  rolePrompt: string;
  defaultBehaviorsJson: string | null;
  defaultToolsPolicyJson: string | null;
  modelRoutingPolicyJson: string | null;
  model: string | null;
  version: number;
  isPublished: boolean;
}

interface AiModel {
  id: string;
  title: string;
  value: string;
  isActive: boolean;
  isDefault: boolean;
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
  const [models, setModels] = useState<AiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const form = useForm<CreateCoworkerTemplateSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCoworkerTemplateSchema as any),
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      shortDescription: "",
      rolePrompt: "",
      model: "",
      isPublished: false,
    },
  });

  useEffect(() => {
    if (open) {
      setIsLoadingModels(true);
      const token = tokenStorage.getAccessToken();
      fetch("/api/v1/admin/models", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
        .then((response) => response.json())
        .then((payload: { data?: AiModel[] }) => {
          setModels(payload.data ?? []);
        })
        .catch(() => {
          setModels([]);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });

      if (template) {
        form.reset({
          slug: template.slug,
          name: template.name,
          description: template.description ?? "",
          shortDescription: template.shortDescription ?? "",
          rolePrompt: template.rolePrompt,
          defaultBehaviors: parseJsonSafe(template.defaultBehaviorsJson),
          defaultToolsPolicy: parseJsonSafe(template.defaultToolsPolicyJson),
          modelRoutingPolicy: parseJsonSafe(template.modelRoutingPolicyJson),
          model: template.model ?? "",
          isPublished: template.isPublished,
        });
      } else {
        form.reset({
          slug: "",
          name: "",
          description: "",
          shortDescription: "",
          rolePrompt: "",
          model: "",
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
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-y-auto">
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
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 py-2 pr-4">
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
                          className="min-h-[160px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Long-form description used in the co-worker About tab and AI prompts.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A one-line summary for template cards..."
                          className="min-h-[80px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Used in template lists and cards. Max 160 characters.
                      </FormDescription>
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
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model (optional)</FormLabel>
                      <FormControl>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={isLoadingModels}
                          {...field}
                        >
                          <option value="">
                            {models.find((model) => model.isDefault)
                              ? `Use default model (${models.find((model) => model.isDefault)?.title})`
                              : "Use default model"}
                          </option>
                          {field.value &&
                          !models.find((model) => model.value === field.value) ? (
                            <option value={field.value}>
                              Unavailable ({field.value})
                            </option>
                          ) : null}
                          {models.map((model) => (
                            <option key={model.id} value={model.value}>
                              {model.title}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormDescription>
                        Recommended model for coworkers created from this template.
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
