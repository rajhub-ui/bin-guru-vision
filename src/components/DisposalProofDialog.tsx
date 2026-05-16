import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RRCentre } from "@/lib/rrnagar-centres";
import { ecoPointsForClass } from "@/lib/rrnagar-centres";
import type { WasteClass } from "@/lib/disposal";

export interface DisposalProofDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  centre: RRCentre | null;
  wasteClass: WasteClass | null;
  onAwarded?: (points: number) => void;
}

export function DisposalProofDialog({ open, onOpenChange, centre, wasteClass, onAwarded }: DisposalProofDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const points = wasteClass ? ecoPointsForClass(wasteClass) : 25;

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setUploading(false);
  };

  const submit = async () => {
    if (!file || !centre) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to claim eco-points.");
        return;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("disposal-proofs").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (up.error) throw up.error;

      const { error: insErr } = await supabase.from("disposal_proofs").insert({
        user_id: user.id,
        centre_id: centre.id,
        centre_name: centre.name,
        image_path: path,
        eco_points_awarded: points,
      });
      if (insErr) throw insErr;

      // Increment eco_score
      const { data: profile } = await supabase
        .from("profiles")
        .select("eco_score")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ eco_score: (profile.eco_score ?? 0) + points })
          .eq("id", user.id);
      }

      toast.success(`🎉 +${points} eco-points awarded!`, {
        description: `Thanks for disposing at ${centre.name}.`,
      });
      onAwarded?.(points);
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error("Could not upload proof. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upload proof of disposal
          </DialogTitle>
          <DialogDescription>
            {centre ? (
              <>Snap or upload a photo of the waste in the bin at <b>{centre.name}</b>. You'll earn <b>+{points} eco-points</b>.</>
            ) : (
              "Snap or upload a photo of the waste in the bin."
            )}
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed p-4 min-h-[180px] grid place-items-center cursor-pointer hover:bg-accent/40 transition"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {preview ? (
            <img src={preview} alt="proof preview" className="max-h-56 rounded-lg" />
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-60" />
              Tap to take a photo or upload from gallery
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!file || uploading}
            style={{ background: "var(--gradient-primary)" }}
            className="text-primary-foreground"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Submit & claim +{points}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
