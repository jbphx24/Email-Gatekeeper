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
        sessionStorage.setItem("email-gate-authorized", variables.data.email);
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

  useEffect(() => {
    const isAuthorized = sessionStorage.getItem("email-gate-authorized");
    if (isAuthorized) {
      window.location.href = "/site/";
      return;
    }
    const timer = setTimeout(() => setIsCheckingSession(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    submitEmail({ data: { email: data.email } });
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b1d3a" }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-7 w-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#bf1e2e", borderTopColor: "transparent" }} />
          <p className="text-sm font-medium" style={{ color: "#f7f5ef", opacity: 0.6, fontFamily: "'Source Sans 3', sans-serif" }}>Verifying access…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0b1d3a 0%, #060f1e 100%)" }}
    >
      {/* Subtle radial glow behind card */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(191,30,46,0.10) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Decorative fine lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, #f7f5ef 0px, #f7f5ef 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #f7f5ef 0px, #f7f5ef 1px, transparent 1px, transparent 60px)",
        }}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="glass-card rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center">

          {/* Shield Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 220, damping: 22 }}
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
            style={{
              background: "rgba(191, 30, 46, 0.15)",
              border: "1px solid rgba(191, 30, 46, 0.3)",
              color: "#bf1e2e",
            }}
          >
            <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>

          <h1
            className="text-3xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "#f7f5ef" }}
          >
            Secure Access
          </h1>
          <p
            className="text-base mb-8 leading-relaxed"
            style={{ fontFamily: "'Source Sans 3', sans-serif", color: "rgba(247,245,239,0.62)" }}
          >
            Please verify your identity using your authorized corporate email address to access this portal.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5">
            <div className="space-y-2 text-left">
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                  style={{ color: "rgba(247,245,239,0.35)" }}
                />
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
                    className="text-sm font-medium flex items-start gap-1.5 overflow-hidden"
                    style={{ color: "#e23d4e" }}
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

          <div
            className="mt-8 flex items-center justify-center gap-2 text-xs"
            style={{ color: "rgba(247,245,239,0.35)", fontFamily: "'Source Sans 3', sans-serif" }}
          >
            <LockKeyhole className="w-3.5 h-3.5" />
            <span>End-to-end encrypted session</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
