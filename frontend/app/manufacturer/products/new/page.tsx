"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  X, 
  Check, 
  ImageIcon, 
  ArrowLeft, 
  ArrowRight,
  ChevronsUpDown,
  Zap,
  Tag,
  FileText,
  Image as ImageIconIcon
} from "lucide-react";
import { createProduct } from "@/api/product.api";
import { uploadImages } from "@/api/upload.api";
import { toast } from "sonner";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fetchCategories, Category } from "@/api/category.api";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProductWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Form State
  const [form, setForm] = useState({
    name: "",
    productId: "",
    category: "",
    brand: "",
    price: "",
    description: "",
    images: [] as File[]
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategory, setOpenCategory] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.categories))
      .catch((err) => console.error("Could not fetch categories:", err));
  }, []);

  const updateForm = (updates: Partial<typeof form>) => setForm(f => ({ ...f, ...updates }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    updateForm({ images: [...form.images, ...files] });
  };

  const removeImage = (index: number) => {
    updateForm({ images: form.images.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrls: string[] = [];
      if (form.images.length > 0) {
        setUploading(true);
        imageUrls = await uploadImages(form.images);
        setUploading(false);
      }

      await createProduct({
        ...form,
        price: parseFloat(form.price) || 0,
        images: imageUrls
      });
      
      toast.success("Product successfully enrolled!");
      router.push("/manufacturer/products");
    } catch (err: any) {
      toast.error(err.message || "Enrollment failed.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!form.name || !form.productId || !form.category || !form.brand)) {
        toast.error("Please fill in all identity fields.");
        return;
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
      {/* Header & Progress */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10">
              <Link href="/manufacturer/products"><ArrowLeft className="h-5 w-5" /></Link>
           </Button>
           <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground">Enroll Product</h1>
              <p className="text-muted-foreground text-sm font-medium">Step {step} of 3: {step === 1 ? "Identity" : step === 2 ? "Specifications" : "Imagery"}</p>
           </div>
        </div>

        <div className="flex gap-2">
           {[1, 2, 3].map(i => (
             <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", i <= step ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "bg-muted")} />
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={step}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3 }}
        >
          <Card className="p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-accent/10 border-none shadow-2xl overflow-hidden">
             <div className="bg-background rounded-[2.4rem] p-6 lg:p-10 space-y-8">
                
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <Tag className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Product Identity</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Product Name</Label>
                          <Input 
                            placeholder="e.g. Amoxicillin 500mg" 
                            value={form.name} 
                            onChange={e => updateForm({ name: e.target.value })}
                            className="h-12 rounded-2xl border-primary/20 focus-visible:ring-primary shadow-inner"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Unique Product ID (SKU)</Label>
                          <Input 
                            placeholder="e.g. NDC-12345-678" 
                            value={form.productId} 
                            onChange={e => updateForm({ productId: e.target.value })}
                            className="h-12 rounded-2xl border-primary/20 focus-visible:ring-primary shadow-inner"
                          />
                       </div>
                       <div className="space-y-2 flex flex-col">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2">Category</Label>
                          <Popover open={openCategory} onOpenChange={setOpenCategory}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-12 rounded-2xl font-semibold border-primary/10 bg-muted/20">
                                {form.category || "Select category..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
                              <Command>
                                <CommandInput placeholder="Search categories..." />
                                <CommandList>
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {categories.map((cat) => (
                                      <CommandItem
                                        key={cat._id}
                                        value={cat.name}
                                        onSelect={(val) => {
                                          updateForm({ category: val });
                                          setOpenCategory(false);
                                        }}
                                        className="py-3 px-4 cursor-pointer"
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", form.category === cat.name ? "opacity-100" : "opacity-0")} />
                                        {cat.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Manufacturer Brand</Label>
                          <Input 
                            placeholder="e.g. PharmaCorp" 
                            value={form.brand} 
                            onChange={e => updateForm({ brand: e.target.value })}
                            className="h-12 rounded-2xl border-primary/20 focus-visible:ring-primary shadow-inner"
                          />
                       </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <FileText className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Specifications</h2>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Market Price (Optional)</Label>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={form.price} 
                            onChange={e => updateForm({ price: e.target.value })}
                            className="h-12 rounded-2xl border-primary/20 focus-visible:ring-primary shadow-inner w-full sm:w-1/2"
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 underline decoration-primary/30 underline-offset-4">Patient Information Guide</Label>
                          <Textarea 
                            placeholder="Describe dosage instructions, side effects, or batch-specific details..." 
                            value={form.description} 
                            onChange={e => updateForm({ description: e.target.value })}
                            className="min-h-[160px] rounded-3xl border-primary/10 focus-visible:ring-primary bg-muted/5 p-4"
                          />
                          <p className="text-[10px] text-muted-foreground font-medium italic">This info is presented instantly to consumers upon scanning the QR code.</p>
                       </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-primary mb-2">
                       <ImageIconIcon className="h-6 w-6" />
                       <h2 className="text-xl font-bold">Product Visuals</h2>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 min-h-[140px] p-6 bg-muted/10 rounded-3xl border-2 border-dashed border-primary/10">
                       <AnimatePresence>
                         {form.images.map((file, idx) => (
                           <motion.div
                             key={idx}
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.8 }}
                             className="relative w-28 h-28 rounded-2xl shadow-xl overflow-hidden group"
                           >
                              <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                              <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-destructive/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                 <X className="h-6 w-6" />
                              </button>
                           </motion.div>
                         ))}
                       </AnimatePresence>
                       
                       <Label 
                         htmlFor="img-up" 
                         className={cn("w-28 h-28 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors", uploading && "opacity-50")}
                       >
                          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6 text-primary" />}
                          <span className="text-[10px] font-black uppercase mt-2">Add</span>
                          <input id="img-up" type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                       </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">High-resolution packaging images help consumers verify physical appearance.</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6">
                   {step > 1 ? (
                     <Button variant="ghost" onClick={prevStep} className="rounded-full px-6 font-bold text-muted-foreground hover:text-foreground">
                        Back
                     </Button>
                   ) : <div />}
                   
                   {step < 3 ? (
                     <Button onClick={nextStep} className="rounded-full px-8 h-12 bg-primary hover:bg-primary/90 font-black tracking-tight shadow-lg shadow-primary/20">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                     </Button>
                   ) : (
                     <Button 
                       onClick={handleSave} 
                       disabled={saving} 
                       className="rounded-full px-10 h-12 bg-green-500 hover:bg-green-600 font-black tracking-tight shadow-lg shadow-green-500/20 gap-2"
                     >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                        {saving ? "Enrolling..." : "Finish & Enroll"}
                     </Button>
                   )}
                </div>
             </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
