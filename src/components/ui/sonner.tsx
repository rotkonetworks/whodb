import { useTheme } from "@/components/theme-provider-simple"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-muted/90",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border hover:group-[.toast]:bg-muted",
          success:
            "group-[.toaster]:bg-green-500/10 group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/30 group-[.toaster]:backdrop-blur-sm",
          error:
            "group-[.toaster]:bg-red-500/10 group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/30 group-[.toaster]:backdrop-blur-sm",
          info:
            "group-[.toaster]:bg-blue-500/10 group-[.toaster]:text-blue-400 group-[.toaster]:border-blue-500/30 group-[.toaster]:backdrop-blur-sm",
          loading:
            "group-[.toaster]:bg-amber-500/10 group-[.toaster]:text-amber-400 group-[.toaster]:border-amber-500/30 group-[.toaster]:backdrop-blur-sm",
          warning:
            "group-[.toaster]:bg-amber-500/10 group-[.toaster]:text-amber-400 group-[.toaster]:border-amber-500/30 group-[.toaster]:backdrop-blur-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
