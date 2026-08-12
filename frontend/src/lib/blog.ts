import fs from 'node:fs';
import path from 'node:path';

export interface BlogPost {
    slug: string;
    title: string;
    summary: string;
    date: string;
    tags: string[];
    content: string;
    year: string;
    month: string;
    day: string;
}

const BLOG_ROOT_CANDIDATES = [
    path.join(process.cwd(), 'src', 'content', 'blog'),
    path.join(process.cwd(), '..', 'blog'),
];

function getBlogRoot(): string | undefined {
    return BLOG_ROOT_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

function unquote(value: string): string {
    return value.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(source: string): { metadata: Record<string, string | string[]>; content: string } {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { metadata: {}, content: source };
    const metadata: Record<string, string | string[]> = {};
    let listKey: string | null = null;
    for (const line of match[1].split(/\r?\n/)) {
        const listItem = line.match(/^\s+-\s+(.+)$/);
        if (listItem && listKey) {
            const current = metadata[listKey];
            metadata[listKey] = [...(Array.isArray(current) ? current : []), unquote(listItem[1])];
            continue;
        }
        const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (!field) continue;
        const [, key, rawValue] = field;
        if (rawValue.trim()) {
            metadata[key] = unquote(rawValue.trim());
            listKey = null;
        } else {
            metadata[key] = [];
            listKey = key;
        }
    }
    return { metadata, content: match[2].trim() };
}

function readPost(year: string, month: string, day: string, filename: string): BlogPost {
    const blogRoot = getBlogRoot();
    if (!blogRoot) throw new Error('Blog content directory is missing');
    const source = fs.readFileSync(path.join(blogRoot, year, month, day, filename), 'utf8');
    const { metadata, content } = parseFrontmatter(source);
    const slug = filename.replace(/\.mdx?$/, '');
    return { slug, title: String(metadata.title ?? slug), summary: String(metadata.summary ?? metadata.description ?? ''), date: String(metadata.date ?? `${year}-${month}-${day}`), tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [], content, year, month, day };
}

export function getBlogPosts(): BlogPost[] {
    const blogRoot = getBlogRoot();
    if (!blogRoot) return [];
    const posts: BlogPost[] = [];
    for (const year of fs.readdirSync(blogRoot)) {
        const yearPath = path.join(blogRoot, year);
        if (!/^\d{4}$/.test(year) || !fs.statSync(yearPath).isDirectory()) continue;
        for (const month of fs.readdirSync(yearPath)) {
            const monthPath = path.join(yearPath, month);
            if (!/^\d{2}$/.test(month) || !fs.statSync(monthPath).isDirectory()) continue;
            for (const day of fs.readdirSync(monthPath)) {
                const dayPath = path.join(monthPath, day);
                if (!/^\d{2}$/.test(day) || !fs.statSync(dayPath).isDirectory()) continue;
                for (const filename of fs.readdirSync(dayPath)) if (/\.mdx?$/.test(filename)) posts.push(readPost(year, month, day, filename));
            }
        }
    }
    return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export function getBlogPost(year: string, month: string, day: string, slug: string): BlogPost | undefined {
    return getBlogPosts().find((post) => post.year === year && post.month === month && post.day === day && post.slug === slug);
}
