export function EmberBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Breathing radial glow behind hero */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] radial-breathe"
        style={{
          background: "radial-gradient(ellipse at center, rgba(246, 198, 91, 0.04) 0%, transparent 70%)",
        }}
      />

      {/* Smoke wisps */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(42, 59, 58, 0.15) 0%, transparent 60%)",
          animation: "smoke-drift 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 70% 60%, rgba(42, 59, 58, 0.1) 0%, transparent 50%)",
          animation: "smoke-drift 25s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(255, 138, 61, 0.05) 0%, transparent 40%)",
          animation: "smoke-drift 30s ease-in-out infinite",
        }}
      />

      {/* Floating ember particles — 20 particles with varied sizes */}
      {[...Array(20)].map((_, i) => {
        const isBurst = i % 7 === 0;
        const size = isBurst ? 3 + (i % 4) * 1.5 : 1 + (i % 4);
        const speed = isBurst ? 5 + i * 0.8 : 8 + i * 1.5;
        const opacity = isBurst ? 0.9 : 0.7;
        const colors = ["#F6C65B", "#FF8A3D", "#FFD87A", "#F6C65B", "#FF8A3D"];

        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${3 + i * 4.8}%`,
              bottom: `-${10 + (i % 5) * 5}px`,
              background: colors[i % colors.length],
              opacity,
              filter: isBurst ? "blur(0.5px)" : "none",
              boxShadow: isBurst ? `0 0 ${size * 2}px ${colors[i % colors.length]}40` : "none",
              animation: `ember-float ${speed}s linear infinite`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        );
      })}
    </div>
  );
}
