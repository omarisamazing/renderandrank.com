import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export interface FaqItem {
  q: string
  a: string
  category?: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion
      defaultValue={[0]}
      className="divide-y divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-canvas"
    >
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={i} className="border-b-0 px-5 md:px-7">
          <AccordionTrigger className="items-center gap-6 py-5 text-left hover:no-underline **:data-[slot=accordion-trigger-icon]:text-ink">
            <span className="card-title text-ink">{item.q}</span>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="body max-w-2xl text-ink">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
