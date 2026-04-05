'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function ScheduledPostsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/posts'); }, [router]);
  return null;
}
