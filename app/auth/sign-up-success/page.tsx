import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResendConfirmationForm } from "@/components/resend-confirmation-form";
export const metadata = { title: "Confirm your email" };
export default function Page() {
 return <AuthShell><h1 className="workspace-heading">Confirm your email</h1><p className="workspace-description">Open the confirmation link in your email to continue. If it hasn’t arrived, check your spam folder or request a new link below.</p><ResendConfirmationForm /><Link href="/auth/login" className="button-ghost mt-5">Back to log in</Link></AuthShell>;
}
