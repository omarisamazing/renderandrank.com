import * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MenuIcon } from "lucide-react"

interface NavChild {
  name: string
  href: string
}

interface NavItem {
  name: string
  href: string
  children?: NavChild[]
}

export function MobileNav({
  links,
  currentPath,
  calNamespace,
  calLink,
  menuLabel = "Menu",
  openNavLabel = "Open navigation",
  auditLabel = "Get a free audit",
  bookCallLabel = "Book a call",
  auditHref = "/contact",
  bookHref = "/book-a-call",
}: {
  links: NavItem[]
  currentPath: string
  calNamespace: string
  calLink: string
  menuLabel?: string
  openNavLabel?: string
  auditLabel?: string
  bookCallLabel?: string
  auditHref?: string
  bookHref?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={openNavLabel} />
        }
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[min(22rem,88vw)] gap-0 border-l border-hairline bg-canvas p-0"
      >
        <SheetHeader className="border-b border-hairline px-6 py-5">
          <SheetTitle className="eyebrow text-ink">{menuLabel}</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overscroll-contain overflow-y-auto px-4 py-4">
          <ul className="flex flex-col gap-0.5">
            {links.map((link) => {
              const active =
                currentPath === link.href ||
                (link.href !== "/" && currentPath.startsWith(link.href))

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-3 text-[1.0625rem] tracking-[-0.006em] transition-colors",
                      active
                        ? "bg-surface-soft font-medium text-ink"
                        : "font-normal text-ink hover:bg-surface-soft"
                    )}
                  >
                    {link.name}
                  </a>

                  {link.children ? (
                    <ul className="mt-0.5 mb-1 ml-3 flex flex-col gap-0.5 border-l border-hairline pl-3">
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <a
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-md px-3 py-2.5 text-[0.9375rem] font-normal text-ink transition-colors hover:bg-surface-soft"
                          >
                            {child.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-2.5 border-t border-hairline p-4">
          <Button
            render={<a href={auditHref} />}
            variant="secondary"
            size="md"
            block
          >
            {auditLabel}
          </Button>
          <Button
            render={<a href={bookHref} />}
            variant="primary"
            size="md"
            block
          >
            {bookCallLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
