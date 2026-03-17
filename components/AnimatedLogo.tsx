"use client";

import { useEffect, useRef, useCallback, useId } from "react";

type AnimationPhase = "thinking" | "typing" | "settled";

interface AnimatedLogoProps {
  logoSrc: string;
  phase: AnimationPhase;
  size?: number;
}

// Claudia starburst SVG path
const CLAUDIA_SVG = (
  <path
    d="M12 2C12 2 13.5 8.5 15.5 10.5C17.5 12.5 24 12 24 12C24 12 17.5 13.5 15.5 15.5C13.5 17.5 12 24 12 24C12 24 10.5 17.5 8.5 15.5C6.5 13.5 0 12 0 12C0 12 6.5 10.5 8.5 8.5C10.5 6.5 12 2 12 2Z"
    fill="#D97757"
  />
);

// Consuela SVG paths (body + glasses)
const CONSUELA_SVG = (
  <>
    <g transform="translate(0,24) scale(0.024,-0.024)" fill="#D97757" stroke="none">
      <path d="M520 990 c-8 -5 -36 -10 -61 -10 -67 0 -133 -26 -186 -75 -27 -23 -59 -46 -73 -50 -69 -22 -114 -86 -125 -178 -6 -57 -24 -87 -51 -87 -22 0 -17 -26 9 -44 l22 -16 -25 2 c-58 6 -19 -102 51 -141 22 -12 39 -28 39 -36 0 -7 11 -27 25 -43 26 -31 33 -66 15 -77 -15 -9 -12 -35 4 -35 9 0 12 -7 9 -21 -5 -19 -3 -21 28 -14 19 4 51 18 71 31 l37 23 7 -21 c12 -37 103 -126 143 -138 20 -7 64 -23 99 -37 58 -24 66 -25 117 -14 42 9 61 20 77 42 13 18 31 29 45 29 29 0 73 42 73 68 0 30 50 219 66 249 7 16 14 50 14 77 0 33 9 67 26 103 20 41 25 63 21 94 -6 48 -14 59 -27 39 -8 -12 -10 -9 -10 10 0 42 -11 69 -30 75 -9 3 -22 23 -29 44 -20 68 -80 108 -150 102 -13 -1 -33 7 -45 17 -11 11 -31 25 -43 31 -27 13 -122 14 -143 1z" />
    </g>
    <path
      d="M9.85 9.15 C11.55 8.55 13.75 8.55 15.35 9.15 C16.45 10.75 16.45 13.45 15.35 14.95 C13.75 15.55 11.55 15.55 9.85 14.95 C8.85 13.45 8.85 10.75 9.85 9.15Z"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
    <path
      d="M17.35 8.95 C19.05 8.35 21.25 8.35 22.85 8.95 C23.95 10.55 23.95 13.25 22.85 14.75 C21.25 15.35 19.05 15.35 17.35 14.75 C16.35 13.25 16.35 10.55 17.35 8.95Z"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
    <path
      d="M15.35 12.15 Q16.35 10.7 17.35 11.95"
      fill="none"
      stroke="#F5F5F0"
      strokeWidth="0.8"
    />
  </>
);

function getSvgContent(logoSrc: string) {
  if (logoSrc.includes("consuela")) return CONSUELA_SVG;
  return CLAUDIA_SVG;
}

export function AnimatedLogo({ logoSrc, phase, size = 28 }: AnimatedLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);
  const filterRef = useRef<SVGFETurbulenceElement | null>(null);
  const filterId = `morph-filter-${useId()}`;

  // Thinking phase: animate feTurbulence baseFrequency
  useEffect(() => {
    if (phase !== "thinking" || !filterRef.current) return;

    let startTime: number | null = null;
    const cycleDuration = 2500; // ms per breath cycle
    const minFreq = 0.02;
    const maxFreq = 0.06;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % cycleDuration) / cycleDuration;
      // Sinusoidal oscillation: 0 -> 1 -> 0
      const t = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
      const freq = minFreq + t * (maxFreq - minFreq);

      if (filterRef.current) {
        filterRef.current.setAttribute("baseFrequency", `${freq}`);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Typing -> Settled: capture rotation angle and decelerate
  const handleSettling = useCallback(() => {
    if (!svgRef.current) return;
    const computed = getComputedStyle(svgRef.current);
    const matrix = computed.transform;
    if (matrix && matrix !== "none") {
      // Parse rotation from matrix(a, b, c, d, tx, ty)
      const values = matrix.match(/matrix\((.+)\)/)?.[1]?.split(",").map(Number);
      if (values) {
        const angle = Math.atan2(values[1], values[0]) * (180 / Math.PI);
        svgRef.current.style.transform = `rotate(${angle}deg)`;
      }
    }
  }, []);

  useEffect(() => {
    if (phase === "settled") {
      handleSettling();
    } else {
      // Clear inline transform when not settled
      if (svgRef.current) {
        svgRef.current.style.transform = "";
      }
    }
  }, [phase, handleSettling]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const className = [
    phase === "typing" && !reducedMotion ? "logo-rotating" : "",
    phase === "settled" ? "logo-settling" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const applyFilter = phase === "thinking" && !reducedMotion;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={applyFilter ? { filter: `url(#${filterId})` } : { filter: "" }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x="-2"
          y="-2"
          width="28"
          height="28"
        >
          <feTurbulence
            ref={filterRef}
            type="turbulence"
            baseFrequency="0.03"
            numOctaves={2}
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={4}
          />
        </filter>
      </defs>
      {getSvgContent(logoSrc)}
    </svg>
  );
}
