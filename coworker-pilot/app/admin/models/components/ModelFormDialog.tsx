"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAiModelSchema } from "@coworker/shared-services";
import type { CreateAiModelSchemaInput } from "@coworker/shared-services";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Model {
  id: string;
  title: string;
  value: string;
  isActive: boolean;
  isDefault: boolean;
}

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: Model | null;
  onSubmit: (data: CreateAiModelSchemaInput) => Promise<void>;
}

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
  onSubmit,
}: ModelFormDialogProps) {
  const isEditing = Boolean(model);

  const form = useForm<CreateAiModelSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createAiModelSchema as any),
    defaultValues: {
      title: "",
      value: "",
      isActive: true,
      isDefault: false,
    },
  });

  const isDefault = form.watch("isDefault");

  useEffect(() => {
    if (open) {
      if (model) {
        form.reset({
          title: model.title,
          value: model.value,
          isActive: model.isActive,
          isDefault: model.isDefault,
        });
      } else {
        form.reset({
          title: "",
          value: "",
          isActive: true,
          isDefault: false,
        });
      }
    }
  }, [open, model, form]);

  useEffect(() => {
    if (isDefault) {
      form.setValue("isActive", true, { shouldValidate: true });
    }
  }, [isDefault, form]);

  const handleSubmit = async (data: CreateAiModelSchemaInput) => {
    await onSubmit({
      ...data,
      isActive: isDefault ? true : data.isActive,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Model" : "Create Model"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this AI model configuration."
              : "Add a new AI model to the available list."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="GPT-4.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input placeholder="openai/gpt-4.1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Exact model identifier used by the AI gateway.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive models are hidden from the app.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDefault}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Default</FormLabel>
                    <FormDescription>
                      Used when a coworker has no model set.
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

            <DialogFooter>
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
                    : "Create Model"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
