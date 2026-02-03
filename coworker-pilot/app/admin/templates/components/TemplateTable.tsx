"use client";

import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

interface TemplateTableProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onTogglePublish: (template: Template) => void;
}

export function TemplateTable({
  templates,
  onEdit,
  onDelete,
  onTogglePublish,
}: TemplateTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (templates.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No templates found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[70px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <TableRow key={template.id}>
            <TableCell>
              <div>
                <p className="font-medium">{template.name}</p>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {template.slug}
              </code>
            </TableCell>
            <TableCell>
              <Badge variant={template.isPublished ? "default" : "secondary"}>
                {template.isPublished ? "Published" : "Draft"}
              </Badge>
            </TableCell>
            <TableCell>v{template.version}</TableCell>
            <TableCell>{formatDate(template.updatedAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTogglePublish(template)}>
                    {template.isPublished ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Publish
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(template)}
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
