/**
 * Utility module for handling PDF export via native browser print engine (Approach A).
 */

/**
 * Triggers native browser print dialog for the main window, applying print-hidden styling 
 * and ensuring that any debugging markups or outlines are fully hidden.
 */
export function triggerSystemPrint(onBeforePrint?: () => void, onAfterPrint?: () => void): void {
  if (onBeforePrint) onBeforePrint();

  // Listen for the native print dialog closure to execute cleanup
  const handleAfterPrint = () => {
    window.removeEventListener('afterprint', handleAfterPrint);
    if (onAfterPrint) onAfterPrint();
  };
  window.addEventListener('afterprint', handleAfterPrint);

  // Trigger browser print
  setTimeout(() => {
    window.print();
    // Fallback: If afterprint doesn't fire immediately (some browsers trigger it asynchronously/synchronously),
    // we also trigger the cleanup after a short delay to ensure the UI toast closes.
    setTimeout(() => {
      handleAfterPrint();
    }, 1000);
  }, 200);
}
