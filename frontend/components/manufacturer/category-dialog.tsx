"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, FolderEdit, Settings2 } from "lucide-react";
import { Category, createCategory, fetchCategories, updateCategory, deleteCategory } from "@/api/category.api";
import { toast } from "sonner";

interface CategoryManagementDialogProps {
  onCategoriesChange?: () => void;
  trigger?: React.ReactNode;
}

export function CategoryManagementDialog({ onCategoriesChange, trigger }: CategoryManagementDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data.categories);
      onCategoriesChange?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const openNewDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
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

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name: formName, description: formDescription });
        toast.success("Category updated");
      } else {
        await createCategory({ name: formName, description: formDescription });
        toast.success("Category created");
      }
      setFormDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Manage Categories
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Manage Categories</DialogTitle>
                <DialogDescription>
                  Create and organize categories for your products.
                </DialogDescription>
              </div>
              <Button onClick={openNewDialog} size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-2" /> Add New
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-3 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <FolderEdit className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No categories found</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  You haven't created any categories yet. Add one to better organize your catalog.
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Create First Category
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="group bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/40 transition-all hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-semibold text-foreground truncate">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(cat._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-muted/30 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inner Form Dialog for Add/Edit */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update your category details." : "Create a new product category."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Antibiotics"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="flex items-center justify-between">
                <span>Description</span>
                <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">Optional</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of this category..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="resize-none min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[80px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
