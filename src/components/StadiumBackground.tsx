import React from 'react';

export const StadiumBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#050a14]">
      {/* Floodlights at top corners */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-70 animate-pulse" />
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-3xl opacity-70 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Stadium Oval Light Rims */}
      <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Subtle pitch boundary lines */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-emerald-950/25 via-emerald-950/10 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
    </div>
  );
};
