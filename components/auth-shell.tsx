import Link from "next/link";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-layout"><section className="auth-intro"><Link href="/" className="mira-wordmark">MIRA</Link><h2>Make the most of<br />time together.</h2><p>Choose an experience, understand your role, and see where your child takes it.</p></section><section className="auth-content"><div>{children}</div></section></main>;
}
