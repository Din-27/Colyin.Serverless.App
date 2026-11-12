/**
 * Universal, highly resilient clipboard copy utility.
 * Works across both HTTPS and insecure HTTP/IP contexts (where navigator.clipboard is undefined).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard (available on HTTPS and localhost)
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Reliable fallback using hidden textarea + execCommand
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Prevent scrolling or zooming in mobile browsers
      textArea.setAttribute("readonly", "");
      textArea.style.contain = "strict";
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      textArea.style.fontSize = "12pt"; // Prevent zoom on iOS
      
      const selection = document.getSelection();
      const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, 99999); // Mobile compatibility

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (originalRange && selection) {
        selection.removeAllRanges();
        selection.addRange(originalRange);
      }

      return successful;
    } catch (err) {
      console.error("[copyToClipboard] Fallback execCommand failed:", err);
      return false;
    }
  }

  return false;
}

