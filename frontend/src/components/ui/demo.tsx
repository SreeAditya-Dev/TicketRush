"use client";

import AdmitOneTicket from "@/components/ui/admit-one-ticket";

export default function AdmitOneTicketDemo() {
  return (
    <div className="flex min-h-[640px] w-full items-center justify-center bg-[#281d14] p-8">
      <AdmitOneTicket
        name="Garry Tan"
        presenter="Y Combinator presents"
        event="Startup School 2026"
        venue="Chase Center, SF"
        dates="July 25–26"
        stubText="Admit one"
        watermark="2026"
        width={741}
      />
    </div>
  );
}
