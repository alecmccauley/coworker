"use client";

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
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

interface InsiderCode {
  id: string;
  code: string;
  title: string;
  notes: string | null;
  isActive: boolean;
  activationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface InsiderCodeTableProps {
  codes: InsiderCode[];
  onEdit: (code: InsiderCode) => void;
  onDelete: (code: InsiderCode) => void;
  onToggleActive: (code: InsiderCode) => void;
}

export function InsiderCodeTable({
  codes,
  onEdit,
  onDelete,
  onToggleActive,
}: InsiderCodeTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (codes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">No insider codes found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Activations</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[70px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => (
          <TableRow key={code.id}>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                {code.code}
              </code>
            </TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{code.title}</p>
                {code.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {code.notes}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={code.isActive ? "default" : "secondary"}>
                {code.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>{code.activationCount}</TableCell>
            <TableCell>{formatDate(code.updatedAt)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(code)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(code)}>
                    {code.isActive ? (
                      <>
                        <ToggleLeft className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleRight className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(code)}
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
