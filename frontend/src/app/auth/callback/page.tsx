"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackPage() {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        // Handle OAuth callback logic here
        // For now, just redirect to the appropriate page
        if (user) {
            router.push("/");
        } else {
            router.push("/login");
        }
    }, [user, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Processing authentication...</p>
            </div>
        </div>
    );
}
