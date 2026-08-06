import { toast } from "sonner";

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Path copied");
  } catch {
    toast.error("Could not copy the path");
  }
}
