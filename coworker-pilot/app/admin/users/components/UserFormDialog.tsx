"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@coworker/shared-services";
import type { CreateUserSchemaInput } from "@coworker/shared-services";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: CreateUserSchemaInput) => Promise<void>;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
}: UserFormDialogProps) {
  const isEditing = !!user;

  const form = useForm<CreateUserSchemaInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createUserSchema as any),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          email: user.email,
          name: user.name ?? "",
        });
      } else {
        form.reset({
          email: "",
          name: "",
        });
      }
    }
  }, [open, user, form]);

  const handleSubmit = async (data: CreateUserSchemaInput) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the user's information below."
              : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
