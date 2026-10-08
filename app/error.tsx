"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
 return <main className="home-container py-20"><h1 className="workspace-heading">This page could not be loaded</h1><p className="workspace-description">Please try again. If you were saving a change, check its current state before repeating it.</p><button className="button-primary mt-6" onClick={reset}>Try again</button><a href="/today" className="button-ghost ml-3">Return to Today</a></main>;
}
