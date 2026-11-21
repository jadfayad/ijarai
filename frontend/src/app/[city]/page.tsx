import { notFound } from "next/navigation";
import { CityScreen } from "@/components/city/CityScreen";
import { AVAILABLE_CITY_SLUGS, isCitySlug } from "@/lib/cities";

export const dynamicParams = false;

export function generateStaticParams() {
  return AVAILABLE_CITY_SLUGS.map((city) => ({ city }));
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!isCitySlug(city)) notFound();
  return <CityScreen slug={city} />;
}
