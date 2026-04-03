"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FolderEdit,
  Settings2,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Category,
  createCategory,
  fetchCategories,
  updateCategory,
  deleteCategory,
} from "@/api/category.api";
import { toast } from "sonner";
import { EmptyState } from "../ui/empty-state";
import { cn } from "@/lib/utils";

interface CategoryManagementDialogProps {
  onCategoriesChange?: () => void;
  trigger?: React.ReactNode;
}

export function CategoryManagementDialog({
  onCategoriesChange,
  trigger,
}: CategoryManagementDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const fetchAbortRef = useRef<AbortController | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  const loadCategories = useCallback(async () => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    try {
      const data = await fetchCategories(controller.signal);
      setCategories(data.categories);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error(err.message || "Failed to load categories");
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [onCategoriesChange]);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
    return () => fetchAbortRef.current?.abort();
  }, [open, loadCategories]);

  const openNewDialog = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingId(cat._id);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (saveAbortRef.current) saveAbortRef.current.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: formName,
          description: formDescription,
        }, controller.signal);
        toast.success("Category updated");
      } else {
        await createCategory({ name: formName, description: formDescription }, controller.signal);
        toast.success("Category created");
      }
      setFormDialogOpen(false);
      await loadCategories();
      onCategoriesChange?.();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error(err.message || "Failed to save category");
    } finally {
      if (saveAbortRef.current === controller) {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete);
      toast.success("Category deleted");
      await loadCategories();
      onCategoriesChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setCategoryToDelete(null);
    }
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogTrigger asChild>
          {trigger || (
            <Button
              variant="outline"
              className="h-10 sm:h-12 flex-1 sm:flex-none px-4 sm:px-6 rounded-xl gap-2 font-medium"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Manage categories</span>
              <span className="sm:hidden">Categories</span>
            </Button>
          )}
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="sm:max-w-[500px] flex flex-col p-0 overflow-hidden">
          <ResponsiveDialogHeader className="p-6 pb-2 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:pr-8">
              <div className="flex items-center gap-2">
                <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  Manage categories
                </ResponsiveDialogTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 transition-colors">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] p-3 rounded-xl bg-popover/90 backdrop-blur-md border shadow-xl">
                      <p className="text-xs leading-relaxed font-medium">
                        Create and organize categories for your products to help users filter their cabinet and search more effectively. Categories are shared across your product line.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                onClick={() => openNewDialog()}
                size="sm"
                className="h-9 sm:h-10 rounded-full px-5 font-semibold shadow-lg shadow-primary/20 transition-all shrink-0 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                New category
              </Button>
            </div>
          </ResponsiveDialogHeader>



          <ScrollArea className="flex-1 min-h-0 max-h-[80vh] sm:max-h-[600px]">
            <div className="p-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-primary/10 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium animate-pulse">
                    Loading your categories...
                  </p>
                </div>
              ) : categories.length === 0 ? (
                <EmptyState
                  icon={FolderEdit}
                  title="No categories yet"
                  description="Categorize your products for a more structured inventory and enhanced consumer data visualization."
                  action={{
                    label: "Create first category",
                    onClick: openNewDialog,
                  }}
                  className="py-20 border-none bg-transparent"
                />
              ) : (
                <div className="grid gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat._id}
                      className="group relative border border-border/60 rounded-2xl p-4 flex items-center justify-between hover:bg-muted/20 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate leading-tight">
                          {cat.name}
                        </h3>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-70">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:text-primary transition-all active:scale-90"
                          onClick={() => openEditDialog(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                          onClick={() => setCategoryToDelete(cat._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Inner Form Dialog for Add/Edit */}
      <ResponsiveDialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <ResponsiveDialogContent className="sm:max-w-[425px]">
          <ResponsiveDialogHeader>
            <div className="flex items-center gap-2">
              <ResponsiveDialogTitle className="text-lg font-bold">
                {editingId ? "Edit category" : "New category"}
              </ResponsiveDialogTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="p-3 text-xs rounded-xl max-w-[200px]">
                    {editingId
                      ? "Keep your categories descriptive to help customers identify products quickly."
                      : "Categories help organize your medicine catalog for consumers."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </ResponsiveDialogHeader>
          <ScrollArea className="max-h-[80vh] sm:max-h-[400px]">
            <div className="grid gap-5 py-4 px-1">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-sm font-semibold px-1">Category name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Antibiotics"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-11 sm:h-12 rounded-xl focus-visible:ring-primary/20"
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="description"
                  className="flex items-center justify-between text-sm font-semibold px-1"
                >
                  <span>Description</span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Optional
                  </span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="resize-none min-h-[120px] rounded-2xl p-4 focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </ScrollArea>
          <ResponsiveDialogFooter className="gap-3 p-6 border-t">
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
              disabled={saving}
              className="flex-1 h-11 sm:h-12 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 sm:h-12 rounded-xl font-semibold transition-all active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-[400px]">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-full border border-destructive/20 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Delete category?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This action cannot be undone. Products using this category will no longer display it. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl flex-1 font-semibold border-muted-foreground/20">
              Nevermind
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete()}
              className="h-12 rounded-2xl flex-1 font-semibold bg-destructive hover:bg-destructive/90 transition-all active:scale-[0.98]"
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
