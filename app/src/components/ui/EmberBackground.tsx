export function EmberBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
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

      {/* Floating ember particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            left: `${8 + i * 7.5}%`,
            bottom: `-${10 + (i % 4) * 5}px`,
            background: i % 3 === 0 ? "#F6C65B" : i % 3 === 1 ? "#FF8A3D" : "#FFD87A",
            animation: `ember-float ${8 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}
