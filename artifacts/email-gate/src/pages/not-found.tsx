import { Link } from "wouter";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <FileQuestion className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <h2 className="text-xl font-medium text-foreground/80">Page not found</h2>
        
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <Link href="/" className="inline-block">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
