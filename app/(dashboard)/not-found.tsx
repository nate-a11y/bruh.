import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Page not found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
            <Link href="/today">
              <Button className="gap-2">
                <Home className="h-4 w-4" />
                Go to Today
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
