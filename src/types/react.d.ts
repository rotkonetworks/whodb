// React 19 compatibility fixes
declare global {
  namespace React {
    interface HTMLAttributes<T> {
      children?: React.ReactNode;
    }

    interface ButtonHTMLAttributes<T> {
      children?: React.ReactNode;
    }

    interface FormHTMLAttributes<T> {
      children?: React.ReactNode;
      onSubmit?: (event: React.FormEvent<T>) => void;
    }

    interface AnchorHTMLAttributes<T> {
      children?: React.ReactNode;
    }

    interface DivHTMLAttributes<T> {
      children?: React.ReactNode;
    }
  }
}

export { };
