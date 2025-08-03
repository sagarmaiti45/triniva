"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, Sparkles, Image as ImageIcon, Palette, Settings2, Wand2, Edit3, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";
import { useGuestId } from "@/hooks/use-guest-id";
import { useAuth } from "@/contexts/simple-auth-context";
import { AuthModal } from "@/components/auth-modal";

const formSchema = z.object({
  prompt: z.string().min(1, "Please enter a prompt"),
  negative_prompt: z.string().optional(),
  style_preset: z.string().optional(),
  model: z.string().optional(),
  cfg_scale: z.number().min(1).max(10),
  width: z.number(),
  height: z.number(),
});

type FormData = z.infer<typeof formSchema>;

const aspectRatios = [
  { label: "Square (1:1)", shortLabel: "1:1", width: 1024, height: 1024, ratio: "1:1" },
  { label: "Landscape (16:9)", shortLabel: "16:9", width: 1344, height: 768, ratio: "16:9" },
  { label: "Portrait (9:16)", shortLabel: "9:16", width: 768, height: 1344, ratio: "9:16" },
  { label: "Photo (3:2)", shortLabel: "3:2", width: 1216, height: 832, ratio: "3:2" },
  { label: "Portrait (2:3)", shortLabel: "2:3", width: 832, height: 1216, ratio: "2:3" },
];

const modelOptions = [
  { 
    value: "sd3.5-flash", 
    label: "Fast (2.5 credits)", 
    credits: 2.5, 
    enabled: true,
    description: "Best value - Fast generation"
  },
  { 
    value: "sd3.5-medium", 
    label: "Balanced (3.5 credits)", 
    credits: 3.5, 
    enabled: true,
    description: "Good quality and speed"
  },
  { 
    value: "sd3.5-large-turbo", 
    label: "High Quality (4 credits)", 
    credits: 4, 
    enabled: true,
    description: "Premium quality, fast"
  },
];

