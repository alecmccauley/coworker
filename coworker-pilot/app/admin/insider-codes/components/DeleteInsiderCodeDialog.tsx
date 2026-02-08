"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InsiderCode {
  id: string;
  code: string;
  title: string;
  activationCount: number;
}

interface DeleteInsiderCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insiderCode: InsiderCode | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteInsiderCodeDialog({
  open,
  onOpenChange,
  insiderCode,
  onConfirm,
  isDeleting,
}: DeleteInsiderCodeDialogProps) {
  if (!insiderCode) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Insider Code</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the code{" "}
            <span className="font-medium font-mono text-foreground">
              {insiderCode.code}
            </span>{" "}
            ({insiderCode.title})?
            {insiderCode.activationCount > 0 && (
              <>
                {" "}
                This code has {insiderCode.activationCount} activation
                {insiderCode.activationCount !== 1 ? "s" : ""} that will also be
                removed.
              </>
            )}{" "}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
