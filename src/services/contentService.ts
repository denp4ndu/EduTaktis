import { Article, Category, Author, ARTICLES, CATEGORIES, AUTHORS } from '../data/content';

/**
 * WordPress CMS & Content Abstraction Layer
 * 
 * Provides unified interface for fetching articles, categories, authors, and resources.
 * - Supports production WordPress REST API endpoint when `VITE_WP_API_URL` is configured.
 * - Gracefully falls back to structured local mock data when API is unavailable or offline.
 */

const WP_API_URL = import.meta.env.VITE_WP_API_URL || '';

export interface WPStatus {
  isConfigured: boolean;
  endpoint: string;
  sourceMode: 'wordpress_api' | 'mock_fallback';
}

export const getContentServiceStatus = (): WPStatus => {
  return {
    isConfigured: Boolean(WP_API_URL),
    endpoint: WP_API_URL || 'Not configured (using local mock content service)',
    sourceMode: WP_API_URL ? 'wordpress_api' : 'mock_fallback',
  };
};

/**
 * Helper to calculate reading time from article HTML content
 */
const calculateReadingTime = (content: string): string => {
  const text = content.replace(/<[^>]+>/g, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
};

/**
 * Content Service Interface
 */
export const contentService = {
  /**
   * Fetch all categories
   */
  async getCategories(): Promise<Category[]> {
    if (!WP_API_URL) {
      return CATEGORIES;
    }

    try {
      const response = await fetch(`${WP_API_URL}/wp-json/wp/v2/categories?per_page=100`);
      if (!response.ok) throw new Error(`WP API Error: ${response.status}`);
      const wpCats = await response.json();

      return wpCats.map((cat: { id: number; name: string; slug: string; description?: string }) => ({
        id: String(cat.id),
        name: cat.name,
        slug: cat.slug,
        description: cat.description || `Panduan dan tutorial seputar ${cat.name}`,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        iconName: 'BookOpen',
      }));
    } catch (err) {
      console.warn('WordPress API error, falling back to mock content:', err);
      return CATEGORIES;
    }
  },

  /**
   * Fetch articles list with optional category filter
   */
  async getArticles(categorySlug?: string): Promise<Article[]> {
    if (!WP_API_URL) {
      if (!categorySlug) return ARTICLES;
      const category = CATEGORIES.find((c) => c.slug === categorySlug);
      return category ? ARTICLES.filter((a) => a.categoryId === category.id) : ARTICLES;
    }

    try {
      let endpoint = `${WP_API_URL}/wp-json/wp/v2/posts?_embed&per_page=20`;
      
      if (categorySlug) {
        // Resolve category ID first
        const catRes = await fetch(`${WP_API_URL}/wp-json/wp/v2/categories?slug=${categorySlug}`);
        const cats = await catRes.json();
        if (cats && cats.length > 0) {
          endpoint += `&categories=${cats[0].id}`;
        }
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`WP API Error: ${response.status}`);
      const posts = await response.json();

      return posts.map((post: {
        id: number;
        slug: string;
        title: { rendered: string };
        excerpt: { rendered: string };
        content: { rendered: string };
        date: string;
        modified: string;
      }) => ({
        id: String(post.id),
        slug: post.slug,
        title: post.title.rendered.replace(/<[^>]+>/g, ''),
        excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
        categoryId: 'ai-guru',
        authorId: 'budi-santoso',
        publishedDate: new Date(post.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        updatedDate: new Date(post.modified).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        readingTime: calculateReadingTime(post.content.rendered),
        views: 1200,
        coverGradient: {
          from: 'from-blue-600',
          to: 'to-indigo-800',
          pattern: 'grid',
        },
        takeaway: {
          summary: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
          points: [
            'Dapatkan pemahaman praktis dari materi yang disampaikan.',
            'Terapkan langkah demi langkah sesuai konteks ruang kelas Anda.',
          ],
        },
        content: post.content.rendered,
      }));
    } catch (err) {
      console.warn('WordPress API error, falling back to mock content:', err);
      if (!categorySlug) return ARTICLES;
      const category = CATEGORIES.find((c) => c.slug === categorySlug);
      return category ? ARTICLES.filter((a) => a.categoryId === category.id) : ARTICLES;
    }
  },

  /**
   * Fetch single article by slug
   */
  async getArticleBySlug(slug: string): Promise<Article | null> {
    const article = ARTICLES.find((a) => a.slug === slug);
    if (article) return article;

    if (!WP_API_URL) return null;

    try {
      const response = await fetch(`${WP_API_URL}/wp-json/wp/v2/posts?slug=${slug}&_embed`);
      if (!response.ok) return null;
      const posts = await response.json();
      if (!posts || posts.length === 0) return null;

      const post = posts[0];
      return {
        id: String(post.id),
        slug: post.slug,
        title: post.title.rendered.replace(/<[^>]+>/g, ''),
        excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
        categoryId: 'ai-guru',
        authorId: 'budi-santoso',
        publishedDate: new Date(post.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        updatedDate: new Date(post.modified).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        readingTime: calculateReadingTime(post.content.rendered),
        views: 1500,
        coverGradient: {
          from: 'from-blue-600',
          to: 'to-indigo-800',
          pattern: 'grid',
        },
        takeaway: {
          summary: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
          points: [
            'Dapatkan pemahaman praktis dari materi yang disampaikan.',
            'Terapkan langkah demi langkah sesuai konteks ruang kelas Anda.',
          ],
        },
        content: post.content.rendered,
      };
    } catch (err) {
      console.warn('WordPress API error:', err);
      return null;
    }
  },

  /**
   * Search articles by query term
   */
  async searchArticles(query: string): Promise<Article[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    if (!WP_API_URL) {
      return ARTICLES.filter((art) => {
        const cat = CATEGORIES.find((c) => c.id === art.categoryId);
        return (
          art.title.toLowerCase().includes(q) ||
          art.excerpt.toLowerCase().includes(q) ||
          (cat && cat.name.toLowerCase().includes(q))
        );
      });
    }

    try {
      const response = await fetch(`${WP_API_URL}/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=10`);
      if (!response.ok) throw new Error(`WP Search Error: ${response.status}`);
      const posts = await response.json();

      return posts.map((post: {
        id: number;
        slug: string;
        title: { rendered: string };
        excerpt: { rendered: string };
        content: { rendered: string };
        date: string;
      }) => ({
        id: String(post.id),
        slug: post.slug,
        title: post.title.rendered.replace(/<[^>]+>/g, ''),
        excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
        categoryId: 'ai-guru',
        authorId: 'budi-santoso',
        publishedDate: new Date(post.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        updatedDate: new Date(post.date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        readingTime: calculateReadingTime(post.content.rendered || ''),
        views: 800,
        coverGradient: {
          from: 'from-blue-600',
          to: 'to-indigo-800',
          pattern: 'grid',
        },
        takeaway: {
          summary: post.excerpt.rendered.replace(/<[^>]+>/g, ''),
          points: ['Hasil pencarian terverifikasi dari sumber konten.'],
        },
        content: post.content.rendered,
      }));
    } catch (err) {
      console.warn('WordPress API search error, using local mock search:', err);
      return ARTICLES.filter((art) => {
        const cat = CATEGORIES.find((c) => c.id === art.categoryId);
        return (
          art.title.toLowerCase().includes(q) ||
          art.excerpt.toLowerCase().includes(q) ||
          (cat && cat.name.toLowerCase().includes(q))
        );
      });
    }
  },
};
