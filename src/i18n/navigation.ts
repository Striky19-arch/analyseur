import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/** Navigation typée et sensible à la locale : à utiliser à la place de `next/link` et `next/navigation`. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
