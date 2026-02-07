"use client";

import { MoreHorizontal, Pencil, Trash2, CheckCircle, Ban } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Model {
  id: string;
  title: string;
  value: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModelTableProps {
  models: Model[];
  onEdit: (model: Model) => void;
  onDelete: (model: Model) => void;
  onSetDefault: (model: Model) => void;
  onToggleActive: (model: Model) => void;
}

export function ModelTable({
  models,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleActive,
}: ModelTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (models.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No models found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Default</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[70px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((model) => (
          <TableRow key={model.id}>
            <TableCell>
              <p className="font-medium">{model.title}</p>
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {model.value}
              </code>
            </TableCell>
            <TableCell>
              <Badge variant={model.isActive ? "default" : "secondary"}>
                {model.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              {model.isDefault ? (
                <Badge variant="outline">Default</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>{formatDate(model.updatedAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(model)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetDefault(model)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Set Default
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(model)}>
                    {model.isActive ? (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(model)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
