"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import FloorMap from "../../components/FloorMap";

export default function MapPage() {
  const searchParams = useSearchParams();
  const floorQuery = searchParams.get("floor");
  const [floor, setFloor] = useState(null);

  useEffect(() => {
    if (floorQuery) {
      // convert query string to readable name for FloorMap
      const formatted =
        {
          "cyber-studio": "CYBER STUDIO",
          greenroom: "GREEN ROOM",
          "gf-left-wing": "GF LEFT WING",
          "gf-right-wing": "GF RIGHT WING",
          "2f-left-wing": "2F LEFT WING",
          "2f-right-wing": "2F RIGHT WING",
          "h1-f": "H1/F",
          "h2-f": "H2/F",
          "h3-f": "H3/F",
        }[floorQuery] || "CYBER STUDIO";
      setFloor(formatted);
    }
  }, [floorQuery]);

  if (!floor) return null;

  return (
    <div className="p-2 h-full w-full">
      <FloorMap initialFloor={floor} />
    </div>
  );
}
