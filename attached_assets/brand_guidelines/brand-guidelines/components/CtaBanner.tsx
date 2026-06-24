import Image from "next/image";
import Button from "./Button";
import OrderField from "./three/OrderField";

type CtaBannerProps = {
  title?: string;
  subtitle?: string;
  cta?: string;
  /** Adds extra top padding so an element overlapping from the section above can sit over the banner. */
  overlap?: boolean;
};

export default function CtaBanner({
  title = "If workflows are slowing you down, this is a good place to start.",
  subtitle = "If your legal workflows feel harder to manage than they should, we're worth talking to. We'll start with where the biggest gaps are and work from there.",
  cta = "Audit your process",
  overlap = false,
}: CtaBannerProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image src="/image2.png" fill alt="" className="object-cover object-center" />
        <div className="absolute inset-0 bg-dark-gray/75" />
        {/* half-formed order field — keeps the banner alive on every page */}
        <OrderField mode="ambient" fieldCount={160} ambientCount={320} opacity={0.35} lanes={false} className="absolute inset-0" />
      </div>
      <div className={`container-site ${overlap ? "pt-56 pb-32" : "py-32"} relative z-10 flex flex-col items-center text-center gap-6`}>
        <h2 className="text-[32px] leading-[40px] sm:text-[44px] sm:leading-[52px] font-normal text-white max-w-2xl">{title}</h2>
        <p className="text-[16px] leading-[26px] text-white/70 max-w-[600px]">{subtitle}</p>
        <Button href="/contact" className="bg-white! text-dark-gray! hover:bg-light-blue! mt-2">
          {cta}
        </Button>
      </div>
    </section>
  );
}
