"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCabinetItem, updateCabinetItem, markDoseTaken, CabinetItem } from "@/api/customer.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  Pill,
  Clock,
  Calendar,
  ShieldCheck,
  Save,
  Trash2,
  Bell,
  Activity,
  FileText,
  Plus,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImages } from "@/api/upload.api";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function MedicineDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [medicine, setMedicine] = useState<CabinetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    composition: "",
    medicineCode: "",
    expiryDate: undefined as Date | undefined,
    dosage: "",
    frequency: "",
    notes: "",
    currentQuantity: 0,
    totalQuantity: 0,
    reminderTimes: [] as string[],
    prescriptions: [] as { url: string; label: string; uploadedAt: string }[],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoading(true);
      try {
        const item = await getCabinetItem(id, controller.signal);
        setMedicine(item);
        setFormData({
          name: item.name || "",
          brand: item.brand || "",
          composition: item.composition || "",
          medicineCode: item.medicineCode || (item.isUserAdded ? "N/A" : item.batchNumber || "VERIFIED"),
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          dosage: item.dosage || "",
          frequency: item.frequency || "",
          notes: item.notes || "",
          currentQuantity: item.currentQuantity || 0,
          totalQuantity: item.totalQuantity || 0,
          reminderTimes: item.reminderTimes || [],
          prescriptions: item.prescriptions || [],
        });
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Failed to load medicine:", err);
        toast.error("Medicine not found in your library.");
        router.push("/customer/cabinet");
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => fetchAbortRef.current?.abort();
  }, [id, router]);

  const handleSave = async (updatedData?: Partial<typeof formData & { images: string[] }> | React.MouseEvent) => {
    if (!id) return;
    setIsSaving(true);
    
    const actualData = (updatedData && !(updatedData as any).nativeEvent) 
      ? { ...formData, ...(updatedData as any) } 
      : formData;

    try {
      const today = new Date();
      const mappedReminders = (actualData.reminderTimes || []).map((timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(today);
        date.setHours(hours, minutes, 0, 0);
        return {
          time: date.toISOString(),
          mealContext: 'no_preference'
        };
      });

      const payload = {
        ...actualData,
        reminderTimes: mappedReminders as any,
        images: (updatedData as any)?.images || medicine?.images,
        expiryDate: actualData.expiryDate instanceof Date ? actualData.expiryDate.toISOString() : actualData.expiryDate
      };

      await updateCabinetItem(id, payload as any);
      toast.success("Treatment plan updated!");
      if (updatedData) {
        setFormData(prev => ({ ...prev, ...updatedData }));
        if ((updatedData as any).images) {
          setMedicine(prev => prev ? { ...prev, images: (updatedData as any).images } : null);
        }
        // If we updated global fields, refresh medicine info
        if ((updatedData as any).name || (updatedData as any).brand || (updatedData as any).composition) {
           setMedicine(prev => prev ? { 
             ...prev, 
             ...updatedData,
             expiryDate: (updatedData as any).expiryDate instanceof Date 
               ? (updatedData as any).expiryDate.toISOString() 
               : (updatedData as any).expiryDate 
           } as any : null);
        }
      }
    } catch (err: any) {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakeDose = async () => {
    if (!id || !medicine) return;
    try {
      const res = await markDoseTaken(id);
      setFormData(prev => ({ ...prev, currentQuantity: res.currentQuantity }));
      toast.success("Dose recorded", {
        description: `Remaining: ${res.currentQuantity} ${medicine.unit || 'units'}`,
      });
    } catch (err) {
      toast.error("Failed to record dose");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await uploadImages(Array.from(files));
      const newPrescriptions = urls.map((url, i) => ({
        url,
        label: files[i].name.split('.')[0], 
        uploadedAt: new Date().toISOString()
      }));

      const updatedPrescriptions = [...formData.prescriptions, ...newPrescriptions];
      await handleSave({ prescriptions: updatedPrescriptions });
    } catch (error) {
      toast.error("Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const urls = await uploadImages(Array.from(files));
      const updatedImages = [...(medicine?.images || []), ...urls];
      await handleSave({ images: updatedImages });
      toast.success("Packaging photos updated.");
    } catch (error) {
      toast.error("Failed to upload images.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const removePrescription = async (url: string) => {
    const updated = formData.prescriptions.filter(p => p.url !== url);
    await handleSave({ prescriptions: updated });
  };

  const removeImage = async (url: string) => {
    const updated = (medicine?.images || []).filter(img => img !== url);
    await handleSave({ images: updated });
  };

  const addReminder = () => {
    setFormData(prev => ({
      ...prev,
      reminderTimes: [...prev.reminderTimes, "08:00"]
    }));
  };

  const updateReminder = (index: number, time: string) => {
    const newTimes = [...formData.reminderTimes];
    newTimes[index] = time;
    setFormData(prev => ({ ...prev, reminderTimes: newTimes }));
  };

  const removeReminder = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!medicine) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="rounded-xl h-10 w-10 border-primary/10 hover:bg-primary/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{medicine.name}</h1>
            {!medicine.isUserAdded && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-bold text-[10px] uppercase tracking-wider">
                Verified Authentic
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground font-black uppercase tracking-[0.2em] text-xs mt-0.5">
            {medicine.brand} • {medicine.composition || "Verification in progress"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="p-6 rounded-[2rem] border-primary/5 bg-card/50 overflow-hidden relative shadow-sm">
            <div className="absolute top-0 right-0 p-6 text-primary/5 pointer-events-none">
              <ShieldCheck className="w-24 h-24" />
            </div>
            
            <h3 className="text-xs font-black tracking-widest uppercase text-muted-foreground mb-6">
              Product Passport
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                  {medicine.isUserAdded ? "Medicine Code" : "Batch Number"}
                </p>
                {medicine.isUserAdded ? (
                  <Input 
                    value={formData.medicineCode}
                    onChange={(e) => setFormData(p => ({ ...p, medicineCode: e.target.value }))}
                    className="h-9 rounded-xl border-primary/10 bg-background/50 font-mono text-xs font-black tracking-wider"
                  />
                ) : (
                  <p className="font-mono text-sm font-black tracking-wider bg-background/50 py-1.5 px-3 rounded-xl border border-border/50">
                    {medicine.batchNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">Expiration</p>
                {medicine.isUserAdded ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-10 justify-start text-left font-bold p-0 hover:bg-transparent",
                          !formData.expiryDate && "text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3 w-full">
                           <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                             <Clock className="h-4 w-4" />
                           </div>
                           <div className="flex-1">
                             <p className="font-bold text-sm">
                               {formData.expiryDate ? format(formData.expiryDate, "MMMM yyyy") : "No date set"}
                             </p>
                           </div>
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.expiryDate}
                        onSelect={(date) => setFormData(p => ({ ...p, expiryDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : medicine.expiryDate && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {format(new Date(medicine.expiryDate), "MMMM yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Saved On</p>
                  <p className="font-bold text-sm mt-0.5">
                    {medicine.createdAt ? format(new Date(medicine.createdAt), "PPP") : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {!medicine.isUserAdded && medicine.salt && (
              <Button 
                asChild
                variant="outline"
                className="w-full mt-6 rounded-[1.25rem] border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black text-[10px] uppercase tracking-widest h-10 transition-all"
              >
                <Link href={`/verify?salt=${medicine.salt}`}>
                  Real-time blockchain audit
                </Link>
              </Button>
            )}
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 rounded-[2.5rem] border-primary/10 shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-xl font-black flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary" />
                Dose Management
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleTakeDose}
                  variant="outline"
                  className="flex-1 sm:flex-none rounded-full px-6 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold h-10"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Record Dose
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 sm:flex-none rounded-full px-6 shadow-lg shadow-primary/20 gap-2 h-10 font-bold"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Sync Schedule
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Standard Dosage</Label>
                  <div className="relative">
                    <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                    <Input 
                      placeholder="e.g. 1 Tablet (500mg)" 
                      className="pl-10 h-12 rounded-2xl border-primary/5 bg-muted/20 focus-visible:ring-primary/20 font-medium"
                      value={formData.dosage}
                      onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Qty</Label>
                    <Input 
                      type="number"
                      placeholder="Remaining" 
                      className="h-12 rounded-2xl border-primary/5 bg-muted/20 focus-visible:ring-primary/20 font-medium"
                      value={formData.currentQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentQuantity: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Qty</Label>
                    <Input 
                      type="number"
                      placeholder="Capacity" 
                      className="h-12 rounded-2xl border-primary/5 bg-muted/20 focus-visible:ring-primary/20 font-medium"
                      value={formData.totalQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, totalQuantity: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Regimen Frequency</Label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                    <Input 
                      placeholder="e.g. Twice Daily" 
                      className="pl-10 h-12 rounded-2xl border-primary/5 bg-muted/20 focus-visible:ring-primary/20 font-medium"
                      value={formData.frequency}
                      onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Smart Reminders</Label>
                  <Button variant="ghost" size="sm" onClick={addReminder} className="h-7 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 text-primary">
                    <Plus className="h-3 w-3 mr-1" /> Add Alert
                  </Button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {formData.reminderTimes.map((time, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 group/item"
                    >
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input 
                          type="time" 
                          value={time}
                          onChange={(e) => updateReminder(idx, e.target.value)}
                          className="pl-8 h-10 rounded-xl border-primary/5 bg-muted/10 font-bold text-xs"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeReminder(idx)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                  {formData.reminderTimes.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic p-2 bg-muted/20 rounded-xl border border-dashed text-center">
                      No reminders set for this medicine.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-8 opacity-40" />

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              multiple
            />
            <input 
              type="file" 
              ref={imageInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
              multiple
            />

            {/* Prescriptions & Documents Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-black flex items-center gap-3">
                    <FileText className="h-6 w-6 text-primary" />
                    Medical Documents
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Store your prescriptions and clinical notes securely.</p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  variant="outline"
                  className="rounded-full px-6 border-primary/20 hover:bg-primary/5 gap-2 h-10 font-bold text-xs border-2"
                >
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add Document
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.prescriptions.map((p, idx) => (
                  <div key={idx} className="group/doc relative flex items-center justify-between p-4 rounded-3xl border border-primary/5 bg-background/50 hover:border-primary/20 transition-all hover:shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover/doc:bg-primary group-hover/doc:text-white transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate tracking-tight">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium truncate">Uploaded {new Date(p.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary">
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                           <Activity className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removePrescription(p.url)} className="h-8 w-8 rounded-full hover:bg-red-50 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {formData.prescriptions.length === 0 && (
                  <div className="sm:col-span-2 py-8 flex flex-col items-center justify-center text-center text-muted-foreground opacity-40 bg-muted/5 rounded-[2rem] border border-dashed border-primary/10">
                    <FileText className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Your vault is empty.</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-8 opacity-40" />

            {/* Packaging Photos Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-lg font-black flex items-center gap-3">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    Packaging Photos
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Keep photographic proof of original packaging and lot numbers.</p>
                </div>
                <Button 
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  variant="outline"
                  className="rounded-full px-6 border-primary/20 hover:bg-primary/5 gap-2 h-10 font-bold text-xs border-2"
                >
                  {isUploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Capture Photo
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {medicine.images?.map((img, idx) => (
                  <div key={idx} className="group/img relative aspect-square rounded-[1.5rem] overflow-hidden border border-primary/5 shadow-sm group hover:border-primary/20 transition-all">
                    <img src={img} alt={`Packaging ${idx}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40">
                         <a href={img} target="_blank" rel="noopener noreferrer">
                            <Activity className="h-4 w-4" />
                         </a>
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => removeImage(img)} className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-red-500/80">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
                {(!medicine.images || medicine.images.length === 0) && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-muted-foreground opacity-40 bg-muted/5 rounded-[2.5rem] border border-dashed border-primary/10">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">No packaging photos added yet.</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-8 opacity-40" />
            
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes & Observations</Label>
              <Textarea 
                placeholder="e.g. Occasional drowsiness, take after meal..." 
                className="min-h-[120px] rounded-[1.5rem] border-primary/5 bg-muted/20 focus-visible:ring-primary/20 font-medium resize-none p-4"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-[2rem] border-emerald-500/10 bg-emerald-500/[0.02] flex items-start gap-4">
             <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
               <CheckCircle2 className="h-6 w-6" />
             </div>
             <div>
               <h4 className="font-black text-emerald-900 dark:text-emerald-400">Intelligent Safety Monitoring</h4>
               <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                 Our background agents monitor this specific batch ID 24/7. You will receive a high-priority push notification and email if any security flags are raised by the manufacturer or global health authorities.
               </p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
