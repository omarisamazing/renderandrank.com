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

/**
 * `block` is the white card that reads correctly sitting on a pastel colour
 * block. `canvas` drops the card chrome for bare hairline rows — on white ground
 * a white card is invisible, and the editorial row treatment is what DESIGN.md
 * uses for comparison rows.
 */
const surfaces = {
  block: "divide-black/10 overflow-hidden rounded-lg border border-black/10 bg-canvas",
  canvas: "divide-hairline border-y border-hairline",
} as const

export function FaqAccordion({
  items,
  surface = "block",
}: {
  items: FaqItem[]
  surface?: keyof typeof surfaces
}) {
  return (
    <Accordion defaultValue={[0]} className={`divide-y ${surfaces[surface]}`}>
      {items.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={i}
          className={
            surface === "canvas" ? "border-b-0" : "border-b-0 px-5 md:px-7"
          }
        >
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
