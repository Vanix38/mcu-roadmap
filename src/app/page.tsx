import data from "@/data/mcu.json";
import { RoadmapLoader } from "@/components/RoadmapLoader";
import { McuDataSchema } from "@/lib/mcu";

export default function Home() {
  const items = McuDataSchema.parse(data);
  return <RoadmapLoader items={items} />;
}
