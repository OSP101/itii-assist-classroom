"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/spinner";
import { authService } from "@/services/auth.service";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          router.push("/login");
          return;
        }

        // Get current user
        const user = await authService.getCurrentUser();
        
        if (!user) {
          router.push("/login");
          return;
        }

        // Redirect based on role
        switch (user.role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "instructor":
          case "ta":
            router.push("/home");
            break;
          default:
            router.push("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100">
      <Spinner size="lg" color="primary" />
    </div>
  );
}
