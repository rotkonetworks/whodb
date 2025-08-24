import { DialogContentProps, DialogTitle } from "@radix-ui/react-dialog";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/lib/ui";

export const GenericDialog = ({ open, onOpenChange, description, title, children, footer, }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  props?: DialogContentProps;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-[#2C2B2B] dark:text-[#FFFFFF] border-[#E6007A]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}