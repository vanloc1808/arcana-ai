import Link from 'next/link';
import { CalendarDays, ArrowRight, Tag } from 'lucide-react';
import { getBlogPosts } from '@/lib/blog';

export const metadata = { title: 'ArcanaAI Blog', description: 'Release notes, engineering notes, and practical guidance from ArcanaAI.' };

export default function BlogIndexPage() {
    const posts = getBlogPosts();
    return <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 px-5 py-16 text-gray-100 sm:px-8"><div className="mx-auto max-w-5xl"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">ArcanaAI Journal</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Release notes &amp; engineering notes</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">Product releases, infrastructure changes, and the decisions behind ArcanaAI.</p><div className="mt-12 grid gap-6">{posts.map((post) => <article key={`${post.date}-${post.slug}`} className="rounded-2xl border border-violet-300/15 bg-white/[0.05] p-6 shadow-xl shadow-purple-950/20 backdrop-blur sm:p-8"><div className="flex flex-wrap items-center gap-3 text-sm text-violet-200/70"><span className="inline-flex items-center gap-2"><CalendarDays size={16} />{post.date}</span>{post.tags.slice(0, 3).map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-400/10 px-2.5 py-1"><Tag size={13} />{tag}</span>)}</div><h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{post.title}</h2><p className="mt-3 max-w-3xl leading-7 text-gray-300">{post.summary}</p><Link className="mt-6 inline-flex items-center gap-2 font-semibold text-violet-300 transition hover:text-violet-100" href={`/blog/${post.year}/${post.month}/${post.day}/${post.slug}`}>Read release notes <ArrowRight size={17} /></Link></article>)}{posts.length === 0 && <p className="text-gray-300">No posts published yet.</p>}</div></div></main>;
}
