import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Sparkles, Upload, ShieldAlert } from "lucide-react";
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

export function DisposalProofDialog({ open, onOpenChange, centre, wasteClass, detectionId, onAwarded }: DisposalProofDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  const points = wasteClass ? ecoPointsForClass(wasteClass) : 25;

  const pick = (f: File | undefined) => {
    if (!f) return;
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

      // Prevent duplicate claim for the same detection
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

      // 1) AI verification
      setStage("Verifying photo with AI…");
      const base64 = await fileToBase64(file);
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

      // 2) Upload
      setStage("Uploading proof…");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("disposal-proofs").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (up.error) throw up.error;

      // 3) Insert (unique index prevents duplicates server-side too)
      setStage("Awarding eco-points…");
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

      // 4) Increment eco_score via server-validated RPC
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upload proof of disposal
          </DialogTitle>
          <DialogDescription>
            {centre ? (
              <>Photo must clearly show the <b>{wasteClass ?? "waste"}</b> being dropped into the bin at <b>{centre.name}</b>. Verified photos earn <b>+{points} eco-points</b>.</>
            ) : (
              "Snap or upload a photo of the waste in the bin."
            )}
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => !busy && inputRef.current?.click()}
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

        {rejectReason && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">Photo rejected</div>
              <div className="text-muted-foreground">{rejectReason}</div>
            </div>
          </div>
        )}

        {busy && stage && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> {stage}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!file || busy}
            style={{ background: "var(--gradient-primary)" }}
            className="text-primary-foreground"
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Verify & claim +{points}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
