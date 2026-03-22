"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Filter, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fetchCategories, Category } from "@/api/category.api";
import { CategoryManagementDialog } from "./category-dialog";
import { Settings2, Plus } from "lucide-react";

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  className?: string;
  align?: "start" | "center" | "end";
  canManage?: boolean;
  onCategoriesChange?: () => void;
  placeholder?: string;
}

export function CategoryFilter({
  selectedCategories,
  onCategoryChange,
  className,
  align = "end",
  canManage = false,
  onCategoriesChange,
  placeholder = "Filter",
}: CategoryFilterProps) {
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const loadCategories = useCallback(() => {
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    fetchCategories(controller.signal)
      .then((res) => {
        if (fetchAbortRef.current === controller) {
          setCategoriesData(res.categories || []);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error("Failed to load categories", err);
      });
  }, []);

  useEffect(() => {
    loadCategories();
    return () => fetchAbortRef.current?.abort();
  }, [loadCategories]);

  const toggleCategory = (catName: string) => {
    const nextList = selectedCategories.includes(catName)
      ? selectedCategories.filter((c) => c !== catName)
      : [...selectedCategories, catName];
    onCategoryChange(nextList);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 px-4 rounded-md gap-2 border-border/40 bg-background/80 backdrop-blur-md shadow-sm transition-all",
            selectedCategories.length > 0 && "border-primary text-primary bg-primary/5",
            className
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">
            {selectedCategories.length === 0
              ? placeholder
              : `${selectedCategories.length} selected`}
          </span>
          {selectedCategories.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              {selectedCategories.length}
            </span>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-1.5 rounded-md shadow-xl border-border/50" align={align}>
        <Command className="rounded-md">
          <CommandInput placeholder="Search categories..." className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup heading="Categories">
              {categoriesData.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground italic">
                  Loading categories...
                </div>
              ) : (
                categoriesData.map((cat) => (
                  <CommandItem
                    key={cat._id}
                    onSelect={() => toggleCategory(cat.name)}
                    className="cursor-pointer rounded-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center transition-colors shadow-sm",
                          selectedCategories.includes(cat.name)
                            ? "bg-primary border-primary text-white"
                            : "border-input bg-background"
                        )}
                      >
                        {selectedCategories.includes(cat.name) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
            
            {(selectedCategories.length > 0 || canManage) && (
              <div className="p-1.5 border-t border-border/50 mt-1 flex flex-col gap-1">
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-[10px] font-bold tracking-tight h-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onCategoryChange([])}
                  >
                    CLEAR SELECTION
                  </Button>
                )}
                {canManage && (
                  <CategoryManagementDialog 
                    onCategoriesChange={() => {
                      loadCategories();
                      onCategoriesChange?.();
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[10px] font-bold tracking-tight h-8 text-primary hover:bg-primary/5"
                      >
                        <Settings2 className="h-3 w-3 mr-2" />
                        MANAGE CATEGORIES
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