const stylePresets = [
  { value: "none", label: "None" },
  { value: "photographic", label: "Photographic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "anime", label: "Anime" },
  { value: "digital-art", label: "Digital Art" },
  { value: "3d-model", label: "3D Model" },
];

export function ImageGenerator() {
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState(aspectRatios[0]);
  const [previewMode, setPreviewMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const [generationLimits, setGenerationLimits] = useState<{
    used: number;
    limit: number;
    remaining: number;
    isGuest: boolean;
  } | null>(null);
  
  const guestId = useGuestId();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      negative_prompt: "",
      style_preset: "none",
      model: "sd3.5-flash",
      cfg_scale: 4,
      width: selectedRatio.width,
      height: selectedRatio.height,
    },
  });

  const cfgScale = watch("cfg_scale");

  // Update dimensions when ratio changes
  const updateDimensions = () => {
    setValue("width", selectedRatio.width);
    setValue("height", selectedRatio.height);
  };
  
  // Fetch generation limits on mount and when user changes
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const params = new URLSearchParams();
        if (guestId && !user) {
          params.append('guestId', guestId);
        }
        
        const response = await fetch(`/api/chat-history?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setGenerationLimits(data.limits);
        }
      } catch (error) {
        console.error('Failed to fetch limits:', error);
      }
    };
    
    fetchLimits();
  }, [user, guestId]);

  const onSubmit = async (data: FormData) => {
    // Prevent rapid-fire submissions
    const now = Date.now();
    if (now - lastGenerationTime < 2000) {
      toast.error("Please wait a moment before generating another image");
      return;
    }
    
    // Check limits before generating
    if (generationLimits && generationLimits.remaining === 0) {
      if (generationLimits.isGuest) {
        setShowAuthModal(true);
        toast.error("You've reached the free limit. Please sign in to continue!");
      } else {
        toast.error("You've used all your free generations. Premium subscription coming soon!");
      }
      return;
    }
    
    setIsGenerating(true);
    setLastGenerationTime(now);
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          width: selectedRatio.width,
          height: selectedRatio.height,
          mode: previewMode ? 'preview' : 'full',
          guestId: !user ? guestId : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429 && result.limits) {
          setGenerationLimits(result.limits);
          if (result.limits.isGuest) {
            setShowAuthModal(true);
          }
        }
        throw new Error(result.error || "Failed to generate image");
      }

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        toast.success("Image generated successfully!");
        
        // Update limits from response
        if (result.generationLimits) {
          setGenerationLimits(result.generationLimits);
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artisan-ai-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  return (
    <section className="w-full">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full max-w-sm md:max-w-lg mx-auto grid-cols-3 mb-4 md:mb-6">
          <TabsTrigger value="generate" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="enhance" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Wand2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Enhance
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-1.5 md:gap-2 text-xs md:text-sm">
            <Edit3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Edit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Modern Prompt Input Section */}
            <div className="relative w-full max-w-4xl mx-auto space-y-3">
              <div className="relative rounded-xl p-4 md:p-6 transition-all duration-200 bg-card border border-border">
                <Textarea
                  id="prompt"
                  placeholder="Describe the image you want to create..."
                  className="min-h-[100px] md:min-h-[120px] w-full resize-none border-0 bg-transparent text-base md:text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:border-transparent font-dm-sans font-normal"
                  style={{ outline: 'none', boxShadow: 'none' }}
                  {...register("prompt")}
                />
                
                {/* Bottom Controls - Desktop only */}
                <div className="hidden md:flex mt-4 flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Model Selector */}
                    <Select
                      value={watch("model")}
                      onValueChange={(value) => setValue("model", value)}
                    >
                      <SelectTrigger className="h-9 w-[180px] border-0 bg-gray-50 dark:bg-secondary/50">
                        <div className="flex items-center gap-2 truncate">
                          <Cpu className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {modelOptions.find(m => m.value === watch("model"))?.label || "Select Model"}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent 
                        className="w-[320px] p-1 max-h-[300px] overflow-y-auto"
                        position="popper"
                        sideOffset={5}
                        align="start"
                      >
                        {modelOptions.map((model) => (
                          <SelectItem 
                            key={model.value} 
                            value={model.value}
                            disabled={!model.enabled}
                            className="relative py-3 pr-20"
                          >
                            <div className="flex flex-col gap-1">
                              <span className={`font-medium ${!model.enabled ? "opacity-50" : ""}`}>
                                {model.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </div>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gradient-start whitespace-nowrap">
                              {model.credits} credits
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Style Preset Dropdown */}
                    <Select
                      value={watch("style_preset")}
                      onValueChange={(value) => setValue("style_preset", value)}
                    >
                      <SelectTrigger className="h-9 w-[140px] border-0 bg-gray-50 dark:bg-secondary/50">
                        <Palette className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {stylePresets.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Aspect Ratio Dropdown */}
                    <Select
                      value={`${selectedRatio.width}x${selectedRatio.height}`}
                      onValueChange={(value) => {
                        const ratio = aspectRatios.find(r => `${r.width}x${r.height}` === value);
                        if (ratio) setSelectedRatio(ratio);
                      }}
                    >
                      <SelectTrigger className="h-9 w-[160px] border-0 bg-gray-50 dark:bg-secondary/50">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <ImageIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {selectedRatio.shortLabel || selectedRatio.label?.split(' ')[0] || 'Square'}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {aspectRatios.map((ratio) => (
                          <SelectItem key={ratio.label} value={`${ratio.width}x${ratio.height}`} className="py-2">
                            {ratio.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Advanced Settings Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 bg-gray-50 dark:bg-transparent"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Advanced
                    </Button>
                  </div>

                  {/* Generate Button - Desktop */}
                  <Button
                    type="submit"
                    size="lg"
                    variant="default"
                    disabled={isGenerating || !watch("prompt")}
                    className="px-6 bg-[#e6175f] hover:bg-[#d01052] dark:bg-[#ff3d7f] dark:hover:bg-[#ff2d70] text-white border-0 disabled:opacity-100 disabled:bg-[#e6175f] dark:disabled:bg-[#ff3d7f] disabled:cursor-not-allowed"
                  >
                      {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {previewMode ? "Generating Preview..." : "Generating..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Mobile Controls - Below textarea */}
                <div className="flex md:hidden mt-3 items-center justify-center gap-2">
                  {/* Aspect Ratio Dropdown */}
                  <Select
                    value={`${selectedRatio.width}x${selectedRatio.height}`}
                    onValueChange={(value) => {
                      const ratio = aspectRatios.find(r => `${r.width}x${r.height}` === value);
                      if (ratio) setSelectedRatio(ratio);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] border-0 bg-gray-50 dark:bg-secondary/50 text-sm">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <ImageIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {selectedRatio.shortLabel || selectedRatio.label?.split(' ')[0] || 'Square'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5}>
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio.label} value={`${ratio.width}x${ratio.height}`} className="py-2">
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Advanced Settings Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 bg-gray-50 dark:bg-transparent text-sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                </div>
                
                {errors.prompt && (
                  <p className="text-sm text-destructive mt-2">{errors.prompt.message}</p>
                )}
              </div>

              {/* Generate Button - Mobile Only */}
              <div className="md:hidden flex justify-center mt-4">
                <Button
                  type="submit"
                  size="lg"
                  variant="default"
                  disabled={isGenerating || !watch("prompt")}
                  className="w-[200px] bg-[#e6175f] hover:bg-[#d01052] dark:bg-[#ff3d7f] dark:hover:bg-[#ff2d70] text-white border-0 disabled:opacity-100 disabled:bg-[#e6175f] dark:disabled:bg-[#ff3d7f] disabled:cursor-not-allowed"
                >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {previewMode ? "Generating Preview..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
              </div>
            </div>

            {/* Advanced Settings Panel */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="rounded-xl bg-card border border-border p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Mobile: Model and Style selectors */}
                    <div className="grid grid-cols-2 gap-3 md:hidden">
                      <Select
                        value={watch("model")}
                        onValueChange={(value) => setValue("model", value)}
                      >
                        <SelectTrigger className="h-9 border-0 bg-gray-50 dark:bg-secondary/50">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate text-sm">
                              {modelOptions.find(m => m.value === watch("model"))?.label.replace("SD 3.5 ", "").replace("Stable Image ", "")||"Model"}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="w-[280px]">
                          {modelOptions.map((model) => (
                            <SelectItem 
                              key={model.value} 
                              value={model.value}
                              disabled={!model.enabled}
                            >
                              <span className={`text-sm ${!model.enabled ? "opacity-50" : ""}`}>
                                {model.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={watch("style_preset")}
                        onValueChange={(value) => setValue("style_preset", value)}
                      >
                        <SelectTrigger className="h-9 border-0 bg-gray-50 dark:bg-secondary/50">
                          <div className="flex items-center gap-1.5">
                            <Palette className="h-3.5 w-3.5" />
                            <span className="text-sm">Style</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {stylePresets.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="negative_prompt">Negative Prompt</Label>
                        <Textarea
                          id="negative_prompt"
                          placeholder="Things to avoid: blurry, bad quality, distorted..."
                          className="min-h-[80px] resize-none font-dm-sans font-normal"
                          {...register("negative_prompt")}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Guidance Scale</Label>
                            <span className="text-sm text-muted-foreground">{cfgScale}</span>
                          </div>
                          <Slider
                            min={1}
                            max={10}
                            step={0.5}
                            value={[cfgScale]}
                            onValueChange={(value) => setValue("cfg_scale", value[0])}
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generated Images Display - Only show after generation starts */}
            <AnimatePresence>
              {(isGenerating || generatedImages.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="rounded-xl bg-card border border-border p-6 min-h-[400px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {generatedImages.length > 0 ? (
                        <motion.div
                          key="images"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="grid grid-cols-1 gap-4 w-full"
                        >
                          {generatedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <Image
                                src={image}
                                alt={`Generated image ${index + 1}`}
                                width={selectedRatio.width}
                                height={selectedRatio.height}
                                className="rounded-lg w-full h-auto"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="glass"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  downloadImage(image, index);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="generating"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center"
                        >
                          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-gradient-start" />
                          <p className="text-lg font-medium">Generating your image...</p>
                          <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {generatedImages.length > 0 && previewMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg bg-gradient-primary-light border border-gradient-start/20"
                    >
                      <p className="text-sm font-medium mb-2">Preview Mode Active</p>
                      <p className="text-xs text-muted-foreground">
                        This is a low-quality preview. Click "Generate Full Quality" for the final image.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </TabsContent>

        <TabsContent value="enhance" className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border p-12 text-center"
          >
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-20" />
              <Wand2 className="relative h-16 w-16 mx-auto mb-6 text-gradient-start" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Image Enhancement Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Upscale and enhance your images with AI-powered tools. 
              Improve resolution, fix artifacts, and bring your images to life.
            </p>
          </motion.div>
        </TabsContent>

        <TabsContent value="edit" className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card border border-border p-12 text-center"
          >
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-20" />
              <Edit3 className="relative h-16 w-16 mx-auto mb-6 text-gradient-start" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Smart Editing Features Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Edit your images with intelligent tools. Remove objects, 
              change backgrounds, and modify specific areas with precision.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-lg bg-secondary/20">
                <div className="h-12 w-12 rounded-lg bg-gradient-primary-light flex items-center justify-center mx-auto">
                  <Wand2 className="h-6 w-6 text-gradient-start" />
                </div>
                <h4 className="font-semibold mt-3">Magic Eraser</h4>
                <p className="text-sm text-muted-foreground mt-1">Remove unwanted objects seamlessly</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/20">
                <div className="h-12 w-12 rounded-lg bg-gradient-primary-light flex items-center justify-center mx-auto">
                  <Palette className="h-6 w-6 text-gradient-start" />
                </div>
                <h4 className="font-semibold mt-3">Background Replace</h4>
                <p className="text-sm text-muted-foreground mt-1">Change backgrounds with one click</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/20">
                <div className="h-12 w-12 rounded-lg bg-gradient-primary-light flex items-center justify-center mx-auto">
                  <Edit3 className="h-6 w-6 text-gradient-start" />
                </div>
                <h4 className="font-semibold mt-3">Selective Editing</h4>
                <p className="text-sm text-muted-foreground mt-1">Edit specific areas with precision</p>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* Auth Modal for guests who hit limit */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </section>
  );
}