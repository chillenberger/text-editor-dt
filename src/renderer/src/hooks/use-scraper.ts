'use client'
import { useState, useCallback } from 'react';
import scrapeUrl from '../services/scraper-service';
import { File } from '../types';

export default function useUrlScraper() {
  const [error, setError] = useState<'URL is required' | 'Failed to scrape URL' | 'Path is required' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const urlToDoc = useCallback(async (path: string, url: string): Promise<File | undefined> => {
    setIsLoading(true);


    if (!url) {
      setError('URL is required');
      setIsLoading(false);
      return;
    } else if (!path) {
      setError('Path is required');
      setIsLoading(false);
      return;
    }

    try {
      let scrapedContent = await scrapeUrl(url);
      if ( !scrapedContent || !scrapedContent.markdown ) {
        throw new Error('Failed to scrape URL');
      }
      const rsp: File = { path, content: scrapedContent.markdown};
      return rsp;
    } catch (error) {
      setError('Failed to scrape URL');
    } finally {
      setIsLoading(false);
    }

  }, [])

  return { urlToDoc, isLoading, error };
}