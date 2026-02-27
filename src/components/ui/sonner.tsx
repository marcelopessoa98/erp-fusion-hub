import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { playSuccessSound, playErrorSound, playInfoSound } from "@/lib/sounds";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Wrap toast methods with sound effects
const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  {
    ...sonnerToast,
    success: (...args: Parameters<typeof sonnerToast.success>) => {
      playSuccessSound();
      return sonnerToast.success(...args);
    },
    error: (...args: Parameters<typeof sonnerToast.error>) => {
      playErrorSound();
      return sonnerToast.error(...args);
    },
    info: (...args: Parameters<typeof sonnerToast.info>) => {
      playInfoSound();
      return sonnerToast.info(...args);
    },
  }
);

export { Toaster, toast };
