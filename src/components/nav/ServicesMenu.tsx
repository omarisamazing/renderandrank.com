import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Badge } from "@/components/ui/badge"

export interface MenuLink {
  name: string
  description: string
  href: string
  tag?: string
}

/** Back-compat alias (Services was the first menu). */
export type ServiceLink = MenuLink;

/**
 * Generic dropdown for the top nav (Services, Resources, ...). Everything
 * else in the bar is a static link rendered by Navbar.astro.
 */
export function NavMenu({
  label,
  href,
  footerLabel = 'All capabilities',
  items,
}: {
  label: string
  href: string
  footerLabel?: string
  items: MenuLink[]
}) {
  return (
    <NavigationMenu align="start">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-10 rounded-pill px-3.5 text-[0.9375rem] font-medium tracking-[-0.006em] text-ink hover:bg-surface-soft focus:bg-surface-soft data-popup-open:bg-surface-soft">
            {label}
          </NavigationMenuTrigger>
          <NavigationMenuContent className="w-[22rem] p-2">
            <ul className="grid gap-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <NavigationMenuLink
                    href={item.href}
                    className="flex-col items-start gap-1 rounded-md p-3 hover:bg-surface-soft focus:bg-surface-soft"
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="label text-ink">{item.name}</span>
                      {item.tag ? (
                        <Badge
                          variant="outline"
                          className="rounded-pill border-hairline px-2 py-0 text-[0.75rem] font-medium tracking-normal text-ink"
                        >
                          {item.tag}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="caption text-ink/70">{item.description}</span>
                  </NavigationMenuLink>
                </li>
              ))}
                <li className="mt-1 border-t border-hairline-soft pt-1">
                  <NavigationMenuLink
                    href={href}
                    className="rounded-md p-3 hover:bg-surface-soft focus:bg-surface-soft"
                  >
                    <span className="label text-ink">{footerLabel}</span>
                  </NavigationMenuLink>
                </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
