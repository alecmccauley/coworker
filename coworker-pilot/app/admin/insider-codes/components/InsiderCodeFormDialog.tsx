"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsiderCodeSchema } from "@coworker/shared-services";
import type { CreateInsiderCodeSchemaInput } from "@coworker/shared-services";
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

interface InsiderCode {
  id: string;
  code: string;
  title: string;
  notes: string | null;
  isActive: boolean;
}

interface InsiderCodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insiderCode?: InsiderCode | null;
  onSubmit: (data: CreateInsiderCodeSchemaInput) => Promise<void>;
}

export function InsiderCodeFormDialog({
  open,
  onOpenChange,
  insiderCode,
  onSubmit,
}: InsiderCodeFormDialogProps) {
  const isEditing = !!insiderCode;

  const form = useForm<CreateInsiderCodeSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createInsiderCodeSchema as any),
    defaultValues: {
      code: "",
      title: "",
      notes: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (insiderCode) {
        form.reset({
          code: insiderCode.code,
          title: insiderCode.title,
          notes: insiderCode.notes ?? "",
          isActive: insiderCode.isActive,
        });
      } else {
        form.reset({
          code: "",
          title: "",
          notes: "",
          isActive: true,
        });
      }
    }
  }, [open, insiderCode, form]);

  const handleSubmit = async (data: CreateInsiderCodeSchemaInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Insider Code" : "Create Insider Code"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the insider access code."
              : "Create a new insider access code for the preview."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="earlyaccess2026"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase letters and numbers only, 6-25 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Early Access Launch" {...field} />
                    </FormControl>
                    <FormDescription>
                      Internal label for this code
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any internal notes about this code..."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
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
                        Only active codes can be used for sign-up
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
                    : "Create Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
