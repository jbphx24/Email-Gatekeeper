import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmitEmail } from "@workspace/api-client-react";
import type { SubmitEmailMutationError } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address."),
});

type FormValues = z.infer<typeof formSchema>;

export default function Gate() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutate: submitEmail, isPending } = useSubmitEmail({
    mutation: {
      onSuccess: (_, variables) => {
        // Store authorization in session storage
        sessionStorage.setItem("email-gate-authorized", variables.data.email);
        // Redirect to the protected static site
        window.location.href = "/site/";
      },
      onError: (error: SubmitEmailMutationError) => {
        const message =
          error.data?.error ??
          error.message ??
          "Access is restricted to authorized email domains (@lathropgpm.com or @kindredbravely.com).";
        setServerError(message);
      },
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Check authorization status on mount
  useEffect(() => {
    const isAuthorized = sessionStorage.getItem("email-gate-authorized");
    if (isAuthorized) {
      window.location.href = "/site/";
      return;
    }
    // Small artificial delay to prevent UI flicker while checking
    const timer = setTimeout(() => setIsCheckingSession(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    submitEmail({ data: { email: data.email } });
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={`${import.meta.env.BASE_URL}images/bg-abstract.png`}
          alt="Abstract minimal background"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/90 backdrop-blur-[2px]" />
      </div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="glass-card rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center">
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm ring-1 ring-primary/10"
          >
            <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Secure Access
          </h1>
          <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            Please verify your identity using your authorized corporate email address to access this portal.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
            <div className="space-y-2 text-left">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="name@company.com"
                  className="pl-11"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email || !!serverError}
                />
              </div>
              
              <AnimatePresence mode="wait">
                {(errors.email || serverError) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="text-sm text-destructive font-medium flex items-start gap-1.5 overflow-hidden"
                  >
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{errors.email?.message || serverError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              className="w-full group"
              isLoading={isPending}
            >
              {!isPending && (
                <>
                  Continue to Portal
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="w-3.5 h-3.5" />
            <span>End-to-end encrypted session</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
