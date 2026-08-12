import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { getBlogPost, getBlogPosts } from '@/lib/blog';

interface BlogRouteProps { params: Promise<{ year: string; month: string; day: string; slug: string }> }
export function generateStaticParams() { return getBlogPosts().map(({ year, month, day, slug }) => ({ year, month, day, slug })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: BlogRouteProps): Promise<Metadata> { const { year, month, day, slug } = await params; const post = getBlogPost(year, month, day, slug); return post ? { title: post.title, description: post.summary } : { title: 'ArcanaAI Blog' }; }

export default async function BlogPostPage({ params }: BlogRouteProps) {
    const { year, month, day, slug } = await params;
    const post = getBlogPost(year, month, day, slug);
    if (!post) notFound();
    return <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 px-5 py-12 text-gray-100 sm:px-8 sm:py-20"><article className="mx-auto max-w-4xl"><Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 transition hover:text-violet-100"><ArrowLeft size={16} />All posts</Link><header className="mt-10 border-b border-violet-300/15 pb-10"><p className="inline-flex items-center gap-2 text-sm text-violet-200/70"><CalendarDays size={16} />{post.date}</p><h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">{post.title}</h1><p className="mt-5 text-lg leading-8 text-gray-300">{post.summary}</p><div className="mt-5 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-400/10 px-3 py-1 text-sm text-violet-200">{tag}</span>)}</div></header><div className="prose prose-invert prose-violet mt-12 max-w-none prose-headings:scroll-mt-24 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-violet-300/15 prose-pre:bg-black/40 prose-code:text-violet-200 prose-a:text-violet-300"><ReactMarkdown>{post.content}</ReactMarkdown></div></article></main>;
}
