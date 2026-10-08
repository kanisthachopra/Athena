import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";
export const metadata = { title: "Log in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const requestedNext = (await searchParams).next ?? "/today";
 const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/today";
 return <AuthShell><LoginForm nextPath={nextPath} /></AuthShell>;
}
