import { useEffect } from 'react';

/**
 * Hook to manage toast behavior when modals are open
 * This detects when Radix dialogs are open and adjusts toast behavior accordingly
 */
export function useModalAwareToasts() {
  useEffect(() => {
    const handleModalStateChange = () => {
      // Check if any Radix dialog or alert dialog is open
      const dialogOverlay = document.querySelector('[data-radix-dialog-overlay]');
      const alertDialogOverlay = document.querySelector('[data-radix-alert-dialog-overlay]');
      const isModalOpen = !!(dialogOverlay || alertDialogOverlay);
      
      // Add/remove modal-open class to body
      if (isModalOpen) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    };

    // Create a MutationObserver to watch for dialog changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if any added or removed nodes are dialog-related
          const nodes = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));
          const hasDialogChanges = nodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return element.hasAttribute('data-radix-dialog-overlay') ||
                     element.hasAttribute('data-radix-alert-dialog-overlay') ||
                     element.querySelector('[data-radix-dialog-overlay]') ||
                     element.querySelector('[data-radix-alert-dialog-overlay]');
            }
            return false;
          });
          
          if (hasDialogChanges) {
            handleModalStateChange();
          }
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check
    handleModalStateChange();

    // Cleanup
    return () => {
      observer.disconnect();
      document.body.classList.remove('modal-open');
    };
  }, []);
}
