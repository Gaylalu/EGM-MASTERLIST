"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FloorMap from "../../../components/FloorMap";

export default function FloorPage() {
  const pathname = usePathname(); // e.g., "/map/cyber-studio"
  
  // extract slug from URL
  const slug = pathname.split("/")[2] || "cyber-studio";

  // convert slug to display name (matching your floor names)
  const floorNameMap = {
    "cyber-studio": "CYBER STUDIO",
    "green-room": "GREEN ROOM",
    "gf-left-wing": "GF LEFT WING",
    "gf-right-wing": "GF RIGHT WING",
    "2f-left-wing": "2F LEFT WING",
    "2f-right-wing": "2F RIGHT WING",
    "h1-f": "H1/F",
    "h2-f": "H2/F",
    "h3-f": "H3/F",
  };

  const floor = floorNameMap[slug.toLowerCase()] || "CYBER STUDIO";

  return <FloorMap initialFloor={floor} />;
}
