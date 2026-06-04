import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ShieldCheck, Upload, ShieldAlert, ImagePlus, X, Sparkles } from "lucide-react";
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
  detectionId?: string | null;
  onAwarded?: (points: number) => void;
}

const VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-proof`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1]);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const STAGES = [
  "Hashing image…",
  "Verifying coordinates…",
  "Cross-checking AI vision…",
  "Awarding eco-points…",
];

export function DisposalProofDialog({ open, onOpenChange, centre, wasteClass, detectionId, onAwarded }: DisposalProofDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const points = wasteClass ? ecoPointsForClass(wasteClass) : 25;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRejectReason(null);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setBusy(false);
    setStage("");
    setRejectReason(null);
    setDragging(false);
  };

  const submit = async () => {
    if (!file || !centre) return;
    setBusy(true);
    setRejectReason(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!user) {
        toast.error("Please sign in to claim eco-points.");
        return;
      }

      if (detectionId) {
        const { data: existing } = await supabase
          .from("disposal_proofs")
          .select("id")
          .eq("user_id", user.id)
          .eq("detection_id", detectionId)
          .maybeSingle();
        if (existing) {
          toast.error("Eco-points already claimed for this detection.");
          setBusy(false);
          return;
        }
      }

      setStage(STAGES[0]);
      const base64 = await fileToBase64(file);
      setStage(STAGES[2]);
      const vRes = await fetch(VERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || "image/jpeg",
          wasteClass,
          centreName: centre.name,
        }),
      });
      const v = await vRes.json().catch(() => ({ valid: false, reason: "Bad verifier response." }));
      if (!v.valid) {
        setRejectReason(v.reason || "Photo did not pass verification. Please retake clearly showing the waste in the bin at the centre.");
        setBusy(false);
        return;
      }

      setStage("Uploading proof…");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("disposal-proofs").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (up.error) throw up.error;

      setStage(STAGES[3]);
      const { error: insErr } = await supabase.from("disposal_proofs").insert({
        user_id: user.id,
        detection_id: detectionId ?? null,
        centre_id: centre.id,
        centre_name: centre.name,
        image_path: path,
        eco_points_awarded: points,
      });
      if (insErr) {
        if (insErr.code === "23505") {
          toast.error("Eco-points already claimed for this detection.");
          return;
        }
        throw insErr;
      }

      await supabase.rpc("increment_eco_score", { delta: points });

      toast.success(`🎉 +${points} eco-points awarded!`, {
        description: `Verified disposal at ${centre.name}.`,
      });
      onAwarded?.(points);
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error("Could not submit proof. Please try again.");
    } finally {
      setBusy(false);
      setStage("");
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
      <DialogContent className="sm:max-w-lg glass-strong border-0 p-0 overflow-hidden">
        {/* Header band */}
        <div className="relative px-6 pt-6 pb-4"
             style={{
               background:
                 "radial-gradient(80% 80% at 100% 0%, color-mix(in oklab, var(--neon) 22%, transparent), transparent), radial-gradient(80% 80% at 0% 100%, color-mix(in oklab, var(--neon-cyan) 18%, transparent), transparent)",
             }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-background/70 border">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </span>
              Verify your dumping
              <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-background/80 border">
                <Sparkles className="h-3 w-3 text-primary" /> +{points} pts
              </span>
            </DialogTitle>
            <DialogDescription className="mt-1">
              {centre ? (
                <>Snap a photo clearly showing the <b>{wasteClass ?? "waste"}</b> being dropped at <b>{centre.name}</b>. AI cross-checks the image &amp; coordinates before awarding points.</>
              ) : (
                "Snap or upload a photo of the waste in the bin."
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Drop zone */}
          <div
            data-drag={dragging}
            className="drop-zone p-5 min-h-[200px] grid place-items-center cursor-pointer"
            onClick={() => !busy && !preview && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (busy) return;
              const f = e.dataTransfer.files?.[0];
              pick(f);
            }}
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
              <div className="relative w-full">
                <div className="relative mx-auto w-fit rounded-xl overflow-hidden neon-border">
                  <img src={preview} alt="proof preview" className="max-h-64 block" />
                  {busy && (
                    <div className="absolute inset-0 bg-background/60 grid place-items-center backdrop-blur-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border text-xs font-medium">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stage || "Verifying…"}
                      </div>
                    </div>
                  )}
                </div>
                {!busy && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1" /> Replace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      <X className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto h-14 w-14 grid place-items-center rounded-2xl bg-background/70 border mb-3">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="font-semibold">Drag &amp; drop a photo here</div>
                <div className="text-xs text-muted-foreground mt-1">
                  or <span className="text-primary font-medium">tap to take / upload</span> · PNG, JPG up to 10 MB
                </div>
              </div>
            )}
          </div>

          {/* Shimmer progress while busy */}
          {busy && (
            <div className="space-y-2">
              <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                <div className="h-full w-full shimmer rounded-full" />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {stage}
              </div>
            </div>
          )}

          {rejectReason && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm flex gap-2 animate-sheet-up">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-destructive">Photo rejected</div>
                <div className="text-muted-foreground">{rejectReason}</div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!file || busy}
              style={{ background: "var(--gradient-neon)" }}
              className="text-white font-semibold neon-shadow"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Verify &amp; claim +{points}</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
